// src/app/utils/deduplication.ts
// Record deduplication using fuzzy matching + Levenshtein distance
// Supports Arabic text normalization

export interface DedupeCandidate<T> {
  record: T;
  /** Unique identifier */
  id: string | number;
  /** Primary name field (Arabic) */
  nameAr: string;
  /** Secondary name field (English) */
  nameEn?: string;
  /** National ID / commercial register */
  identifier?: string;
  /** Phone number */
  phone?: string;
  /** Email address */
  email?: string;
}

export interface DedupeMatch<T> {
  record: DedupeCandidate<T>;
  score: number;
  reason: DedupeReason[];
  action: 'merge' | 'review' | 'dismiss';
}

export type DedupeReason =
  | 'exact_name_match'
  | 'fuzzy_name_match'
  | 'same_identifier'
  | 'same_phone'
  | 'same_email';

interface MatchResult {
  score: number;
  reasons: DedupeReason[];
}

// Normalize Arabic text for comparison
function normalizeArabic(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\u0621-\u063A\u0641-\u064Aa-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Levenshtein distance
function levenshtein(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

// Compute similarity score (0-100)
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - levenshtein(a, b) / maxLen) * 100);
}

function matchCandidates<T>(
  a: DedupeCandidate<T>,
  b: DedupeCandidate<T>,
): MatchResult {
  const reasons: DedupeReason[] = [];
  let totalScore = 0;
  let weightSum = 0;

  const score = (label: DedupeReason, w: number, s: number) => {
    reasons.push(label);
    totalScore += s * w;
    weightSum += w;
  };

  // Name Arabic (highest weight)
  const normA = normalizeArabic(a.nameAr);
  const normB = normalizeArabic(b.nameAr);
  const nameScore = similarity(normA, normB);
  if (nameScore === 100) score('exact_name_match', 40, 100);
  else if (nameScore >= 85) score('fuzzy_name_match', 40, nameScore);

  // English name
  if (a.nameEn && b.nameEn) {
    const enScore = similarity(a.nameEn.toLowerCase(), b.nameEn.toLowerCase());
    if (enScore >= 85) {
      reasons.push('fuzzy_name_match');
      totalScore += enScore * 20;
      weightSum += 20;
    }
  }

  // Identifier (exact match is high signal)
  if (a.identifier && b.identifier && a.identifier === b.identifier) {
    score('same_identifier', 30, 100);
  }

  // Phone (normalized)
  const normPhone = (p?: string) =>
    (p || '').replace(/[\s\-()]/g, '');
  if (a.phone && b.phone && normPhone(a.phone) === normPhone(b.phone)) {
    score('same_phone', 25, 100);
  }

  // Email
  if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
    score('same_email', 20, 100);
  }

  return {
    score: weightSum > 0 ? Math.round(totalScore / weightSum) : 0,
    reasons,
  };
}

const MERGE_THRESHOLD = 85;
const REVIEW_THRESHOLD = 60;

function determineAction(score: number): 'merge' | 'review' | 'dismiss' {
  if (score >= MERGE_THRESHOLD) return 'merge';
  if (score >= REVIEW_THRESHOLD) return 'review';
  return 'dismiss';
}

/**
 * Find potential duplicate records from a list
 */
export function findDuplicates<T>(
  candidates: DedupeCandidate<T>[],
  options: {
    /** Minimum score to report (0-100), default 60 */
    minScore?: number;
    /** Maximum pairs to return, default 100 */
    maxResults?: number;
  } = {},
): DedupeMatch<T>[] {
  const { minScore = REVIEW_THRESHOLD, maxResults = 100 } = options;
  const results: DedupeMatch<T>[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const pairKey = [a.id, b.id].sort().join('|');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const match = matchCandidates(a, b);
      if (match.score < minScore) continue;

      results.push({
        record: b,
        score: match.score,
        reason: match.reasons,
        action: determineAction(match.score),
      });
    }
    if (results.length >= maxResults) break;
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Auto-merge two records (keeps newer, applies minimal-field-overwrite strategy)
 */
export function mergeRecords<T extends Record<string, unknown>>(
  primary: T,
  secondary: T,
  options: {
    /** Fields that prefer non-empty values from secondary */
    fillFromSecondary?: (keyof T)[];
    /** Merge strategy for arrays */
    mergeStrategy?: 'concat' | 'union' | 'keep_primary';
  } = {},
): T {
  const { fillFromSecondary = [], mergeStrategy = 'union' } = options;
  const result = { ...primary };

  for (const key of fillFromSecondary) {
    if (!result[key] && secondary[key]) {
      result[key] = secondary[key];
    }
  }

  if (mergeStrategy === 'union' && Array.isArray(result.items) && Array.isArray(secondary.items)) {
    const existingIds = new Set((result.items as { id: unknown }[]).map((i) => i.id));
    const newItems = (secondary.items as { id: unknown }[]).filter((i) => !existingIds.has(i.id));
    (result as Record<string, unknown>).items = [...(result.items as unknown[]), ...newItems];
  }

  return result;
}

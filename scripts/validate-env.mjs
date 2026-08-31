/**
 * validate-env.mjs — بوابة التحقق من المتغيرات قبل النشر
 * ==========================================================================
 * يتحقق من جميع المتغيرات المطلوبة للإنتاج، ينبه على القيم الافتراضية الخطيرة
 * الاستخدام: node scripts/validate-env.mjs [--strict] [--json]
 * ==========================================================================
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_OUTPUT = args.includes('--json');

const ENV_FILE = path.join(ROOT, '.env');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');

// ============== Load .env ==============
function loadEnv() {
  const env = {};
  if (!fs.existsSync(ENV_FILE)) return env;
  const content = fs.readFileSync(ENV_FILE, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!m) continue;
    const [, key, rawVal] = m;
    let val = rawVal.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = { ...process.env, ...loadEnv() };

// ============== Schema ==============
const SCHEMA = [
  // === Critical ===
  {
    key: 'DATABASE_URL',
    required: true,
    secret: true,
    pattern: /^postgres(ql)?:\/\/.+/,
    description: 'PostgreSQL connection string',
    severity: 'critical',
  },
  {
    key: 'JWT_SECRET',
    required: true,
    secret: true,
    minLength: 32,
    description: 'JWT signing secret (≥32 chars)',
    severity: 'critical',
  },
  {
    key: 'SESSION_SECRET',
    required: true,
    secret: true,
    minLength: 32,
    description: 'Session signing secret (≥32 chars)',
    severity: 'critical',
  },
  {
    key: 'BACKUP_KEY',
    required: true,
    secret: true,
    minLength: 64,
    pattern: /^[a-f0-9]{64}$/i,
    description: 'AES-256 key for encrypted backups (64 hex chars)',
    severity: 'critical',
  },
  // === Production hardening ===
  {
    key: 'NODE_ENV',
    required: true,
    allowed: ['development', 'staging', 'production'],
    description: 'Runtime environment',
    severity: 'critical',
  },
  {
    key: 'CORS_ORIGIN',
    required: true,
    pattern: /^https?:\/\/.+/,
    description: 'Comma-separated CORS origins (use https in prod)',
    severity: 'critical',
  },
  {
    key: 'ENABLE_AUTH',
    required: true,
    allowed: ['true', 'false'],
    description: 'Force authentication on all /api routes',
    severity: 'critical',
  },
  // === Optional but recommended ===
  {
    key: 'PORT',
    required: false,
    pattern: /^\d{2,5}$/,
    description: 'Server port (default: 4000)',
    severity: 'warning',
  },
  {
    key: 'LOG_LEVEL',
    required: false,
    allowed: ['debug', 'info', 'warn', 'error'],
    description: 'Logging level',
    severity: 'warning',
  },
  {
    key: 'RATE_LIMIT_PER_MIN',
    required: false,
    pattern: /^\d+$/,
    description: 'Requests per minute per user',
    severity: 'warning',
  },
  {
    key: 'BACKUP_ENCRYPTION',
    required: false,
    allowed: ['true', 'false'],
    description: 'Enable backup encryption',
    severity: 'warning',
  },
  {
    key: 'SENTRY_DSN',
    required: false,
    pattern: /^https:\/\/.+@.+\.ingest\.(sentry\.io|instana)\..+\//,
    description: 'Sentry error tracking DSN',
    severity: 'info',
  },
  {
    key: 'TELEMETRY_FLUSH_URL',
    required: false,
    pattern: /^\/api\/telemetry\/.+/,
    description: 'Where to send client errors',
    severity: 'info',
  },
];

// ============== Validation ==============
const issues = [];
const isProd = env.NODE_ENV === 'production';

for (const rule of SCHEMA) {
  const value = env[rule.key];
  const present = value !== undefined && value !== '';

  if (!present) {
    if (rule.required) {
      issues.push({
        key: rule.key,
        severity: 'critical',
        code: 'MISSING_REQUIRED',
        message: `❌ Required: ${rule.key} — ${rule.description}`,
      });
    }
    continue;
  }

  // Length check
  if (rule.minLength && value.length < rule.minLength) {
    issues.push({
      key: rule.key,
      severity: rule.severity,
      code: 'TOO_SHORT',
      message: `⚠️  ${rule.key} shorter than required (${value.length} < ${rule.minLength})`,
    });
  }

  // Pattern check
  if (rule.pattern && !rule.pattern.test(value)) {
    issues.push({
      key: rule.key,
      severity: rule.severity,
      code: 'PATTERN_MISMATCH',
      message: `⚠️  ${rule.key} doesn't match expected format`,
    });
  }

  // Allowed values
  if (rule.allowed && !rule.allowed.includes(value)) {
    issues.push({
      key: rule.key,
      severity: rule.severity,
      code: 'INVALID_VALUE',
      message: `⚠️  ${rule.key}=${value} not in [${rule.allowed.join(', ')}]`,
    });
  }

  // Production-specific checks
  if (isProd) {
    // CORS must be https
    if (rule.key === 'CORS_ORIGIN' && value.includes('http://')) {
      issues.push({
        key: rule.key,
        severity: 'critical',
        code: 'INSECURE_CORS',
        message: '❌ CORS_ORIGIN contains insecure http:// in production',
      });
    }
    // Detect placeholder values
    const placeholders = ['changeme', 'password', 'secret123', 'replace-me', 'xxx', '0000'];
    if (rule.secret && placeholders.some((p) => value.toLowerCase().includes(p))) {
      issues.push({
        key: rule.key,
        severity: 'critical',
        code: 'PLACEHOLDER',
        message: `❌ ${rule.key} contains placeholder value — must be replaced`,
      });
    }
    // Node env must be production
    if (rule.key === 'ENABLE_AUTH' && value === 'false') {
      issues.push({
        key: rule.key,
        severity: 'critical',
        code: 'AUTH_DISABLED',
        message: '❌ ENABLE_AUTH=false in production — all routes would be public!',
      });
    }
  }
}

// ============== Secret rotation warning ==============
// Check for known-bad or recent leaks
const knownLeaks = ['npg_dIXtW6LQw8sH', 'admin123', 'root123'];
for (const rule of SCHEMA) {
  if (rule.secret) {
    const value = env[rule.key];
    if (value && knownLeaks.some((leak) => value.includes(leak))) {
      issues.push({
        key: rule.key,
        severity: 'critical',
        code: 'KNOWN_LEAK',
        message: `🚨 ${rule.key} contains a known-leaked value — ROTATE IMMEDIATELY`,
      });
    }
  }
}

// ============== Output ==============
const critical = issues.filter((i) => i.severity === 'critical');
const warning = issues.filter((i) => i.severity === 'warning');
const info = issues.filter((i) => i.severity === 'info');

const summary = {
  env_file_exists: fs.existsSync(ENV_FILE),
  env_example_exists: fs.existsSync(ENV_EXAMPLE),
  is_production: isProd,
  total_rules: SCHEMA.length,
  required_present: SCHEMA.filter((r) => r.required && env[r.key]).length,
  issues: { critical: critical.length, warning: warning.length, info: info.length },
  pass: critical.length === 0 && (!STRICT || warning.length === 0),
};

if (JSON_OUTPUT) {
  console.log(JSON.stringify({ summary, issues }, null, 2));
} else {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   🔒  Environment Variable Validation                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log(`📄 .env file:           ${summary.env_file_exists ? '✅ found' : '❌ NOT FOUND'}`);
  console.log(`📄 .env.example:        ${summary.env_example_exists ? '✅ found' : '❌ NOT FOUND'}`);
  console.log(`🌍 NODE_ENV:            ${env.NODE_ENV || 'unset'}`);
  console.log(`📊 Rules checked:       ${summary.total_rules}`);
  console.log(`✅ Required present:    ${summary.required_present}/${SCHEMA.filter((r) => r.required).length}`);

  console.log('\n────────────────────────────────────────────');
  if (issues.length === 0) {
    console.log('🎉 No issues — all checks passed!\n');
  } else {
    console.log('📋 Issues found:');
    for (const i of issues) {
      const icon = i.severity === 'critical' ? '🔴' : i.severity === 'warning' ? '🟡' : '🔵';
      console.log(`  ${icon} [${i.severity.toUpperCase()}] ${i.key}: ${i.message}`);
    }
  }
  console.log('────────────────────────────────────────────\n');

  console.log(`🔴 Critical: ${critical.length}`);
  console.log(`🟡 Warnings: ${warning.length}`);
  console.log(`🔵 Info:     ${info.length}`);
  console.log(`\n${summary.pass ? '✅ READY' : '❌ NOT READY'} for deployment\n`);
}

// Exit code: non-zero if critical issues
if (critical.length > 0) {
  process.exit(1);
}
if (STRICT && warning.length > 0) {
  process.exit(2);
}
process.exit(0);

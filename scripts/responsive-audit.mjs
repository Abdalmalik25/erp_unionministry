// scripts/responsive-audit.mjs
// Mobile responsive design audit — scans all pages and reports responsive issues

import { readFile, readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';

const PROJECT_ROOT = process.cwd();
const PAGES_DIR = join(PROJECT_ROOT, 'src', 'app', 'pages');
const COMPONENTS_DIR = join(PROJECT_ROOT, 'src', 'app', 'components');

const CHECKS = [
  {
    name: 'Missing responsive Tailwind class',
    pattern: /className="[^"]*\b(?:grid|flex|w-|h-|p-|m-|gap-|space-)\b[^"]*"/g,
    validate: (m) => {
      const className = m[0];
      const hasResponsive = /\b(?:sm|md|lg|xl|2xl):/.test(className);
      const hasFullWidth = /\b(w-full|min-w-full|max-w-)\b/.test(className);
      return hasFullWidth && !hasResponsive;
    },
    severity: 'warning',
  },
  {
    name: 'Fixed width without responsive variant',
    pattern: /className="[^"]*\bw-\[\d+/g,
    severity: 'warning',
  },
  {
    name: 'Missing overflow-y-auto on scrollable container',
    pattern: /className="[^"]*\bmax-h-\[?\d/g,
    severity: 'info',
  },
  {
    name: 'Missing flex-wrap on flex container',
    pattern: /className="[^"]*\bflex\b[^"]*"/g,
    validate: (m) => {
      const className = m[0];
      return /\bflex\b/.test(className) && !/\b(flex-wrap|flex-col|sm:flex-row)\b/.test(className);
    },
    severity: 'info',
  },
  {
    name: 'Hardcoded px value (use rem or responsive)',
    pattern: /className="[^"]*\bp-\[\d+px\]/g,
    severity: 'warning',
  },
  {
    name: 'Missing dir="rtl" attribute',
    pattern: /<(?!\/)(?!html)([A-Z]\w*)\s/g,
    severity: 'info',
  },
];

async function getAllFiles(dir) {
  const files = [];
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        files.push(...(await getAllFiles(fullPath)));
      } else if (extname(entry) === '.tsx' || extname(entry) === '.ts') {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // directory might not exist
  }
  return files;
}

async function auditFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const issues = [];

  for (const check of CHECKS) {
    const matches = [...content.matchAll(check.pattern)];
    for (const m of matches) {
      if (check.validate && !check.validate(m)) continue;
      const line = content.slice(0, m.index).split('\n').length;
      issues.push({
        file: relative(PROJECT_ROOT, filePath),
        line,
        check: check.name,
        severity: check.severity,
        snippet: m[0].slice(0, 100),
      });
    }
  }
  return issues;
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Responsive Design Audit — Mobile/Desktop ║');
  console.log('╚════════════════════════════════════════╝\n');

  const pageFiles = await getAllFiles(PAGES_DIR);
  const componentFiles = await getAllFiles(COMPONENTS_DIR);
  const allFiles = [...pageFiles, ...componentFiles];

  console.info(`Scanning ${allFiles.length} files...\n`);

  const allIssues = [];
  for (const file of allFiles) {
    const issues = await auditFile(file);
    allIssues.push(...issues);
  }

  // Group by severity
  const bySeverity = { error: 0, warning: 0, info: 0 };
  for (const issue of allIssues) {
    bySeverity[issue.severity]++;
  }

  console.log('Results:');
  console.log(`  ⚠️  Warnings: ${bySeverity.warning}`);
  console.log(`  ℹ️  Info:     ${bySeverity.info}\n`);

  // Group by file
  const byFile = {};
  for (const issue of allIssues) {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  }

  // Top 20 files with most issues
  const sorted = Object.entries(byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);

  if (sorted.length > 0) {
    console.log('Top 20 files with responsive issues:\n');
    for (const [file, issues] of sorted) {
      console.log(`  ${file} (${issues.length})`);
      for (const issue of issues.slice(0, 3)) {
        console.log(`    L${issue.line} [${issue.severity}] ${issue.check}`);
      }
    }
  } else {
    console.log('✅ No responsive issues found');
  }

  // Summary
  console.log('\n--- Responsive Coverage Assessment ---');
  const pagesWithResponsive = await Promise.all(
    pageFiles.map(async (file) => {
      const content = await readFile(file, 'utf8');
      const hasResponsive = /\b(sm|md|lg|xl):/.test(content);
      return { file, hasResponsive };
    }),
  );

  const responsiveCount = pagesWithResponsive.filter((p) => p.hasResponsive).length;
  const coverage = ((responsiveCount / pageFiles.length) * 100).toFixed(1);
  console.log(`Pages with responsive classes: ${responsiveCount}/${pageFiles.length} (${coverage}%)`);

  if (parseFloat(coverage) >= 80) {
    console.log('✅ Excellent responsive coverage');
  } else if (parseFloat(coverage) >= 60) {
    console.log('⚠️  Good coverage, but more pages need responsive design');
  } else {
    console.log('❌ Low responsive coverage — review pages');
  }

  console.log('\n📊 Recommended breakpoints:');
  console.log('  sm:  640px  (mobile landscape)');
  console.log('  md:  768px  (tablet)');
  console.log('  lg:  1024px (desktop)');
  console.log('  xl:  1280px (wide desktop)');
  console.log('\nUse: sm:flex-row md:grid-cols-2 lg:grid-cols-3');
}

main().catch((e) => {
  console.error('Audit failed:', e);
  process.exit(1);
});

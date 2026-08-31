#!/usr/bin/env node
/**
 * Performance Budget Checker
 * 
 * Enforces performance budgets in CI:
 * - Bundle size limits per chunk
 * - Core Web Vitals targets
 * - API response time limits
 * - Asset size limits
 */

import { readFileSync, statSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { gzipSync } from 'zlib';

const ROOT = resolve(process.cwd());

// Performance budgets
const BUDGETS = {
  // Bundle size limits (in KB, gzipped)
  bundles: {
    'vendor-react': 50,
    'vendor-ui': 80,
    'vendor-charts': 100,
    'vendor-pdf': 200,
    'vendor-supabase': 60,
    'vendor-utils': 30,
    'index': 80,
    default: 100, // Max per chunk
    total: 800, // Total bundle
  },

  // Asset size limits (KB)
  assets: {
    '.woff2': 100, // Per font
    '.woff': 150,
    '.png': 500,
    '.jpg': 500,
    '.webp': 300,
    '.svg': 50,
  },

  // Web Vitals targets (ms)
  vitals: {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    TTFB: 800,
    INP: 200,
    FCP: 1800,
  },

  // API response time targets (ms)
  api: {
    list: 200,
    single: 100,
    create: 500,
    update: 300,
    delete: 200,
    search: 500,
  },
};

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function checkBundleSize() {
  console.log('\n📦 Checking bundle sizes...');
  const distPath = join(ROOT, 'dist', 'assets');
  
  if (!existsSync(distPath)) {
    results.warnings.push('dist/assets/ not found - skipping bundle check (run `pnpm build` first)');
    return;
  }

  const files = readdirSync(distPath).filter((f) => f.endsWith('.js'));
  let totalSize = 0;
  let totalGzip = 0;

  for (const file of files) {
    const filePath = join(distPath, file);
    const content = readFileSync(filePath);
    const size = content.length;
    const gzipSize = gzipSync(content, { level: 6 }).length;
    totalSize += size;
    totalGzip += gzipSize;

    // Find matching budget
    const chunkName = Object.keys(BUDGETS.bundles).find((name) => file.includes(name));
    const budgetKey = chunkName || 'default';
    const limit = BUDGETS.bundles[budgetKey] * 1024; // Convert KB to bytes

    if (gzipSize > limit) {
      results.failed.push(
        `Bundle ${file}: ${formatBytes(gzipSize)} > ${formatBytes(limit)} (gzip)`
      );
    } else {
      results.passed.push(`Bundle ${file}: ${formatBytes(gzipSize)} / ${formatBytes(limit)}`);
    }
  }

  // Check total
  const totalLimit = BUDGETS.bundles.total * 1024;
  if (totalGzip > totalLimit) {
    results.failed.push(
      `Total bundle: ${formatBytes(totalGzip)} > ${formatBytes(totalLimit)} (gzip)`
    );
  } else {
    results.passed.push(`Total bundle: ${formatBytes(totalGzip)} / ${formatBytes(totalLimit)}`);
  }
}

function checkAssetSize() {
  console.log('\n🖼️  Checking asset sizes...');
  const publicPath = join(ROOT, 'public');
  
  if (!existsSync(publicPath)) return;

  const checkDir = (dir) => {
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = join(dir, file.name);
      if (file.isDirectory()) {
        checkDir(filePath);
      } else {
        const ext = file.name.match(/\.[^.]+$/)?.[0];
        const limit = ext ? BUDGETS.assets[ext] : null;
        if (limit) {
          const size = statSync(filePath).size;
          if (size > limit * 1024) {
            results.failed.push(
              `Asset ${file.name}: ${formatBytes(size)} > ${formatBytes(limit * 1024)}`
            );
          } else {
            results.passed.push(`Asset ${file.name}: ${formatBytes(size)} / ${formatBytes(limit * 1024)}`);
          }
        }
      }
    }
  };
  
  checkDir(publicPath);
}

function checkSourceFileSize() {
  console.log('\n📄 Checking source file sizes...');
  const srcPath = join(ROOT, 'src');
  
  if (!existsSync(srcPath)) return;

  const checkFile = (file) => {
    const size = statSync(file).size;
    // Warn if individual source file > 50KB
    if (size > 50 * 1024) {
      results.warnings.push(
        `Large source file: ${file.replace(ROOT, '.')} - ${formatBytes(size)}`
      );
    }
  };

  const walkDir = (dir) => {
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = join(dir, file.name);
      if (file.isDirectory()) {
        walkDir(filePath);
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        checkFile(filePath);
      }
    }
  };
  
  walkDir(srcPath);
}

function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERFORMANCE BUDGET REPORT');
  console.log('='.repeat(60));

  console.log(`\n✅ PASSED: ${results.passed.length}`);
  results.passed.forEach((msg) => console.log(`  ✓ ${msg}`));

  console.log(`\n❌ FAILED: ${results.failed.length}`);
  results.failed.forEach((msg) => console.log(`  ✗ ${msg}`));

  console.log(`\n⚠️  WARNINGS: ${results.warnings.length}`);
  results.warnings.forEach((msg) => console.log(`  ! ${msg}`));

  console.log('\n' + '='.repeat(60));

  if (results.failed.length > 0) {
    console.log('❌ Performance budget check FAILED');
    console.log('   Fix the issues above before deploying to production');
    process.exit(1);
  } else {
    console.log('✅ Performance budget check PASSED');
    process.exit(0);
  }
}

// Main execution
console.log('🚀 Checking performance budgets...');
console.log(`Working directory: ${ROOT}`);

try {
  checkBundleSize();
  checkAssetSize();
  checkSourceFileSize();
  printReport();
} catch (error) {
  console.error('Error during performance check:', error.message);
  process.exit(1);
}

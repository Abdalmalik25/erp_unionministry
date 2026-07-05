/**
 * Cleanup Script - تنظيف البيانات القديمة
 * UnionSphere Enterprise
 */

import { clearOldLogs } from '../src/app/utils/operations.js';

async function main() {
    const args = process.argv.slice(2);
    const days = parseInt(args.find(arg => arg.startsWith('--days='))?.replace('--days=', '') || '30');

    console.log('====================================='.cyan);
    console.log('UnionSphere Enterprise - Cleanup System'.green);
    console.log('====================================='.cyan);
    console.log('');

    try {
        console.log(`🧹 Cleaning up logs older than ${days} days...`.blue);
        
        await clearOldLogs(days);

        console.log('');
        console.log('✅ Cleanup completed successfully!'.green);
        console.log(`   Removed logs older than: ${days} days`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

main();
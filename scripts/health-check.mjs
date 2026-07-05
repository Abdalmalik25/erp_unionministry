/**
 * Health Check Script - فحص صحة النظام
 * UnionSphere Enterprise
 */

import { runHealthChecks } from '../src/app/utils/operations.js';
import { getBackupSchedule } from '../src/app/utils/backup.js';
import { getConnectionStatus } from '../src/app/utils/sync.js';

async function main() {
    console.log('================================='.cyan);
    console.log('UnionSphere Enterprise - Health Check'.green);
    console.log('================================='.cyan);
    console.log('');

    try {
        // فحص صحة النظام
        console.log('🔍 Checking system health...'.blue);
        const checks = await runHealthChecks();

        let allHealthy = true;
        checks.forEach(check => {
            const status = check.status === 'healthy' ? '✅'.green : 
                          check.status === 'warning' ? '⚠️'.yellow : '❌'.red;
            console.log(`  ${status} ${check.component.padEnd(15)} ${check.message}`);
            if (check.status !== 'healthy') allHealthy = false;
        });

        // فحص النسخة الاحتياطية
        console.log('');
        console.log('💾 Checking backup schedule...'.blue);
        const schedule = await getBackupSchedule();
        if (schedule?.enabled) {
            const nextRun = new Date(schedule.nextRun || 0);
            console.log(`  ✅ Backup scheduled for: ${nextRun.toLocaleString()}`);
        } else {
            console.log('  ⚠️ No backup schedule configured');
        }

        // فحص الاتصال
        console.log('');
        console.log('🌐 Connection status:'.blue, getConnectionStatus() === 'online' ? 'Online'.green : 'Offline'.red);

        console.log('');
        console.log(allHealthy ? '🎉 System is healthy!'.green : '⚠️ Some checks need attention'.yellow);
        
        process.exit(allHealthy ? 0 : 1);
    } catch (error) {
        console.error('❌ Health check failed:', error);
        process.exit(1);
    }
}

main();
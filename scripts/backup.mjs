/**
 * Backup Script - إنشاء نسخة احتياطية
 * UnionSphere Enterprise
 */

import { createBackup, scheduleBackup, getBackupStats } from '../src/app/utils/backup.js';

async function main() {
    const args = process.argv.slice(2);
    const isEmergency = args.includes('--emergency');

    console.log('====================================='.cyan);
    console.log('UnionSphere Enterprise - Backup System'.green);
    console.log('====================================='.cyan);
    console.log('');

    try {
        if (isEmergency) {
            console.log('🚨 Creating emergency backup...'.red);
        }

        console.log('📦 Creating backup...'.blue);
        const backup = await createBackup({
            retentionDays: 90,
            encrypt: true,
            compress: true,
        });

        console.log('');
        console.log('✅ Backup created successfully!'.green);
        console.log(`   ID: ${backup.id}`);
        console.log(`   Size: ${(backup.size / 1024).toFixed(2)} KB`);
        console.log(`   Entities: ${backup.entityCount}`);
        console.log(`   Members: ${backup.memberCount}`);
        console.log(`   Encrypted: ${backup.encrypted ? 'Yes'.green : 'No'.yellow}`);

        // إحصائيات
        const stats = await getBackupStats();
        console.log('');
        console.log('📊 Backup Statistics:'.blue);
        console.log(`   Total backups: ${stats.totalBackups}`);
        console.log(`   Average size: ${(stats.averageSize / 1024).toFixed(2)} KB`);
        console.log(`   Encrypted backups: ${stats.encryptedBackups}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    }
}

main();
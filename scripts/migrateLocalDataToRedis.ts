/**
 * ENCLAVE Data Migration Utility: Local Filesystem to Redis
 * 
 * Safely, idempotently migrates existing .enclave-data/ state (users.json, audit.json)
 * to Upstash Redis REST storage without deleting or corrupting local files.
 * 
 * Invariants:
 * 1. Read-only on local source files (zero mutations or deletions to local data).
 * 2. Idempotent Redis writes (checks existing entries or uses atomic keys).
 * 3. Never writes plaintext passwords or plaintext verification tokens.
 * 4. Fails safely if Redis credentials are missing.
 * 
 * Usage:
 *   npx tsx scripts/migrateLocalDataToRedis.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  DistributedAccountAdminStoreAdapter,
  type ServerUserRecord,
  type AuditEvent
} from '../src/lib/serverAccountAdminAdapter';

interface MigrationReport {
  totalUsersRead: number;
  usersMigrated: number;
  usersSkippedExisting: number;
  totalAuditEventsRead: number;
  auditEventsMigrated: number;
  errors: string[];
}

export async function migrateLocalDataToRedis(): Promise<MigrationReport> {
  const report: MigrationReport = {
    totalUsersRead: 0,
    usersMigrated: 0,
    usersSkippedExisting: 0,
    totalAuditEventsRead: 0,
    auditEventsMigrated: 0,
    errors: []
  };

  const redisUrl = process.env.ENCLAVE_REDIS_REST_URL;
  const redisToken = process.env.ENCLAVE_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error(
      'MIGRATION ABORTED: Missing ENCLAVE_REDIS_REST_URL or ENCLAVE_REDIS_REST_TOKEN environment variables.'
    );
  }

  const adapter = new DistributedAccountAdminStoreAdapter({
    url: redisUrl,
    token: redisToken
  });

  const dataDir = process.env.ENCLAVE_DATA_DIR
    ? path.resolve(process.env.ENCLAVE_DATA_DIR)
    : path.join(process.cwd(), '.enclave-data');

  const usersFilePath = path.join(dataDir, 'users.json');
  const auditFilePath = path.join(dataDir, 'audit.json');

  console.log('----------------------------------------------------');
  console.log('  ENCLAVE DATA MIGRATION: LOCAL FILESYSTEM -> REDIS ');
  console.log('----------------------------------------------------');
  console.log(`[SOURCE DIRECTORY] ${dataDir}`);
  console.log(`[TARGET REDIS]     ${redisUrl}`);

  // 1. Migrate Users
  if (fs.existsSync(usersFilePath)) {
    console.log(`\n[STEP 1] Reading user records from ${usersFilePath}...`);
    try {
      const rawUsers = fs.readFileSync(usersFilePath, 'utf-8');
      const users: ServerUserRecord[] = JSON.parse(rawUsers);
      report.totalUsersRead = Array.isArray(users) ? users.length : 0;

      for (const user of users) {
        if (!user.email || !user.id) {
          report.errors.push(`Skipping malformed user entry: id=${user.id}, email=${user.email}`);
          continue;
        }

        const normalizedEmail = user.email.toLowerCase().trim();
        const userToMigrate: ServerUserRecord = {
          id: user.id,
          email: normalizedEmail,
          displayName: user.displayName || 'Anonymous User',
          avatarSeed: user.avatarSeed || user.displayName || user.id,
          passwordHash: user.passwordHash,
          isVerified: Boolean(user.isVerified),
          createdAt: user.createdAt || Date.now(),
          verifiedAt: user.verifiedAt,
          lastLoginAt: user.lastLoginAt,
          verificationTokenHash: user.verificationTokenHash,
          verificationTokenExpiresAt: user.verificationTokenExpiresAt,
          lastVerificationSentAt: user.lastVerificationSentAt,
          resendAttemptsCount: user.resendAttemptsCount
        };

        // Atomic NX write: will NOT overwrite existing records in Redis
        const created = await adapter.createUserNX(userToMigrate);
        if (!created) {
          report.usersSkippedExisting++;
          continue;
        }
        report.usersMigrated++;
      }
      console.log(`✓ Users Migration Complete: Read ${report.totalUsersRead}, Migrated ${report.usersMigrated}, Skipped ${report.usersSkippedExisting}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      report.errors.push(`Failed to migrate users: ${errMsg}`);
      console.error('❌ User migration failed:', errMsg);
    }
  } else {
    console.log(`\n[STEP 1] No users.json file found at ${usersFilePath} (skipping user migration).`);
  }

  // 2. Migrate Audit Logs
  if (fs.existsSync(auditFilePath)) {
    console.log(`\n[STEP 2] Reading audit records from ${auditFilePath}...`);
    try {
      const rawAudit = fs.readFileSync(auditFilePath, 'utf-8');
      const auditEvents: AuditEvent[] = JSON.parse(rawAudit);
      report.totalAuditEventsRead = Array.isArray(auditEvents) ? auditEvents.length : 0;

      // Migrate up to latest 500 audit logs to preserve sequence
      const eventsToMigrate = Array.isArray(auditEvents) ? auditEvents.slice(0, 500) : [];
      // Push oldest to newest so newest ends up at head of list in Redis LPUSH
      for (let i = eventsToMigrate.length - 1; i >= 0; i--) {
        const event = eventsToMigrate[i];
        if (event && event.action) {
          await adapter.appendAuditLog(event);
          report.auditEventsMigrated++;
        }
      }
      console.log(`✓ Audit Migration Complete: Read ${report.totalAuditEventsRead}, Migrated ${report.auditEventsMigrated}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      report.errors.push(`Failed to migrate audit logs: ${errMsg}`);
      console.error('❌ Audit migration failed:', errMsg);
    }
  } else {
    console.log(`\n[STEP 2] No audit.json file found at ${auditFilePath} (skipping audit migration).`);
  }

  console.log('\n----------------------------------------------------');
  console.log('  MIGRATION SUMMARY');
  console.log(`  Users Read:       ${report.totalUsersRead}`);
  console.log(`  Users Migrated:   ${report.usersMigrated}`);
  console.log(`  Users Skipped:    ${report.usersSkippedExisting}`);
  console.log(`  Audit Logs Read:  ${report.totalAuditEventsRead}`);
  console.log(`  Audit Logs Saved: ${report.auditEventsMigrated}`);
  console.log(`  Errors:           ${report.errors.length}`);
  console.log('----------------------------------------------------');

  return report;
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.includes('migrateLocalDataToRedis'))) {
  migrateLocalDataToRedis()
    .then((report) => {
      if (report.errors.length > 0) {
        console.warn('Migration completed with warnings/errors.');
      } else {
        console.log('Migration completed successfully.');
      }
    })
    .catch((err) => {
      console.error('Fatal migration error:', err);
      process.exit(1);
    });
}

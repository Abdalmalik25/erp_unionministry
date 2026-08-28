// migrate-production-features.mjs — ترحيل تزايدي آمن (idempotent):
// 1) أعمدة MFA على sector_users (TOTP RFC 6238)
// 2) عمود embedding vector(384) + فهرسة HNSW على legal_articles + ملء المتجهات
// 3) جدول uploaded_files لمنظومة الرفع الإنتاجية
// لا يحذف ولا يعدّل أي بيانات قائمة — إضافة فقط.
import pg from 'pg';
import { embed, toPgVector, EMBEDDING_DIM } from '../server/lib/embeddings.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('[1/4] MFA columns on sector_users...');
  await pool.query(`
    ALTER TABLE sector_users
      ADD COLUMN IF NOT EXISTS mfa_secret text,
      ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS mfa_enrolled_at timestamptz`);

  console.log('[2/4] embedding column + HNSW index on legal_articles...');
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name='legal_articles' AND column_name='embedding') THEN
        ALTER TABLE legal_articles ADD COLUMN embedding vector(${EMBEDDING_DIM});
      END IF;
    END $$`);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS legal_articles_embedding_hnsw
      ON legal_articles USING hnsw (embedding vector_cosine_ops)`);

  console.log('[3/4] uploaded_files table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      original_name text NOT NULL,
      safe_name text NOT NULL UNIQUE,
      mime_type text NOT NULL,
      size_bytes integer NOT NULL,
      sha256 text NOT NULL,
      storage_path text NOT NULL,
      uploaded_by uuid REFERENCES sector_users(id),
      created_at timestamptz NOT NULL DEFAULT NOW()
    )`);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS uploaded_files_uploaded_by_idx
      ON uploaded_files (uploaded_by)`);

  console.log('[4/4] backfill legal_articles embeddings...');
  const { rows } = await pool.query(
    `SELECT id, coalesce(title_ar,'') || ' ' || coalesce(content_ar,'') AS text
     FROM legal_articles WHERE embedding IS NULL`);
  let done = 0;
  for (const row of rows) {
    await pool.query(`UPDATE legal_articles SET embedding = $2::vector WHERE id = $1`,
      [row.id, toPgVector(embed(row.text))]);
    done++;
    if (done % 100 === 0) console.log(`  ...${done}/${rows.length}`);
  }
  console.log(`  backfilled: ${done} articles`);

  const total = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(embedding)::int AS embedded FROM legal_articles`);
  console.log('legal_articles:', total.rows[0]);
  await pool.end();
  console.log('MIGRATION OK');
}

main().catch(e => { console.error('MIGRATION FAILED:', e.message); process.exit(1); });
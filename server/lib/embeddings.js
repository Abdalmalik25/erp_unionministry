// server/lib/embeddings.js — مُتجهِز نصي حقيقي (Hashing Vectorizer) بلا اعتماديات
// تقنية feature hashing القياسية (كما في scikit-learn HashingVectorizer):
// تُحوّل النص — العربي خصوصاً — إلى متجه 384-بعد مُطبّع L2، جاهز لفهرسة pgvector HNSW
// وبحث تشابه جيبي حقيقي. تعمل فوراً بلا مزوّد خارجي ولا مفاتيح API، وتُستبدل لاحقاً
// بمُتجهِز عصبي عند توفره دون تغيير أي استدعاء (نفس البعد والتخزين).

export const EMBEDDING_DIM = 384;

/** تطبيع النص العربي/اللاتيني: إزالة التشكيل، توحيد الهمزات، إسقاط الرموز */
function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // التشكيل والتطويل
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** كلمات وظيفتية عربية/إنجليزية شائعة تُستبعد من التمثيل */
const STOPWORDS = new Set(('في من على عن الى إلى مع هذا هذه ذلك التي الذي كان كانت يكون وهو وهي قد لقد ثم أو او بل كل بعض غير بين عند لما اذا إذا ما لا لم لن ان أن إن كما اما أما لأن لان and the for with this that from are was were will have has been its their').split(' '));

/** توكنيزة: كلمات أحادية + ثنائيات (bigrams) لالتقاط السياق */
function tokenize(text) {
  const words = normalizeText(text).split(' ').filter(w => w.length > 1 && !STOPWORDS.has(w));
  const tokens = [...words];
  for (let i = 0; i < words.length - 1; i++) tokens.push(`${words[i]}_${words[i + 1]}`);
  return tokens;
}

/** هاش ثابت (FNV-1a) — نفس النص يعطي نفس المتجه دائماً عبر كل العمليات */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * تحويل نص إلى متجه 384-بعد مُطبّع L2 (TF Sublinear weighting).
 * إخراج: مصفوفة أرقام — تُخزن مباشرة في عمود pgvector vector(384).
 */
export function embed(text) {
  const vec = new Float64Array(EMBEDDING_DIM);
  const tokens = tokenize(text);
  if (!tokens.length) return Array.from(vec);
  // تكرارات بوزن جذر-لوغاريتمي (sublinear TF) — كفاءة تمثيلية أعلى من العد الخام
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  for (const [tok, count] of tf) {
    const h = fnv1a(tok);
    const idx = h % EMBEDDING_DIM;
    // هاش إشارة منفصل لتقليل تصادمات الإلغاء (hashing trick القياسي)
    const sign = (fnv1a(`s:${tok}`) & 1) === 0 ? 1 : -1;
    vec[idx] += sign * (1 + Math.log(count));
  }
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, v => v / norm);
}

/** تمثيل المتجه كسلسلة pgvector: '[0.1,0.2,...]' */
export function toPgVector(arr) {
  return `[${arr.map(v => v.toFixed(6)).join(',')}]`;
}
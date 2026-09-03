// server/lib/nuclearCrypto.js — Nuclear Vault: Military-grade Cryptography
// AES-256-GCM + Key Rotation + HSM Simulation + Memory-only Secrets + Continuous Audit

import crypto from 'crypto';

// ===================== Key Management — Memory-Only Vault =====================

const keyVault = new Map();
const keyAuditLog = [];
const KEY_ROTATION_INTERVAL = parseInt(process.env.KEY_ROTATION_INTERVAL || '60000', 10); // 60 seconds default
const MAX_AUDIT_ENTRIES = 10000;

let masterKey = null;
let rotationTimer = null;

function generateKeyId() {
  return `nv-${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`;
}

function generateKeyMaterial(length = 32) {
  return crypto.randomBytes(length);
}

function deriveKey(master, context, length = 32) {
  return crypto.createHmac('sha256', master).update(context).digest().slice(0, length);
}

// ===================== HSM Simulation — Software HSM =====================

const hsmState = {
  initialized: false,
  keyStore: new Map(),
  operationCount: 0,
  lastHealthCheck: null,
  tamperEvidence: [],
};

export function initHSM(masterSecret) {
  if (hsmState.initialized) return hsmState;
  masterKey = masterSecret ? Buffer.from(masterSecret, 'hex') : generateKeyMaterial(64);
  hsmState.initialized = true;
  hsmState.lastHealthCheck = Date.now();
  logAudit('HSM_INIT', { status: 'initialized', keyId: generateKeyId() });
  rotateKeys();
  return hsmState;
}

function logAudit(operation, details = {}) {
  const entry = {
    timestamp: Date.now(),
    operation,
    ...details,
  };
  keyAuditLog.push(entry);
  if (keyAuditLog.length > MAX_AUDIT_ENTRIES) keyAuditLog.splice(0, keyAuditLog.length - MAX_AUDIT_ENTRIES);
}

// ===================== Key Rotation — Automatic =====================

function rotateKeys() {
  if (rotationTimer) clearInterval(rotationTimer);
  rotationTimer = setInterval(() => {
    performKeyRotation();
  }, KEY_ROTATION_INTERVAL);
  rotationTimer.unref();
}

function performKeyRotation() {
  const now = Date.now();
  const newKeyId = generateKeyId();
  const newKey = deriveKey(masterKey, `rotation-${newKeyId}-${now}`);
  const newIvKey = deriveKey(masterKey, `iv-${newKeyId}-${now}`, 16);

  keyVault.set(newKeyId, {
    key: newKey,
    ivKey: newIvKey,
    createdAt: now,
    expiresAt: now + KEY_ROTATION_INTERVAL * 3,
    usageCount: 0,
    algorithm: 'aes-256-gcm',
  });

  // Mark old keys for expiry
  for (const [id, entry] of keyVault) {
    if (id !== newKeyId && entry.expiresAt <= now) {
      // Securely erase old key material
      entry.key.fill(0);
      entry.ivKey.fill(0);
      keyVault.delete(id);
      logAudit('KEY_EXPIRED', { keyId: id });
    }
  }

  hsmState.operationCount++;
  logAudit('KEY_ROTATED', { newKeyId, activeKeys: keyVault.size });
  return newKeyId;
}

// ===================== Encryption — AES-256-GCM =====================

export function nuclearEncrypt(plaintext, context = 'default') {
  if (!hsmState.initialized) throw new Error('HSM not initialized');
  if (!plaintext) return null;

  const now = Date.now();
  let activeKey = null;
  let keyId = null;

  for (const [id, entry] of keyVault) {
    if (entry.expiresAt > now) {
      activeKey = entry;
      keyId = id;
      break;
    }
  }

  if (!activeKey) {
    keyId = performKeyRotation();
    activeKey = keyVault.get(keyId);
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', activeKey.key, iv);

  const aad = Buffer.from(`${context}:${keyId}:${now}`);
  cipher.setAAD(aad);

  const plaintextBuf = Buffer.from(String(plaintext), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
  const tag = cipher.getAuthTag();

  activeKey.usageCount++;

  const result = [
    keyId,
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
    aad.toString('hex'),
  ].join(':');

  logAudit('ENCRYPT', { keyId, context, plaintextLength: plaintextBuf.length });
  hsmState.operationCount++;
  return result;
}

export function nuclearDecrypt(ciphertext, context = 'default') {
  if (!hsmState.initialized) throw new Error('HSM not initialized');
  if (!ciphertext) return null;

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 5) throw new Error('Invalid ciphertext format');

    const [keyId, ivHex, tagHex, encHex, aadHex] = parts;
    const keyEntry = keyVault.get(keyId);
    if (!keyEntry) throw new Error('Key not found — possible rotation');

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const expectedAad = Buffer.from(aadHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyEntry.key, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(expectedAad);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    keyEntry.usageCount++;
    hsmState.operationCount++;
    logAudit('DECRYPT', { keyId, context, success: true });
    return decrypted.toString('utf8');
  } catch (err) {
    logAudit('DECRYPT_FAIL', { error: err.message, context });
    return null;
  }
}

// ===================== Secure Token Generation =====================

export function generateNuclearToken(length = 48) {
  return crypto.randomBytes(length).toString('hex');
}

export function generateSecureAPIKey(prefix = 'nuk') {
  const key = crypto.randomBytes(32).toString('base64url');
  return `${prefix}_${key}`;
}

// ===================== Password Hashing — Argon2-like via scrypt =====================

export function nuclearHashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return {
    hash: hash.toString('hex'),
    salt,
    algorithm: 'scrypt-nuclear',
    params: { N: 16384, r: 8, p: 1 },
  };
}

export function nuclearVerifyPassword(password, storedHash, storedSalt) {
  try {
    const hash = crypto.scryptSync(password, storedSalt, 64, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(
      Buffer.from(hash.toString('hex'), 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}

// ===================== Data Fingerprinting =====================

export function nuclearFingerprint(data) {
  const sha512 = crypto.createHash('sha512').update(String(data)).digest('hex');
  const sha3_256 = crypto.createHash('sha3-256').update(String(data)).digest('hex');
  return {
    sha512,
    sha3_256,
    combined: crypto.createHmac('sha256', sha512).update(sha3_256).digest('hex'),
  };
}

// ===================== Continuous Audit =====================

export function getCryptoAuditLog(lastN = 100) {
  return keyAuditLog.slice(-lastN);
}

export function getCryptoHealth() {
  const now = Date.now();
  const activeKeys = [...keyVault.entries()].filter(([, e]) => e.expiresAt > now);
  return {
    hsmInitialized: hsmState.initialized,
    activeKeys: activeKeys.length,
    totalOperations: hsmState.operationCount,
    lastHealthCheck: hsmState.lastHealthCheck,
    rotationInterval: KEY_ROTATION_INTERVAL,
    auditEntries: keyAuditLog.length,
    oldestKey: activeKeys.length > 0 ? Math.min(...activeKeys.map(([, e]) => e.createdAt)) : null,
    keyDetails: activeKeys.map(([id, e]) => ({
      id,
      algorithm: e.algorithm,
      usageCount: e.usageCount,
      expiresIn: e.expiresAt - now,
    })),
  };
}

// ===================== Secure Wipe =====================

export function secureWipe() {
  for (const [, entry] of keyVault) {
    if (entry.key) entry.key.fill(0);
    if (entry.ivKey) entry.ivKey.fill(0);
  }
  keyVault.clear();
  if (masterKey) masterKey.fill(0);
  masterKey = null;
  if (rotationTimer) clearInterval(rotationTimer);
  logAudit('SECURE_WIPE', { status: 'complete' });
}

// ===================== Self-Destruct Code (Anti-RE) =====================

const selfDestructTriggers = new Set();
let selfDestructArmed = false;

export function armSelfDestruct(triggerCallback) {
  selfDestructArmed = true;
  const id = crypto.randomBytes(8).toString('hex');
  selfDestructTriggers.add(id);
  logAudit('SELF_DESTRUCT_ARMED', { triggerId: id });
  return {
    triggerId: id,
    disarm: () => {
      selfDestructTriggers.delete(id);
      if (selfDestructTriggers.size === 0) selfDestructArmed = false;
      logAudit('SELF_DESTRUCT_DISARMED', { triggerId: id });
    },
  };
}

export function checkSelfDestruct(context = {}) {
  if (!selfDestructArmed || selfDestructTriggers.size === 0) return false;
  logAudit('SELF_DESTRUCT_TRIGGERED', context);
  secureWipe();
  process.exit(1);
}

export default {
  initHSM,
  nuclearEncrypt,
  nuclearDecrypt,
  generateNuclearToken,
  generateSecureAPIKey,
  nuclearHashPassword,
  nuclearVerifyPassword,
  nuclearFingerprint,
  getCryptoAuditLog,
  getCryptoHealth,
  secureWipe,
  armSelfDestruct,
  checkSelfDestruct,
};

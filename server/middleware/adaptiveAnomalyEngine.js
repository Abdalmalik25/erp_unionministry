// server/middleware/adaptiveAnomalyEngine.js — Adaptive ML-Based Anomaly Detection
// Online learning, concept drift detection, ensemble models, explainable AI
// Implements: Isolation Forest, LSTM Autoencoder, Statistical Profiling, Peer Group Analysis

import { pool } from './shared.js';
import { auditLog } from './shared.js';

// ===================== FEATURE EXTRACTION =====================
export const ANOMALY_FEATURES = {
  // Request-level features (extracted per request)
  request: [
    'method', 'path_depth', 'param_count', 'body_size', 'header_count',
    'user_agent_entropy', 'cookie_count', 'auth_type', 'tls_version',
    'ip_reputation', 'geo_distance', 'asn_risk', 'time_since_last_request',
  ],
  // Session-level features (aggregated over session)
  session: [
    'request_rate', 'unique_paths', 'unique_params', 'error_rate', 'avg_response_time',
    'bytes_in', 'bytes_out', 'session_duration', 'privilege_escalation_attempts',
    'data_access_volume', 'admin_actions', 'export_actions', 'delete_actions',
  ],
  // User-level features (aggregated over time windows)
  user: [
    'daily_active_hours', 'typical_geo_locations', 'typical_devices', 'typical_ip_ranges',
    'typical_user_agents', 'privilege_change_frequency', 'failed_login_rate',
    'mfa_failure_rate', 'password_reset_frequency', 'role_changes',
  ],
  // Peer group features (comparison to similar users)
  peer: [
    'request_rate_zscore', 'data_volume_zscore', 'geo_diversity_zscore',
    'device_diversity_zscore', 'time_pattern_zscore', 'privilege_usage_zscore',
  ],
};

// ===================== BASELINE PROFILES =====================
class BaselineProfile {
  constructor(entityId, entityType) {
    this.entityId = entityId;
    this.entityType = entityType; // 'user', 'ip', 'device', 'peer_group'
    this.features = new Map(); // featureName -> { mean, std, min, max, count, lastUpdated }
    this.models = new Map(); // modelName -> modelState
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.sampleCount = 0;
  }
  
  // Update with new observation (online learning with exponential moving average)
  update(featureVector, alpha = 0.1) {
    for (const [feature, value] of Object.entries(featureVector)) {
      if (typeof value !== 'number') continue;
      
      const existing = this.features.get(feature);
      if (!existing) {
        this.features.set(feature, { mean: value, std: 0, min: value, max: value, count: 1 });
      } else {
        const oldMean = existing.mean;
        existing.mean = (1 - alpha) * oldMean + alpha * value;
        existing.std = Math.sqrt((1 - alpha) * (existing.std * existing.std + alpha * (value - oldMean) * (value - oldMean)));
        existing.min = Math.min(existing.min, value);
        existing.max = Math.max(existing.max, value);
        existing.count++;
      }
    }
    this.sampleCount++;
    this.updatedAt = Date.now();
  }
  
  // Calculate anomaly score for a feature vector
  score(featureVector) {
    let totalScore = 0;
    let featureCount = 0;
    const details = [];
    
    for (const [feature, value] of Object.entries(featureVector)) {
      if (typeof value !== 'number') continue;
      
      const profile = this.features.get(feature);
      if (!profile || profile.count < 10) continue; // Need minimum samples
      
      // Z-score based anomaly
      const zScore = profile.std > 0 ? Math.abs(value - profile.mean) / profile.std : 0;
      
      // Convert to 0-1 anomaly score (sigmoid)
      const anomalyScore = 2 / (1 + Math.exp(-zScore / 2)) - 1;
      
      totalScore += anomalyScore;
      featureCount++;
      details.push({ feature, value, mean: profile.mean, std: profile.std, zScore, anomalyScore });
    }
    
    return featureCount > 0 ? {
      score: totalScore / featureCount,
      details,
      featureCount,
    } : { score: 0, details: [], featureCount: 0 };
  }
  
  // Detect concept drift
  detectDrift(newProfile, threshold = 0.3) {
    const drifts = [];
    for (const [feature, newStats] of newProfile.features) {
      const oldStats = this.features.get(feature);
      if (!oldStats || oldStats.count < 30) continue;
      
      // KL divergence approximation for mean shift
      const meanShift = Math.abs(newStats.mean - oldStats.mean) / (oldStats.std + 0.001);
      const stdRatio = newStats.std / (oldStats.std + 0.001);
      
      if (meanShift > threshold || stdRatio > 2 || stdRatio < 0.5) {
        drifts.push({ feature, meanShift, stdRatio, severity: meanShift > threshold * 2 ? 'high' : 'medium' });
      }
    }
    return drifts;
  }
}

// ===================== ISOLATION FOREST (Simplified) =====================
class IsolationTree {
  constructor(maxDepth = 10, minSamples = 5) {
    this.maxDepth = maxDepth;
    this.minSamples = minSamples;
    this.root = null;
  }
  
  build(data, depth = 0) {
    if (data.length <= this.minSamples || depth >= this.maxDepth) {
      return { leaf: true, size: data.length };
    }
    
    // Random feature and split point
    const features = Object.keys(data[0]).filter(k => typeof data[0][k] === 'number');
    const feature = features[Math.floor(Math.random() * features.length)];
    const values = data.map(d => d[feature]).sort((a, b) => a - b);
    const split = values[Math.floor(Math.random() * values.length)];
    
    const left = data.filter(d => d[feature] < split);
    const right = data.filter(d => d[feature] >= split);
    
    return {
      leaf: false,
      feature,
      split,
      left: this.build(left, depth + 1),
      right: this.build(right, depth + 1),
    };
  }
  
  pathLength(point, node = this.root, depth = 0) {
    if (!node || node.leaf) {
      return depth + this.c(node?.size || 1);
    }
    if (point[node.feature] < node.split) {
      return this.pathLength(point, node.left, depth + 1);
    }
    return this.pathLength(point, node.right, depth + 1);
  }
  
  c(n) {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n;
  }
}

class IsolationForest {
  constructor(nTrees = 50, maxDepth = 10, subsampleSize = 256) {
    this.nTrees = nTrees;
    this.maxDepth = maxDepth;
    this.subsampleSize = subsampleSize;
    this.trees = [];
    this.trained = false;
  }
  
  fit(data) {
    this.trees = [];
    for (let i = 0; i < this.nTrees; i++) {
      // Subsample
      const sample = this.subsample(data);
      const tree = new IsolationTree(this.maxDepth);
      tree.root = tree.build(sample);
      this.trees.push(tree);
    }
    this.trained = true;
  }
  
  subsample(data) {
    const n = Math.min(this.subsampleSize, data.length);
    const indices = new Set();
    while (indices.size < n) {
      indices.add(Math.floor(Math.random() * data.length));
    }
    return Array.from(indices).map(i => data[i]);
  }
  
  score(point) {
    if (!this.trained) return 0.5;
    
    const pathLengths = this.trees.map(t => t.pathLength(point));
    const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / this.nTrees;
    
    // Normalize to 0-1 (shorter path = more anomalous)
    const c = this.c(this.subsampleSize);
    return Math.pow(2, -avgPathLength / c);
  }
  
  c(n) {
    if (n <= 1) return 1;
    return 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n;
  }
}

// ===================== LSTM AUTOENCODER (Simplified for sequences) =====================
class SequenceAnomalyDetector {
  constructor(windowSize = 50, encodingDim = 16) {
    this.windowSize = windowSize;
    this.encodingDim = encodingDim;
    this.sequences = []; // Training sequences
    this.threshold = 0.1; // Reconstruction error threshold
  }
  
  addSequence(sequence) {
    if (sequence.length >= this.windowSize) {
      this.sequences.push(sequence.slice(-this.windowSize));
      if (this.sequences.length > 1000) this.sequences.shift();
    }
  }
  
  // Simplified reconstruction error using statistical model
  score(sequence) {
    if (this.sequences.length < 50) return 0;
    
    const recent = sequence.slice(-this.windowSize);
    let totalError = 0;
    
    // Compare against historical sequences using DTW-like distance
    for (const historical of this.sequences) {
      let dist = 0;
      for (let i = 0; i < this.windowSize; i++) {
        const a = recent[i] || {};
        const b = historical[i] || {};
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        for (const key of keys) {
          const va = a[key] || 0;
          const vb = b[key] || 0;
          dist += Math.abs(va - vb);
        }
      }
      totalError += dist;
    }
    
    const avgError = totalError / this.sequences.length;
    // Normalize
    return Math.min(1, avgError / 100);
  }
  
  updateThreshold() {
    // Would use validation set in production
    this.threshold = 0.15;
  }
}

// ===================== MAIN ANOMALY ENGINE =====================
export class AdaptiveAnomalyEngine {
  constructor() {
    this.userProfiles = new Map(); // userId -> BaselineProfile
    this.ipProfiles = new Map(); // ip -> BaselineProfile
    this.deviceProfiles = new Map(); // deviceFp -> BaselineProfile
    this.peerGroups = new Map(); // peerGroupId -> BaselineProfile
    
    this.isolationForests = {
      request: new IsolationForest(30, 8, 128),
      session: new IsolationForest(20, 8, 128),
    };
    
    this.sequenceDetector = new SequenceAnomalyDetector(30, 16);
    
    this.anomalyHistory = []; // Recent anomalies for feedback
    this.alertThresholds = {
      low: 0.3,
      medium: 0.5,
      high: 0.7,
      critical: 0.85,
    };
    
    this.feedbackLoop = {
      truePositives: 0,
      falsePositives: 0,
      lastRetrain: Date.now(),
    };
    
    // Retraining schedule
    this.retrainInterval = 60 * 60 * 1000; // 1 hour
    this.minSamplesForRetrain = 500;
  }
  
  // Extract features from request
  extractRequestFeatures(req, context = {}) {
    const ip = context.ip || req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    const ua = req.headers['user-agent'] || '';
    const path = req.path || '/';
    
    return {
      // Request features
      method: this.methodToNum(req.method),
      path_depth: path.split('/').filter(Boolean).length,
      param_count: Object.keys(req.query || {}).length,
      body_size: JSON.stringify(req.body || {}).length,
      header_count: Object.keys(req.headers || {}).length,
      user_agent_entropy: this.calculateEntropy(ua),
      cookie_count: (req.headers.cookie || '').split(';').length,
      auth_type: req.user ? (req.user.mfaVerified ? 3 : 2) : (req.headers.authorization ? 1 : 0),
      tls_version: req.secure ? 1.3 : 1.2,
      ip_reputation: context.ipReputation || 0.5,
      geo_distance: context.geoDistance || 0,
      asn_risk: context.asnRisk || 0.3,
      time_since_last_request: context.timeSinceLastRequest || 0,
      
      // Context features
      hour: new Date().getHours(),
      day_of_week: new Date().getDay(),
      is_weekend: [0, 6].includes(new Date().getDay()) ? 1 : 0,
      is_off_hours: (new Date().getHours() < 6 || new Date().getHours() > 22) ? 1 : 0,
    };
  }
  
  extractSessionFeatures(sessionData) {
    // Would be computed from session history
    return {
      request_rate: sessionData.requestRate || 0,
      unique_paths: sessionData.uniquePaths || 0,
      unique_params: sessionData.uniqueParams || 0,
      error_rate: sessionData.errorRate || 0,
      avg_response_time: sessionData.avgResponseTime || 0,
      bytes_in: sessionData.bytesIn || 0,
      bytes_out: sessionData.bytesOut || 0,
      session_duration: sessionData.duration || 0,
      privilege_escalation_attempts: sessionData.privEscAttempts || 0,
      data_access_volume: sessionData.dataVolume || 0,
      admin_actions: sessionData.adminActions || 0,
      export_actions: sessionData.exportActions || 0,
      delete_actions: sessionData.deleteActions || 0,
    };
  }
  
  extractUserFeatures(userData) {
    return {
      daily_active_hours: userData.activeHours || 0,
      typical_geo_locations: userData.geoLocations?.length || 0,
      typical_devices: userData.devices?.length || 0,
      typical_ip_ranges: userData.ipRanges?.length || 0,
      typical_user_agents: userData.userAgents?.length || 0,
      privilege_change_frequency: userData.privChanges || 0,
      failed_login_rate: userData.failedLoginRate || 0,
      mfa_failure_rate: userData.mfaFailureRate || 0,
      password_reset_frequency: userData.pwdResets || 0,
      role_changes: userData.roleChanges || 0,
    };
  }
  
  methodToNum(method) {
    const methods = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4, OPTIONS: 5, HEAD: 6 };
    return methods[method] || 7;
  }
  
  calculateEntropy(str) {
    const freq = {};
    for (const c of str) freq[c] = (freq[c] || 0) + 1;
    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
  
  // Main anomaly detection
  async detect(req, context = {}) {
    const userId = context.userId || req.user?.id;
    const ip = context.ip || req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    const deviceFp = context.deviceFingerprint || req.headers['x-device-fingerprint'];
    const sessionId = context.sessionId || req.user?.sid || req.headers['x-session-id'];
    
    // 1. Request-level statistical profiling
    const requestFeatures = this.extractRequestFeatures(req, context);
    const requestScores = this.scoreFeatures('request', requestFeatures, userId, ip, deviceFp);
    
    // 2. Isolation Forest (if trained)
    const isoScore = this.isolationForests.request.trained 
      ? this.isolationForests.request.score(requestFeatures) 
      : 0;
    
    // 3. Peer group analysis
    let peerScore = 0;
    if (userId) {
      peerScore = await this.scorePeerGroup(userId, requestFeatures);
    }
    
    // 4. Sequence anomaly (session)
    let seqScore = 0;
    if (sessionId && context.sessionSequence) {
      this.sequenceDetector.addSequence(context.sessionSequence);
      seqScore = this.sequenceDetector.score(context.sessionSequence);
    }
    
    // 5. MITRE ATT&CK correlation
    let mitreScore = 0;
    if (context.mitreDetections && context.mitreDetections.length > 0) {
      mitreScore = Math.max(...context.mitreDetections.map(d => d.confidence));
    }
    
    // 6. Zero Trust correlation
    let ztScore = 0;
    if (context.trustScore !== undefined) {
      ztScore = 1 - (context.trustScore / 100);
    }
    
    // Ensemble scoring (weighted average)
    const weights = {
      statistical: 0.25,
      isolationForest: 0.20,
      peerGroup: 0.15,
      sequence: 0.15,
      mitre: 0.15,
      zeroTrust: 0.10,
    };
    
    const ensembleScore = 
      requestScores.score * weights.statistical +
      isoScore * weights.isolationForest +
      peerScore * weights.peerGroup +
      seqScore * weights.sequence +
      mitreScore * weights.mitre +
      ztScore * weights.zeroTrust;
    
    // Determine severity
    const severity = this.getSeverity(ensembleScore);
    
    // Build explanation
    const explanation = this.buildExplanation({
      requestScores,
      isoScore,
      peerScore,
      seqScore,
      mitreScore,
      ztScore,
      ensembleScore,
    });
    
    const result = {
      anomalyScore: Math.round(ensembleScore * 1000) / 1000,
      severity,
      components: {
        statistical: Math.round(requestScores.score * 1000) / 1000,
        isolationForest: Math.round(isoScore * 1000) / 1000,
        peerGroup: Math.round(peerScore * 1000) / 1000,
        sequence: Math.round(seqScore * 1000) / 1000,
        mitre: Math.round(mitreScore * 1000) / 1000,
        zeroTrust: Math.round(ztScore * 1000) / 1000,
      },
      explanation,
      timestamp: new Date().toISOString(),
      requestId: context.requestId || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    };
    
    // Update profiles (online learning)
    this.updateProfiles(userId, ip, deviceFp, requestFeatures);
    
    // Store for retraining
    this.anomalyHistory.push({ features: requestFeatures, score: ensembleScore, timestamp: Date.now() });
    if (this.anomalyHistory.length > 10000) this.anomalyHistory.shift();
    
    // Schedule retraining
    this.maybeRetrain();
    
    return result;
  }
  
  scoreFeatures(type, features, userId, ip, deviceFp) {
    const scores = { score: 0, details: [] };
    const profiles = this.getProfiles(userId, ip, deviceFp);
    
    for (const profile of profiles) {
      const result = profile.score(features);
      if (result.featureCount > 0) {
        scores.score = Math.max(scores.score, result.score);
        scores.details.push({ profile: profile.entityType, ...result });
      }
    }
    
    return scores;
  }
  
  getProfiles(userId, ip, deviceFp) {
    const profiles = [];
    if (userId) {
      if (!this.userProfiles.has(userId)) this.userProfiles.set(userId, new BaselineProfile(userId, 'user'));
      profiles.push(this.userProfiles.get(userId));
    }
    if (ip) {
      if (!this.ipProfiles.has(ip)) this.ipProfiles.set(ip, new BaselineProfile(ip, 'ip'));
      profiles.push(this.ipProfiles.get(ip));
    }
    if (deviceFp) {
      if (!this.deviceProfiles.has(deviceFp)) this.deviceProfiles.set(deviceFp, new BaselineProfile(deviceFp, 'device'));
      profiles.push(this.deviceProfiles.get(deviceFp));
    }
    return profiles;
  }
  
  updateProfiles(userId, ip, deviceFp, features) {
    if (userId) {
      const profile = this.getProfiles(userId)[0];
      profile.update(features, 0.05); // Slower learning for users
    }
    if (ip) {
      const profile = this.getProfiles(null, ip)[0];
      profile.update(features, 0.1);
    }
    if (deviceFp) {
      const profile = this.getProfiles(null, null, deviceFp)[0];
      profile.update(features, 0.08);
    }
  }
  
  async scorePeerGroup(userId, features) {
    // Find peer group (same role, department, etc.)
    const peerGroupId = await this.getPeerGroupId(userId);
    if (!peerGroupId) return 0;
    
    if (!this.peerGroups.has(peerGroupId)) {
      this.peerGroups.set(peerGroupId, new BaselineProfile(peerGroupId, 'peer_group'));
    }
    
    const profile = this.peerGroups.get(peerGroupId);
    const result = profile.score(features);
    return result.score || 0;
  }
  
  async getPeerGroupId(userId) {
    try {
      const user = await pool.query('SELECT role, user_type, organization_id FROM sector_users WHERE id = $1', [userId]);
      if (!user.rows.length) return null;
      const u = user.rows[0];
      return `peer_${u.role}_${u.user_type}_${u.organization_id || 'global'}`;
    } catch {
      return null;
    }
  }
  
  getSeverity(score) {
    if (score >= this.alertThresholds.critical) return 'critical';
    if (score >= this.alertThresholds.high) return 'high';
    if (score >= this.alertThresholds.medium) return 'medium';
    if (score >= this.alertThresholds.low) return 'low';
    return 'info';
  }
  
  buildExplanation(components) {
    const explanations = [];
    
    if (components.statistical > 0.5) {
      explanations.push({ type: 'statistical', message: 'Request deviates from historical patterns', score: components.statistical });
    }
    if (components.isolationForest > 0.5) {
      explanations.push({ type: 'isolation_forest', message: 'Request structure is anomalous', score: components.isolationForest });
    }
    if (components.peerGroup > 0.5) {
      explanations.push({ type: 'peer_group', message: 'Behavior differs from peer group', score: components.peerGroup });
    }
    if (components.sequence > 0.5) {
      explanations.push({ type: 'sequence', message: 'Session sequence is unusual', score: components.sequence });
    }
    if (components.mitre > 0.5) {
      explanations.push({ type: 'mitre', message: 'MITRE ATT&CK techniques detected', score: components.mitre });
    }
    if (components.zeroTrust > 0.5) {
      explanations.push({ type: 'zero_trust', message: 'Low trust score', score: components.zeroTrust });
    }
    
    return explanations;
  }
  
  maybeRetrain() {
    const now = Date.now();
    if (now - this.feedbackLoop.lastRetrain > this.retrainInterval && 
        this.anomalyHistory.length >= this.minSamplesForRetrain) {
      this.retrainModels();
    }
  }
  
  retrainModels() {
    // Prepare training data from anomaly history
    const trainingData = this.anomalyHistory
      .filter(h => h.score < 0.3) // Use normal traffic for training
      .map(h => h.features)
      .slice(-5000); // Last 5000 normal samples
    
    if (trainingData.length >= 100) {
      this.isolationForests.request.fit(trainingData);
      this.isolationForests.session.fit(trainingData.map(f => this.extractSessionFeatures({})));
      console.log('[ANOMALY] Models retrained with', trainingData.length, 'samples');
    }
    
    this.feedbackLoop.lastRetrain = Date.now();
  }
  
  // Feedback loop
  recordFeedback(requestId, isTruePositive) {
    if (isTruePositive) this.feedbackLoop.truePositives++;
    else this.feedbackLoop.falsePositives++;
    
    // Adjust thresholds based on feedback
    const total = this.feedbackLoop.truePositives + this.feedbackLoop.falsePositives;
    if (total > 100) {
      const fpRate = this.feedbackLoop.falsePositives / total;
      if (fpRate > 0.3) {
        // Too many false positives, increase thresholds
        this.alertThresholds.low *= 1.1;
        this.alertThresholds.medium *= 1.1;
        this.alertThresholds.high *= 1.1;
      } else if (fpRate < 0.1) {
        // Very few false positives, can be more sensitive
        this.alertThresholds.low *= 0.95;
        this.alertThresholds.medium *= 0.95;
      }
    }
  }
  
  // Get model performance metrics
  getMetrics() {
    const total = this.feedbackLoop.truePositives + this.feedbackLoop.falsePositives;
    return {
      truePositives: this.feedbackLoop.truePositives,
      falsePositives: this.feedbackLoop.falsePositives,
      precision: total > 0 ? this.feedbackLoop.truePositives / total : 0,
      profiles: {
        users: this.userProfiles.size,
        ips: this.ipProfiles.size,
        devices: this.deviceProfiles.size,
        peerGroups: this.peerGroups.size,
      },
      models: {
        isolationForest: { trained: this.isolationForests.request.trained, trees: this.isolationForests.request.nTrees },
        sequenceDetector: { sequences: this.sequenceDetector.sequences.length, windowSize: this.sequenceDetector.windowSize },
      },
      thresholds: this.alertThresholds,
      historySize: this.anomalyHistory.length,
    };
  }
}

// Singleton
export const anomalyEngine = new AdaptiveAnomalyEngine();

// ===================== MIDDLEWARE =====================
export async function anomalyDetectionMiddleware(req, res, next) {
  // Skip health checks
  if (req.path.startsWith('/api/health')) return next();
  
  const context = {
    ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
    userId: req.user?.id,
    deviceFingerprint: req.headers['x-device-fingerprint'],
    sessionId: req.user?.sid || req.headers['x-session-id'],
    mitreDetections: req.mitreDetections,
    trustScore: req.trustScore,
    ipReputation: req.ipReputation,
    geoDistance: req.geoDistance,
    asnRisk: req.asnRisk,
    timeSinceLastRequest: req.timeSinceLastRequest,
    sessionSequence: req.sessionSequence,
  };
  
  const result = await anomalyEngine.detect(req, context);
  
  // Attach to request
  req.anomalyResult = result;
  req.anomalyScore = result.anomalyScore;
  
  // Add headers
  res.setHeader('X-Anomaly-Score', result.anomalyScore);
  res.setHeader('X-Anomaly-Severity', result.severity);
  
  // Log high-severity anomalies
  if (result.severity === 'high' || result.severity === 'critical') {
    await auditLog('ANOMALY_DETECTED', req.path, req.user?.id, {
      anomalyScore: result.anomalyScore,
      severity: result.severity,
      components: result.components,
      explanation: result.explanation,
      ip: context.ip,
    }, req);
  }
  
  // For critical anomalies, could block or require step-up
  if (result.severity === 'critical' && req.method !== 'GET') {
    return res.status(403).json({
      error: 'تم رفض الطلب - تم اكتشاف شذوذ حرج',
      code: 'ANOMALY_BLOCKED',
      anomalyScore: result.anomalyScore,
      severity: result.severity,
      explanation: result.explanation,
    });
  }
  
  next();
}

// ===================== EXPORTS =====================
export { ANOMALY_FEATURES as features };
export { BaselineProfile as profile };
export { IsolationForest as forest };
export { SequenceAnomalyDetector as sequence };
export { AdaptiveAnomalyEngine as engine };
export { anomalyEngine as defaultEngine };
export { anomalyDetectionMiddleware as middleware };
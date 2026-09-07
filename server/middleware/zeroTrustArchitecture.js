// server/middleware/zeroTrustArchitecture.js — Zero Trust Architecture (NIST SP 800-207)
// Implements: Never Trust, Always Verify — Identity, Device, Network, Application, Data pillars
// Core tenets: Continuous verification, Least privilege, Assume breach, Micro-segmentation

import { pool } from './shared.js';
import { auditLog } from './shared.js';
import { mitreDetector } from './mitreAttackEngine.js';
import { assessSessionRisk } from '../lib/device.js';

// ===================== ZERO TRUST POLICY ENGINE =====================
export const ZERO_TRUST_PRINCIPLES = {
  // 1. Never Trust, Always Verify
  verifyExplicitly: {
    description: 'Always authenticate and authorize based on all available data points',
    implementation: ['Continuous auth', 'Device health', 'Location awareness', 'Behavioral analysis'],
  },
  // 2. Least Privilege Access
  leastPrivilege: {
    description: 'Limit user access with JIT/JEA, risk-based adaptive policies',
    implementation: ['RBAC + ABAC', 'Session-scoped tokens', 'Dynamic authorization', 'Privilege expiration'],
  },
  // 3. Assume Breach
  assumeBreach: {
    description: 'Minimize blast radius, segment access, verify encryption, automate response',
    implementation: ['Micro-segmentation', 'Encryption everywhere', 'Automated containment', 'Continuous monitoring'],
  },
};

// ===================== TRUST SCORE CALCULATION =====================
// Real-time trust scoring based on multiple factors (0-100, higher = more trusted)

export class ZeroTrustEngine {
  constructor() {
    this.policies = new Map();
    this.deviceRegistry = new Map();
    this.identityProviders = new Map();
    this.networkSegments = new Map();
    this.applicationCatalog = new Map();
    this.dataClassifications = new Map();
    
    // Default policy weights
    this.weights = {
      identity: 0.25,      // Authentication strength, MFA, identity proofing
      device: 0.20,        // Device health, compliance, registration
      network: 0.15,       // Network location, segmentation, encryption
      application: 0.15,   // App sensitivity, version, vulnerability status
      data: 0.15,          // Data classification, access pattern
      behavioral: 0.10,    // User behavior analytics
    };
    
    this.initializeDefaultPolicies();
  }
  
  initializeDefaultPolicies() {
    // High-value resource policies
    this.policies.set('admin-panel', {
      resource: 'admin-panel',
      minTrustScore: 80,
      requiredFactors: ['mfa', 'device-registered', 'managed-device', 'approved-location'],
      maxSessionDuration: 30 * 60 * 1000, // 30 min
      stepUpAuth: true,
    });
    
    this.policies.set('financial-data', {
      resource: 'financial-data',
      minTrustScore: 75,
      requiredFactors: ['mfa', 'device-registered', 'approved-location'],
      maxSessionDuration: 60 * 60 * 1000, // 1 hour
      stepUpAuth: true,
    });
    
    this.policies.set('pii-data', {
      resource: 'pii-data',
      minTrustScore: 70,
      requiredFactors: ['mfa', 'device-registered'],
      maxSessionDuration: 2 * 60 * 60 * 1000, // 2 hours
    });
    
    this.policies.set('api-write', {
      resource: 'api-write',
      minTrustScore: 60,
      requiredFactors: ['authenticated', 'device-known'],
      maxSessionDuration: 4 * 60 * 60 * 1000, // 4 hours
    });
    
    this.policies.set('api-read', {
      resource: 'api-read',
      minTrustScore: 40,
      requiredFactors: ['authenticated'],
      maxSessionDuration: 8 * 60 * 60 * 1000, // 8 hours
    });
    
    this.policies.set('public', {
      resource: 'public',
      minTrustScore: 0,
      requiredFactors: [],
      maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  
  // Calculate comprehensive trust score for a request
  async calculateTrustScore(req, resource) {
    const policy = this.policies.get(resource) || this.policies.get('api-read');
    const factors = {
      identity: await this.scoreIdentity(req),
      device: await this.scoreDevice(req),
      network: await this.scoreNetwork(req),
      application: await this.scoreApplication(req, resource),
      data: await this.scoreData(req, resource),
      behavioral: await this.scoreBehavioral(req),
    };
    
    // Weighted score calculation
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [factor, weight] of Object.entries(this.weights)) {
      if (factors[factor] !== undefined) {
        totalScore += factors[factor].score * weight;
        totalWeight += weight;
      }
    }
    
    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    
    // Determine access decision
    const decision = this.makeAccessDecision(finalScore, policy, factors);
    
    return {
      trustScore: finalScore,
      factors,
      policy: policy.resource,
      decision,
      requiredFactors: policy.requiredFactors,
      missingFactors: this.getMissingFactors(factors, policy.requiredFactors),
      stepUpRequired: decision === 'step_up' || (policy.stepUpAuth && finalScore < policy.minTrustScore + 10),
      maxSessionDuration: policy.maxSessionDuration,
      timestamp: new Date().toISOString(),
    };
  }
  
  // Identity factor scoring
  async scoreIdentity(req) {
    let score = 0;
    const details = [];
    
    // Base authentication
    if (req.user) {
      score += 30;
      details.push('Authenticated');
      
      // MFA
      if (req.user.mfaVerified || req.headers['x-mfa-verified'] === 'true') {
        score += 30;
        details.push('MFA verified');
      } else if (req.user.mfaEnabled) {
        score += 10;
        details.push('MFA enabled but not verified this session');
      }
      
      // Identity proofing level
      if (req.user.identityAssuranceLevel >= 3) score += 20;
      else if (req.user.identityAssuranceLevel >= 2) score += 10;
      details.push(`IAL: ${req.user.identityAssuranceLevel || 1}`);
      
      // Role risk
      const roleRisk = this.getRoleRiskScore(req.user.role);
      score += roleRisk;
      details.push(`Role risk: ${roleRisk}`);
      
    } else {
      details.push('Unauthenticated');
    }
    
    // Session freshness
    const sessionAge = req.user?.sessionAge || 0;
    if (sessionAge < 15 * 60 * 1000) score += 10; // < 15 min
    else if (sessionAge < 60 * 60 * 1000) score += 5; // < 1 hour
    details.push(`Session age: ${Math.round(sessionAge / 60000)}min`);
    
    return { score: Math.min(score, 100), details, weight: this.weights.identity };
  }
  
  getRoleRiskScore(role) {
    const riskScores = {
      'super_admin': 20,
      'ministry_admin': 15,
      'deputy_minister': 15,
      'supervisory_director': 10,
      'reports_viewer': 5,
      'inspector': 5,
      'employer': 0,
      'union': 0,
      'worker': 0,
    };
    return riskScores[role] || 0;
  }
  
  // Device factor scoring
  async scoreDevice(req) {
    let score = 0;
    const details = [];
    const deviceFp = req.headers['x-device-fingerprint'];
    
    if (!deviceFp) {
      return { score: 0, details: ['No device fingerprint'], weight: this.weights.device };
    }
    
    try {
      // Check device registry
      const device = await pool.query(
        `SELECT trusted, revoked, last_seen_at, device_type, os, browser 
         FROM device_registry 
         WHERE fingerprint = $1 AND revoked = false`,
        [deviceFp]
      );
      
      if (device.rows.length === 0) {
        details.push('Unknown device');
        score = 10; // Base for having fingerprint
      } else {
        const d = device.rows[0];
        details.push(`Known device: ${d.device_type} / ${d.os} / ${d.browser}`);
        
        if (d.trusted) {
          score += 40;
          details.push('Trusted device');
        } else {
          score += 20;
          details.push('Registered but not trusted');
        }
        
        // Recency
        const hoursSinceSeen = (Date.now() - new Date(d.last_seen_at).getTime()) / 3600000;
        if (hoursSinceSeen < 24) score += 15;
        else if (hoursSinceSeen < 168) score += 10; // week
        else score += 5;
        details.push(`Last seen: ${Math.round(hoursSinceSeen)}h ago`);
      }
      
      // Device health (would come from EDR/MDM integration)
      const health = req.headers['x-device-health'];
      if (health === 'healthy') {
        score += 20;
        details.push('Device health: healthy');
      } else if (health === 'warning') {
        score += 10;
        details.push('Device health: warning');
      } else {
        details.push('Device health: unknown');
      }
      
      // Managed device (MDM enrolled)
      if (req.headers['x-device-managed'] === 'true') {
        score += 15;
        details.push('MDM managed');
      }
      
    } catch (e) {
      console.error('[ZT] Device scoring error:', e.message);
      details.push('Scoring error');
    }
    
    return { score: Math.min(score, 100), details, weight: this.weights.device };
  }
  
  // Network factor scoring
  async scoreNetwork(req) {
    let score = 0;
    const details = [];
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    const country = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'];
    
    // Network location trust
    const trustedNetworks = process.env.TRUSTED_NETWORKS?.split(',') || [];
    const vpnDetected = req.headers['x-vpn-detected'] === 'true';
    const torDetected = req.headers['x-tor-detected'] === 'true';
    const proxyDetected = req.headers['x-proxy-detected'] === 'true';
    
    if (torDetected) {
      score = 0;
      details.push('TOR detected - blocked');
    } else if (vpnDetected) {
      score = 10;
      details.push('VPN detected - low trust');
    } else if (proxyDetected) {
      score = 20;
      details.push('Proxy detected - reduced trust');
    } else if (trustedNetworks.includes(ip)) {
      score = 50;
      details.push('Trusted network');
    } else if (country === 'YE') {
      score = 40;
      details.push('Domestic network (Yemen)');
    } else if (['SA', 'AE', 'QA', 'KW', 'BH', 'OM'].includes(country)) {
      score = 30;
      details.push('GCC network');
    } else {
      score = 10;
      details.push(`Foreign network: ${country || 'unknown'}`);
    }
    
    // TLS verification
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      score += 15;
      details.push('TLS verified');
    }
    
    // Network segmentation (micro-segment)
    const segment = req.headers['x-network-segment'];
    if (segment === 'dmz') score += 10;
    else if (segment === 'internal') score += 20;
    else if (segment === 'restricted') score += 30;
    
    details.push(`IP: ${ip}, Country: ${country || 'unknown'}`);
    
    return { score: Math.min(score, 100), details, weight: this.weights.network };
  }
  
  // Application factor scoring
  async scoreApplication(req, resource) {
    let score = 50; // Base
    const details = [];
    
    // App version/security
    const appVersion = req.headers['x-app-version'];
    const clientType = req.headers['x-client-type']; // web, mobile, api
    
    if (appVersion) {
      // Would check against known good versions
      score += 10;
      details.push(`App version: ${appVersion}`);
    }
    
    if (clientType === 'mobile' && req.headers['x-app-integrity'] === 'verified') {
      score += 15;
      details.push('Mobile app integrity verified');
    }
    
    // Vulnerability status
    const vulnStatus = req.headers['x-app-vuln-status'];
    if (vulnStatus === 'clean') score += 10;
    else if (vulnStatus === 'outdated') score -= 20;
    
    return { score: Math.max(0, Math.min(score, 100)), details, weight: this.weights.application };
  }
  
  // Data factor scoring
  async scoreData(req, resource) {
    let score = 50;
    const details = [];
    
    // Data classification
    const classification = this.getDataClassification(resource);
    const classificationScores = {
      'public': 50,
      'internal': 40,
      'confidential': 30,
      'restricted': 20,
      'top-secret': 10,
    };
    score = classificationScores[classification] || 30;
    details.push(`Data classification: ${classification}`);
    
    // Access pattern
    if (req.method === 'GET') score += 10;
    else if (['POST', 'PUT', 'PATCH'].includes(req.method)) score += 5;
    else if (req.method === 'DELETE') score -= 10;
    details.push(`Method: ${req.method}`);
    
    // Volume
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) score -= 10; // Large payloads
    
    return { score: Math.max(0, Math.min(score, 100)), details, weight: this.weights.data };
  }
  
  getDataClassification(resource) {
    const classifications = {
      'admin-panel': 'restricted',
      'financial-data': 'confidential',
      'pii-data': 'confidential',
      'api-write': 'internal',
      'api-read': 'internal',
      'public': 'public',
    };
    return classifications[resource] || 'internal';
  }
  
  // Behavioral factor scoring
  async scoreBehavioral(req) {
    let score = 50;
    const details = [];
    
    // Get from anomaly detection
    if (req.anomalyScore !== undefined) {
      if (req.anomalyScore >= 15) score = 0;
      else if (req.anomalyScore >= 10) score = 20;
      else if (req.anomalyScore >= 7) score = 35;
      else if (req.anomalyScore >= 4) score = 45;
      else score = 60;
      details.push(`Anomaly score: ${req.anomalyScore}`);
    }
    
    // MITRE ATT&CK detections
    if (req.mitreDetections && req.mitreDetections.length > 0) {
      const maxConfidence = Math.max(...req.mitreDetections.map(d => d.confidence));
      if (maxConfidence >= 0.85) score = 0;
      else if (maxConfidence >= 0.7) score = 15;
      else if (maxConfidence >= 0.5) score = 30;
      details.push(`MITRE max confidence: ${maxConfidence}`);
    }
    
    // Attack chain
    if (req.mitreAttackChain) {
      const severityScores = { critical: 0, high: 15, medium: 30, low: 45 };
      score = Math.min(score, severityScores[req.mitreAttackChain.severity] || 50);
      details.push(`Attack chain: ${req.mitreAttackChain.severity}`);
    }
    
    // Time-based
    const hour = new Date().getHours();
    if (hour >= 1 && hour < 5) {
      score -= 10;
      details.push('Off-hours access');
    }
    
    return { score: Math.max(0, Math.min(score, 100)), details, weight: this.weights.behavioral };
  }
  
  // Make access decision
  makeAccessDecision(trustScore, policy, factors) {
    if (trustScore >= policy.minTrustScore) {
      // Check required factors
      const missing = this.getMissingFactors(factors, policy.requiredFactors);
      if (missing.length === 0) return 'allow';
      return 'step_up';
    }
    
    if (trustScore >= policy.minTrustScore - 20) return 'step_up';
    return 'deny';
  }
  
  getMissingFactors(factors, required) {
    const factorMap = {
      'mfa': factors.identity?.details.some(d => d.includes('MFA verified')) || false,
      'device-registered': factors.device?.score > 20,
      'device-known': factors.device?.score > 10,
      'device-trusted': factors.device?.details.some(d => d.includes('Trusted device')) || false,
      'managed-device': factors.device?.details.some(d => d.includes('MDM managed')) || false,
      'approved-location': factors.network?.score >= 30,
      'authenticated': factors.identity?.score >= 30,
      'device-healthy': factors.device?.details.some(d => d.includes('healthy')) || false,
    };
    
    return required.filter(f => !factorMap[f]);
  }
  
  // Get trust score for display/dashboard
  getTrustLevel(score) {
    if (score >= 80) return { level: 'high', label: 'عالي', color: '#00C851', ar: 'ثقة عالية' };
    if (score >= 60) return { level: 'medium', label: 'متوسط', color: '#FFBB33', ar: 'ثقة متوسطة' };
    if (score >= 40) return { level: 'low', label: 'منخفض', color: '#FF8800', ar: 'ثقة منخفضة' };
    return { level: 'none', label: 'منعدم', color: '#FF4444', ar: 'لا ثقة' };
  }
  
  // Register policy
  registerPolicy(resource, policy) {
    this.policies.set(resource, { ...this.policies.get('api-read'), ...policy });
  }
  
  // Update weights
  updateWeights(weights) {
    this.weights = { ...this.weights, ...weights };
  }
}

// Singleton
export const zeroTrustEngine = new ZeroTrustEngine();

// ===================== CONTINUOUS VERIFICATION MIDDLEWARE =====================
export async function zeroTrustMiddleware(req, res, next) {
  // Skip health checks and public endpoints
  const publicPaths = ['/api/health', '/api/version', '/api/system/branding', '/api/system/policy'];
  if (publicPaths.includes(req.path) || req.path.startsWith('/api/auth/login')) {
    return next();
  }
  
  // Determine resource being accessed
  const resource = getResourceFromPath(req.path);
  
  // Calculate trust score
  const trustResult = await zeroTrustEngine.calculateTrustScore(req, resource);
  
  // Attach to request
  req.zeroTrust = trustResult;
  req.trustScore = trustResult.trustScore;
  req.trustLevel = zeroTrustEngine.getTrustLevel(trustResult.trustScore);
  
  // Add headers
  res.setHeader('X-Trust-Score', trustResult.trustScore);
  res.setHeader('X-Trust-Level', trustResult.trustLevel.level);
  
  // Enforce policy
  if (trustResult.decision === 'deny') {
    await auditLog('ZERO_TRUST_DENY', resource, req.user?.id, {
      trustScore: trustResult.trustScore,
      requiredScore: trustResult.policy === 'public' ? 0 : zeroTrustEngine.policies.get(resource)?.minTrustScore,
      missingFactors: trustResult.missingFactors,
      ip: req.ip,
    }, req);
    
    return res.status(403).json({
      error: 'تم رفض الوصول - درجة الثقة غير كافية',
      code: 'ZERO_TRUST_DENIED',
      trustScore: trustResult.trustScore,
      requiredScore: zeroTrustEngine.policies.get(resource)?.minTrustScore,
      missingFactors: trustResult.missingFactors,
      trustLevel: trustResult.trustLevel.ar,
    });
  }
  
  if (trustResult.decision === 'step_up' || trustResult.stepUpRequired) {
    // Add step-up challenge header
    res.setHeader('X-Step-Up-Required', 'true');
    res.setHeader('X-Step-Up-Factors', JSON.stringify(trustResult.missingFactors));
    
    // For API write operations, require step-up
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && 
        !req.headers['x-step-up-token']) {
      return res.status(401).json({
        error: 'مصادقة إضافية مطلوبة',
        code: 'STEP_UP_REQUIRED',
        factors: trustResult.missingFactors,
        trustScore: trustResult.trustScore,
      });
    }
  }
  
  // Log trust evaluation
  if (trustResult.trustScore < 60) {
    await auditLog('LOW_TRUST_ACCESS', resource, req.user?.id, {
      trustScore: trustResult.trustScore,
      factors: trustResult.factors,
      ip: req.ip,
    }, req);
  }
  
  next();
}

// Helper to map path to resource
function getResourceFromPath(path) {
  if (path.startsWith('/api/admin') || path.startsWith('/api/administration')) return 'admin-panel';
  if (path.startsWith('/api/financial') || path.startsWith('/api/payments')) return 'financial-data';
  if (path.startsWith('/api/workers') || path.startsWith('/api/members') || path.startsWith('/api/entities')) return 'pii-data';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(path)) return 'api-write';
  if (path.startsWith('/api/')) return 'api-read';
  return 'public';
}

// ===================== MICRO-SEGMENTATION =====================
export class MicroSegmentation {
  constructor() {
    this.segments = new Map();
    this.initializeSegments();
  }
  
  initializeSegments() {
    // Define network segments with policies
    this.segments.set('public', {
      name: 'Public Internet',
      cidr: '0.0.0.0/0',
      trustLevel: 'untrusted',
      allowedResources: ['public', 'api-read'],
      requiredTrustScore: 0,
    });
    
    this.segments.set('corporate', {
      name: 'Corporate Network',
      cidr: process.env.CORPORATE_CIDR || '10.0.0.0/8',
      trustLevel: 'trusted',
      allowedResources: ['api-read', 'api-write', 'pii-data'],
      requiredTrustScore: 40,
    });
    
    this.segments.set('admin', {
      name: 'Admin Network',
      cidr: process.env.ADMIN_CIDR || '10.10.0.0/16',
      trustLevel: 'highly-trusted',
      allowedResources: ['admin-panel', 'financial-data', 'pii-data', 'api-write', 'api-read'],
      requiredTrustScore: 70,
    });
    
    this.segments.set('restricted', {
      name: 'Restricted/Secure Zone',
      cidr: process.env.RESTRICTED_CIDR || '10.20.0.0/16',
      trustLevel: 'maximum-trust',
      allowedResources: ['*'],
      requiredTrustScore: 85,
    });
  }
  
  getSegment(ip) {
    // In production, use proper CIDR matching
    for (const [id, segment] of this.segments) {
      if (this.ipInCidr(ip, segment.cidr)) return { id, ...segment };
    }
    return { id: 'public', ...this.segments.get('public') };
  }
  
  ipInCidr(ip, cidr) {
    // Simplified - use proper library in production
    if (cidr === '0.0.0.0/0') return true;
    return false;
  }
  
  canAccess(segmentId, resource, trustScore) {
    const segment = this.segments.get(segmentId);
    if (!segment) return false;
    if (segment.allowedResources.includes('*')) return true;
    if (!segment.allowedResources.includes(resource)) return false;
    return trustScore >= segment.requiredTrustScore;
  }
}

export const microSegmentation = new MicroSegmentation();

// ===================== POLICY DECISION POINT (PDP) =====================
export class PolicyDecisionPoint {
  constructor() {
    this.policies = new Map();
    this.cache = new Map();
    this.cacheTtl = 30000; // 30 seconds
  }
  
  async decide(request) {
    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.decision;
    }
    
    const decision = await this.evaluate(request);
    this.cache.set(cacheKey, { decision, timestamp: Date.now() });
    return decision;
  }
  
  async evaluate(request) {
    const { subject, resource, action, context } = request;
    
    // 1. Check explicit deny policies
    const denyPolicies = this.getPolicies('deny', resource, action);
    for (const policy of denyPolicies) {
      if (this.matches(policy, subject, context)) {
        return { decision: 'deny', reason: policy.reason, policy: policy.id };
      }
    }
    
    // 2. Check allow policies with conditions
    const allowPolicies = this.getPolicies('allow', resource, action);
    for (const policy of allowPolicies) {
      if (this.matches(policy, subject, context)) {
        const conditionsMet = await this.checkConditions(policy.conditions, context);
        if (conditionsMet) {
          return { 
            decision: 'allow', 
            obligations: policy.obligations,
            policy: policy.id,
            trustScore: context.trustScore,
          };
        }
      }
    }
    
    // 3. Default deny
    return { decision: 'deny', reason: 'No matching allow policy', policy: 'default-deny' };
  }
  
  getPolicies(effect, resource, action) {
    // Would query from policy store
    return [];
  }
  
  matches(policy, subject, context) {
    // Match subject attributes, resource, action
    return true;
  }
  
  async checkConditions(conditions, context) {
    // Check MFA, device trust, location, time, etc.
    return true;
  }
  
  getCacheKey(request) {
    return `${request.subject}:${request.resource}:${request.action}`;
  }
}

export const pdp = new PolicyDecisionPoint();

// ===================== EXPORTS =====================
export { ZERO_TRUST_PRINCIPLES as principles };
export { ZeroTrustEngine as engine };
export { zeroTrustEngine as defaultEngine };
export { zeroTrustMiddleware as middleware };
export { MicroSegmentation as segmentation };
export { microSegmentation as defaultSegmentation };
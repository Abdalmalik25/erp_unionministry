// server/middleware/fairRiskEngine.js — FAIR Risk Quantification Engine
// Factor Analysis of Information Risk (FAIR) — Open Group Standard
// Quantifies risk in financial terms: Loss Event Frequency (LEF) × Loss Magnitude (LM)

import { pool } from './shared.js';
import { auditLog } from './shared.js';

// ===================== FAIR MODEL COMPONENTS =====================
/*
FAIR Ontology:
- Risk = LEF × LM
- LEF (Loss Event Frequency) = TEF × Vulnerability
  - TEF (Threat Event Frequency) = Contact Frequency × Probability of Action
  - Vulnerability = Threat Capability - Resistance Strength
- LM (Loss Magnitude) = Primary Loss + Secondary Loss
  - Primary Loss = Direct financial impact
  - Secondary Loss = Indirect (reputation, legal, etc.) × Secondary Risk
*/

export const FAIR_ASSET_CLASSES = {
  'pii-records': { 
    name: 'PII Records', 
    nameAr: 'سجلات البيانات الشخصية',
    unit: 'record',
    avgValue: 150, // USD per record (IBM Cost of Data Breach 2024)
    maxValue: 500,
    regulatoryFines: { GDPR: 0.04, CCPA: 7500, local: 50000 }, // % revenue or fixed
  },
  'financial-records': { 
    name: 'Financial Records', 
    nameAr: 'السجلات المالية',
    unit: 'record',
    avgValue: 300,
    maxValue: 1000,
    regulatoryFines: { SOX: 0.01, local: 100000 },
  },
  'medical-records': { 
    name: 'Medical Records', 
    nameAr: 'السجلات الطبية',
    unit: 'record',
    avgValue: 450,
    maxValue: 1200,
    regulatoryFines: { HIPAA: 50000, local: 200000 },
  },
  'intellectual-property': { 
    name: 'Intellectual Property', 
    nameAr: 'الملكية الفكرية',
    unit: 'asset',
    avgValue: 500000,
    maxValue: 5000000,
  },
  'system-availability': { 
    name: 'System Availability', 
    nameAr: 'توافر النظام',
    unit: 'hour',
    avgValue: 10000, // per hour downtime
    maxValue: 100000,
  },
  'reputation': { 
    name: 'Reputation', 
    nameAr: 'السمعة',
    unit: 'incident',
    avgValue: 500000,
    maxValue: 5000000,
  },
  'operational': { 
    name: 'Operational Disruption', 
    nameAr: 'تعطيل العمليات',
    unit: 'day',
    avgValue: 50000,
    maxValue: 500000,
  },
};

export const FAIR_THREAT_COMMUNITIES = {
  'external-hacker': { 
    name: 'External Hacker', 
    nameAr: 'هاكر خارجي',
    capability: { low: 20, medium: 50, high: 80, veryHigh: 95 },
    frequency: { low: 10, medium: 50, high: 200, veryHigh: 1000 }, // per year
    motivation: ['financial', 'espionage', 'hacktivism', 'destruction'],
  },
  'insider-malicious': { 
    name: 'Malicious Insider', 
    nameAr: 'موظف خبيث',
    capability: { low: 30, medium: 60, high: 85, veryHigh: 95 },
    frequency: { low: 2, medium: 10, high: 50, veryHigh: 200 },
    motivation: ['financial', 'revenge', 'ideology', 'coercion'],
  },
  'insider-accidental': { 
    name: 'Accidental Insider', 
    nameAr: 'موظف بالخطأ',
    capability: { low: 10, medium: 30, high: 50, veryHigh: 70 },
    frequency: { low: 50, medium: 200, high: 500, veryHigh: 1000 },
    motivation: ['negligence', 'error', 'misconfiguration'],
  },
  'third-party': { 
    name: 'Third Party / Supply Chain', 
    nameAr: 'جهة خارجية / سلسلة التوريد',
    capability: { low: 25, medium: 55, high: 80, veryHigh: 90 },
    frequency: { low: 5, medium: 20, high: 100, veryHigh: 500 },
    motivation: ['financial', 'espionage', 'operational'],
  },
  'nation-state': { 
    name: 'Nation State / APT', 
    nameAr: 'دولة / تهديد مستمر متقدم',
    capability: { low: 60, medium: 80, high: 95, veryHigh: 99 },
    frequency: { low: 1, medium: 5, high: 20, veryHigh: 100 },
    motivation: ['espionage', 'destruction', 'influence'],
  },
};

export const FAIR_CONTROL_EFFECTIVENESS = {
  'mfa': { resistance: 70, name: 'Multi-Factor Authentication', nameAr: 'مصادقة متعددة العوامل' },
  'encryption-at-rest': { resistance: 60, name: 'Encryption at Rest', nameAr: 'تخزين مشفر' },
  'encryption-in-transit': { resistance: 50, name: 'Encryption in Transit', nameAr: 'نقل مشفر' },
  'waf': { resistance: 55, name: 'Web Application Firewall', nameAr: 'جدار حماية تطبيقات الويب' },
  'rate-limiting': { resistance: 40, name: 'Rate Limiting', nameAr: 'تحديد المعدل' },
  'device-trust': { resistance: 45, name: 'Device Trust/Registration', nameAr: 'ثقة/تسجيل الجهاز' },
  'geo-blocking': { resistance: 35, name: 'Geo-Blocking', nameAr: 'حظر جغرافي' },
  'audit-logging': { resistance: 30, name: 'Audit Logging', nameAr: 'تسجيل التدقيق' },
  'anomaly-detection': { resistance: 50, name: 'Anomaly Detection', nameAr: 'كشف الشذوذ' },
  'mitre-detection': { resistance: 60, name: 'MITRE ATT&CK Detection', nameAr: 'كشف MITRE ATT&CK' },
  'zero-trust': { resistance: 65, name: 'Zero Trust Architecture', nameAr: 'هندسة الثقة الصفرية' },
  'micro-segmentation': { resistance: 50, name: 'Micro-Segmentation', nameAr: 'التجزئة الدقيقة' },
  'privileged-access': { resistance: 55, name: 'Privileged Access Management', nameAr: 'إدارة الوصول المميز' },
  'backup-encryption': { resistance: 40, name: 'Encrypted Backups', nameAr: 'نسخ احتياطية مشفرة' },
  'incident-response': { resistance: 35, name: 'Incident Response Plan', nameAr: 'خطة استجابة الحوادث' },
  'security-training': { resistance: 25, name: 'Security Awareness Training', nameAr: 'تدريب الوعي الأمني' },
  'vuln-management': { resistance: 45, name: 'Vulnerability Management', nameAr: 'إدارة الثغرات' },
  'dlp': { resistance: 50, name: 'Data Loss Prevention', nameAr: 'منع فقدان البيانات' },
};

// ===================== FAIR CALCULATION ENGINE =====================
export class FairRiskEngine {
  constructor() {
    this.scenarios = new Map();
    this.assetInventory = new Map();
    this.threatProfiles = new Map();
    this.controlInventory = new Map();
    this.initializeDefaults();
  }
  
  initializeDefaults() {
    // Initialize asset inventory from system
    for (const [key, asset] of Object.entries(FAIR_ASSET_CLASSES)) {
      this.assetInventory.set(key, { ...asset, count: 0, criticality: 'high' });
    }
    
    // Initialize threat profiles
    for (const [key, threat] of Object.entries(FAIR_THREAT_COMMUNITIES)) {
      this.threatProfiles.set(key, { ...threat, likelihood: 'medium' });
    }
    
    // Initialize controls
    for (const [key, control] of Object.entries(FAIR_CONTROL_EFFECTIVENESS)) {
      this.controlInventory.set(key, { ...control, implemented: true, effectiveness: control.resistance });
    }
  }
  
  // Main risk calculation for a scenario
  calculateRisk(scenario) {
    const {
      assetClass,
      assetCount = 1,
      threatCommunity = 'external-hacker',
      threatCapability = 'medium',
      controls = [],
      resistanceStrength = 50, // 0-100
      contactFrequency = 100, // per year
      probabilityOfAction = 0.5, // 0-1
      primaryLossPerUnit,
      secondaryLossMultiplier = 1.5,
      secondaryRisk = 0.3,
    } = scenario;
    
    const asset = this.assetInventory.get(assetClass) || FAIR_ASSET_CLASSES['pii-records'];
    const threat = this.threatProfiles.get(threatCommunity) || FAIR_THREAT_COMMUNITIES['external-hacker'];
    
    // Get threat capability (0-100)
    const threatCap = threat.capability[threatCapability] || 50;
    
    // Calculate Vulnerability = Threat Capability - Resistance Strength
    // Normalized to 0-100, then to 0-1 probability
    const vulnerability = Math.max(0, Math.min(100, threatCap - resistanceStrength)) / 100;
    
    // TEF = Contact Frequency × Probability of Action
    const tef = contactFrequency * probabilityOfAction;
    
    // LEF = TEF × Vulnerability
    const lef = tef * vulnerability;
    
    // Primary Loss = Asset Count × Value per Unit
    const unitValue = primaryLossPerUnit || asset.avgValue;
    const primaryLoss = assetCount * unitValue;
    
    // Secondary Loss = Primary Loss × Multiplier × Secondary Risk
    const secondaryLoss = primaryLoss * secondaryLossMultiplier * secondaryRisk;
    
    // Loss Magnitude
    const lossMagnitude = primaryLoss + secondaryLoss;
    
    // Annualized Risk = LEF × LM
    const annualizedRisk = lef * lossMagnitude;
    
    // Risk in USD per year
    const riskUSD = Math.round(annualizedRisk);
    
    // Also calculate single loss expectancy (SLE) and annualized loss expectancy (ALE)
    const sle = lossMagnitude; // Single Loss Expectancy
    const ale = annualizedRisk; // Annualized Loss Expectancy
    
    return {
      scenario: assetClass,
      asset: asset.name,
      assetAr: asset.nameAr,
      assetCount,
      threatCommunity: threat.name,
      threatAr: threat.nameAr,
      threatCapability,
      threatCap,
      resistanceStrength,
      vulnerability: Math.round(vulnerability * 100),
      contactFrequency,
      probabilityOfAction,
      tef: Math.round(tef),
      lef: Math.round(lef * 100) / 100,
      primaryLoss: Math.round(primaryLoss),
      secondaryLoss: Math.round(secondaryLoss),
      lossMagnitude: Math.round(lossMagnitude),
      sle: Math.round(sle),
      ale: Math.round(ale),
      riskUSD,
      riskLevel: this.getRiskLevel(riskUSD),
      currency: 'USD',
      timestamp: new Date().toISOString(),
    };
  }
  
  // Calculate risk for all asset classes against all threat communities
  calculatePortfolioRisk(options = {}) {
    const results = [];
    
    for (const [assetKey, asset] of this.assetInventory) {
      if (asset.count === 0 && !options.includeZeroCount) continue;
      
      for (const [threatKey, threat] of this.threatProfiles) {
        // Skip unlikely combinations
        if (this.shouldSkipCombination(assetKey, threatKey)) continue;
        
        const scenario = {
          assetClass: assetKey,
          assetCount: asset.count || 1,
          threatCommunity: threatKey,
          threatCapability: options.threatCapability || 'medium',
          controls: options.controls || Array.from(this.controlInventory.keys()),
          resistanceStrength: this.calculateResistanceStrength(options.controls),
          contactFrequency: threat.frequency.medium,
          probabilityOfAction: 0.5,
          primaryLossPerUnit: asset.avgValue,
        };
        
        const risk = this.calculateRisk(scenario);
        risk.assetKey = assetKey;
        risk.threatKey = threatKey;
        results.push(risk);
      }
    }
    
    // Sort by risk descending
    results.sort((a, b) => b.riskUSD - a.riskUSD);
    
    // Calculate totals
    const totalRisk = results.reduce((sum, r) => sum + r.riskUSD, 0);
    const totalALE = results.reduce((sum, r) => sum + r.ale, 0);
    
    return {
      scenarios: results,
      summary: {
        totalScenarios: results.length,
        totalRiskUSD: Math.round(totalRisk),
        totalALE: Math.round(totalALE),
        topRisk: results[0] || null,
        riskByAsset: this.aggregateByAsset(results),
        riskByThreat: this.aggregateByThreat(results),
        riskByLevel: this.aggregateByLevel(results),
      },
      timestamp: new Date().toISOString(),
    };
  }
  
  shouldSkipCombination(asset, threat) {
    // Skip implausible combinations
    const implausible = {
      'system-availability': ['insider-accidental'],
      'reputation': ['insider-accidental'],
    };
    return implausible[asset]?.includes(threat) || false;
  }
  
  calculateResistanceStrength(controlKeys = []) {
    if (!controlKeys.length) return 20; // Baseline
    
    let totalResistance = 0;
    let count = 0;
    
    for (const key of controlKeys) {
      const control = this.controlInventory.get(key);
      if (control && control.implemented) {
        totalResistance += control.effectiveness;
        count++;
      }
    }
    
    if (count === 0) return 20;
    
    // Diminishing returns for multiple controls
    const avg = totalResistance / count;
    const diminishing = 1 - Math.pow(0.85, count);
    return Math.min(95, Math.round(avg * diminishing + 20 * (1 - diminishing)));
  }
  
  aggregateByAsset(results) {
    const agg = {};
    for (const r of results) {
      if (!agg[r.assetKey]) agg[r.assetKey] = { riskUSD: 0, count: 0 };
      agg[r.assetKey].riskUSD += r.riskUSD;
      agg[r.assetKey].count++;
    }
    return agg;
  }
  
  aggregateByThreat(results) {
    const agg = {};
    for (const r of results) {
      if (!agg[r.threatKey]) agg[r.threatKey] = { riskUSD: 0, count: 0 };
      agg[r.threatKey].riskUSD += r.riskUSD;
      agg[r.threatKey].count++;
    }
    return agg;
  }
  
  aggregateByLevel(results) {
    const levels = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const r of results) {
      levels[r.riskLevel]++;
    }
    return levels;
  }
  
  getRiskLevel(riskUSD) {
    if (riskUSD >= 1000000) return { level: 'critical', label: 'حرج', color: '#8B0000', ar: 'حرج' };
    if (riskUSD >= 100000) return { level: 'high', label: 'عالي', color: '#FF4444', ar: 'عالي' };
    if (riskUSD >= 10000) return { level: 'medium', label: 'متوسط', color: '#FFBB33', ar: 'متوسط' };
    return { level: 'low', label: 'منخفض', color: '#00C851', ar: 'منخفض' };
  }
  
  // Monte Carlo simulation for uncertainty
  monteCarloSimulation(scenario, iterations = 10000) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      // Sample from distributions
      const threatCap = this.sampleTriangular(
        scenario.threatCapability === 'low' ? 20 : scenario.threatCapability === 'medium' ? 50 : 80,
        scenario.threatCapability === 'low' ? 10 : scenario.threatCapability === 'medium' ? 50 : 70,
        scenario.threatCapability === 'low' ? 30 : scenario.threatCapability === 'medium' ? 50 : 90
      );
      
      const resistance = this.sampleNormal(scenario.resistanceStrength, 10);
      const vulnerability = Math.max(0, Math.min(1, (threatCap - resistance) / 100));
      
      const tef = scenario.contactFrequency * scenario.probabilityOfAction;
      const lef = tef * vulnerability;
      
      const primaryLoss = scenario.assetCount * this.sampleLognormal(scenario.primaryLossPerUnit, 0.5);
      const secondaryLoss = primaryLoss * this.sampleLognormal(1.5, 0.3) * this.sampleBeta(0.3, 2, 5);
      
      const lossMagnitude = primaryLoss + secondaryLoss;
      const annualRisk = lef * lossMagnitude;
      
      results.push(annualRisk);
    }
    
    results.sort((a, b) => a - b);
    
    return {
      mean: Math.round(results.reduce((a, b) => a + b, 0) / iterations),
      median: Math.round(results[Math.floor(iterations / 2)]),
      p10: Math.round(results[Math.floor(iterations * 0.1)]),
      p90: Math.round(results[Math.floor(iterations * 0.9)]),
      p95: Math.round(results[Math.floor(iterations * 0.95)]),
      p99: Math.round(results[Math.floor(iterations * 0.99)]),
      min: Math.round(results[0]),
      max: Math.round(results[iterations - 1]),
      stdDev: Math.round(Math.sqrt(results.reduce((sum, v) => sum + Math.pow(v - results.reduce((a, b) => a + b, 0) / iterations, 2), 0) / iterations)),
    };
  }
  
  // Statistical sampling helpers
  sampleTriangular(min, mode, max) {
    const u = Math.random();
    const cdf = (mode - min) / (max - min);
    if (u < cdf) return min + Math.sqrt(u * (max - min) * (mode - min));
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
  
  sampleNormal(mean, stdDev) {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }
  
  sampleLognormal(mean, sigma) {
    const normal = this.sampleNormal(Math.log(mean) - 0.5 * sigma * sigma, sigma);
    return Math.exp(normal);
  }
  
  sampleBeta(mean, alpha, beta) {
    // Simplified beta sampling
    return mean + (Math.random() - 0.5) * 0.2;
  }
  
  // Update asset count from system
  async updateAssetInventory() {
    try {
      // PII Records (workers + members)
      const workers = await pool.query(`SELECT COUNT(*) as count FROM workers WHERE deleted_at IS NULL`);
      const members = await pool.query(`SELECT COUNT(*) as count FROM members WHERE deleted_at IS NULL`);
      this.assetInventory.set('pii-records', { 
        ...this.assetInventory.get('pii-records'), 
        count: parseInt(workers.rows[0].count) + parseInt(members.rows[0].count) 
      });
      
      // Financial records
      const payments = await pool.query(`SELECT COUNT(*) as count FROM payments WHERE deleted_at IS NULL`);
      this.assetInventory.set('financial-records', { 
        ...this.assetInventory.get('financial-records'), 
        count: parseInt(payments.rows[0].count) 
      });
      
      // System availability (entities)
      const entities = await pool.query(`SELECT COUNT(*) as count FROM organizational_entities WHERE deleted_at IS NULL AND status = 'active'`);
      this.assetInventory.set('system-availability', { 
        ...this.assetInventory.get('system-availability'), 
        count: parseInt(entities.rows[0].count) 
      });
      
    } catch (e) {
      console.error('[FAIR] Asset inventory update failed:', e.message);
    }
  }
  
  // Generate risk report for dashboard
  generateRiskReport() {
    const portfolio = this.calculatePortfolioRisk({ includeZeroCount: true });
    
    return {
      executiveSummary: {
        totalAnnualRisk: portfolio.summary.totalRiskUSD,
        riskLevel: this.getAggregateRiskLevel(portfolio.summary.totalRiskUSD),
        topRiskScenario: portfolio.summary.topRisk,
        riskTrend: 'stable', // Would compare with previous period
      },
      portfolio,
      recommendations: this.generateRecommendations(portfolio),
      compliance: this.checkCompliance(portfolio),
    };
  }
  
  getAggregateRiskLevel(totalRisk) {
    if (totalRisk >= 10000000) return { level: 'critical', ar: 'حرج' };
    if (totalRisk >= 1000000) return { level: 'high', ar: 'عالي' };
    if (totalRisk >= 100000) return { level: 'medium', ar: 'متوسط' };
    return { level: 'low', ar: 'منخفض' };
  }
  
  generateRecommendations(portfolio) {
    const recs = [];
    
    // Top risk scenarios
    for (const scenario of portfolio.scenarios.slice(0, 5)) {
      if (scenario.riskLevel.level === 'critical' || scenario.riskLevel.level === 'high') {
        recs.push({
          priority: 'high',
          scenario: scenario.asset,
          threat: scenario.threatAr,
          riskUSD: scenario.riskUSD,
          recommendation: this.getMitigationRecommendation(scenario),
        });
      }
    }
    
    // Control gaps
    const missingControls = this.identifyControlGaps();
    for (const control of missingControls) {
      recs.push({
        priority: 'medium',
        type: 'control_gap',
        control: control.nameAr,
        recommendation: `Implement ${control.name} to reduce risk by ~${control.resistance}%`,
      });
    }
    
    return recs;
  }
  
  getMitigationRecommendation(scenario) {
    const mitigations = {
      'external-hacker': 'Deploy WAF, MFA, rate limiting, geo-blocking, anomaly detection',
      'insider-malicious': 'Implement PAM, DLP, behavioral monitoring, least privilege',
      'insider-accidental': 'Security training, automated safeguards, approval workflows',
      'third-party': 'Vendor risk management, supply chain monitoring, contractual controls',
      'nation-state': 'Advanced threat detection, threat intelligence, air-gapped backups',
    };
    return mitigations[scenario.threatKey] || 'Implement defense-in-depth controls';
  }
  
  identifyControlGaps() {
    const implemented = new Set();
    for (const [key, control] of this.controlInventory) {
      if (control.implemented) implemented.add(key);
    }
    
    const allControls = Object.keys(FAIR_CONTROL_EFFECTIVENESS);
    return allControls
      .filter(k => !implemented.has(k))
      .map(k => FAIR_CONTROL_EFFECTIVENESS[k])
      .sort((a, b) => b.resistance - a.resistance);
  }
  
  checkCompliance(portfolio) {
    // Check against regulatory thresholds
    const thresholds = {
      'GDPR': 1000000, // €1M risk threshold
      'SAMA': 500000,  // Saudi Central Bank
      'Local': 200000, // Local regulation
    };
    
    return Object.entries(thresholds).map(([reg, threshold]) => ({
      regulation: reg,
      threshold,
      currentRisk: portfolio.summary.totalRiskUSD,
      compliant: portfolio.summary.totalRiskUSD < threshold,
      gap: Math.max(0, portfolio.summary.totalRiskUSD - threshold),
    }));
  }
}

// Singleton
export const fairEngine = new FairRiskEngine();

// ===================== MIDDLEWARE INTEGRATION =====================
export async function fairRiskMiddleware(req, res, next) {
  // Attach risk context to high-value operations
  const highValuePaths = ['/api/financial', '/api/payments', '/api/admin', '/api/export'];
  const isHighValue = highValuePaths.some(p => req.path.startsWith(p));
  
  if (isHighValue && req.user) {
    // Quick risk assessment
    const assetCount = 1; // Would be calculated from request
    const quickRisk = fairEngine.calculateRisk({
      assetClass: 'financial-records',
      assetCount,
      threatCommunity: 'external-hacker',
      threatCapability: 'medium',
      resistanceStrength: fairEngine.calculateResistanceStrength(),
      contactFrequency: 100,
      probabilityOfAction: 0.3,
    });
    
    req.fairRisk = quickRisk;
    res.setHeader('X-Risk-Score', quickRisk.riskUSD);
    res.setHeader('X-Risk-Level', quickRisk.riskLevel.level);
    
    // Log high-risk operations
    if (quickRisk.riskLevel.level === 'high' || quickRisk.riskLevel.level === 'critical') {
      await auditLog('HIGH_RISK_OPERATION', req.path, req.user.id, {
        riskUSD: quickRisk.riskUSD,
        riskLevel: quickRisk.riskLevel.level,
        asset: quickRisk.asset,
        threat: quickRisk.threatAr,
      }, req);
    }
  }
  
  next();
}

// ===================== API ENDPOINTS =====================
export async function getFairRiskDashboard(req, res) {
  if (!req.user || !['super_admin', 'ministry_admin', 'supervisory_director'].includes(req.user.role)) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  
  try {
    // Update asset counts from DB
    await fairEngine.updateAssetInventory();
    
    // Generate report
    const report = fairEngine.generateRiskReport();
    
    // Get control effectiveness
    const controls = Array.from(fairEngine.controlInventory.entries()).map(([key, c]) => ({
      id: key,
      name: c.name,
      nameAr: c.nameAr,
      implemented: c.implemented,
      effectiveness: c.effectiveness,
      resistance: c.resistance,
    }));
    
    res.json({
      report,
      controls,
      assetInventory: Object.fromEntries(fairEngine.assetInventory),
      threatProfiles: Object.fromEntries(fairEngine.threatProfiles),
      methodology: 'FAIR (Factor Analysis of Information Risk) - Open Group Standard',
      version: '2024',
    });
  } catch (e) {
    console.error('[FAIR] Dashboard error:', e.message);
    res.status(500).json({ error: 'فشل جلب لوحة المخاطر' });
  }
}

export async function runFairSimulation(req, res) {
  if (!req.user || !['super_admin', 'ministry_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  
  const { scenario, iterations = 10000 } = req.body;
  
  if (!scenario) {
    return res.status(400).json({ error: 'Scenario required' });
  }
  
  const simulation = fairEngine.monteCarloSimulation(scenario, iterations);
  
  res.json({
    scenario,
    simulation,
    iterations,
    interpretation: {
      mean: `Average annual loss: $${simulation.mean.toLocaleString()}`,
      p90: `90% chance loss < $${simulation.p90.toLocaleString()}`,
      p95: `95% chance loss < $${simulation.p95.toLocaleString()}`,
      p99: `99% chance loss < $${simulation.p99.toLocaleString()}`,
      max: `Worst case: $${simulation.max.toLocaleString()}`,
    },
  });
}

export async function calculateScenarioRisk(req, res) {
  const scenario = req.body;
  const risk = fairEngine.calculateRisk(scenario);
  res.json(risk);
}

export function getFairAssetClasses() {
  return FAIR_ASSET_CLASSES;
}

export function getFairThreatCommunities() {
  return FAIR_THREAT_COMMUNITIES;
}

export function getFairControls() {
  return FAIR_CONTROL_EFFECTIVENESS;
}

// ===================== EXPORTS =====================
export { FAIR_ASSET_CLASSES as assets };
export { FAIR_THREAT_COMMUNITIES as threats };
export { FAIR_CONTROL_EFFECTIVENESS as controls };
export { FairRiskEngine as engine };
export { fairEngine as defaultEngine };
export { fairRiskMiddleware as middleware };
export { getFairRiskDashboard as dashboard };
export { runFairSimulation as simulation };
export { calculateScenarioRisk as calculate };
/**
 * Automated Inspection & Evaluation System
 * نظام التفتيش والتقييم الآلي للمنشآت
 * وفقاً لقانون العمل اليمني وقرار وزاري 42/2020
 */
// ============================================================
// Types
// ============================================================
export interface AutomatedInspectionResult {
    inspectionId: string;
    enterpriseId: string;
    enterpriseName: string;
    inspectionDate: string;
    inspectionType: 'روتينية' | 'طارئة' | 'سنوية' | 'متابعة';
    // النتائج
    overallScore: number;
    complianceStatus: 'متوافق بالكامل' | 'متوافق جزئياً' | 'غير متوافق';
    // تفاصيل الامتثال
    laborLawCompliance: ComplianceDetail;
    safetyCompliance: ComplianceDetail;
    trainingCompliance: ComplianceDetail;
    yemenizationCompliance: ComplianceDetail;
    qualityCompliance: ComplianceDetail;
    // التوصيات
    recommendations: string[];
    strengths: string[];
    weaknesses: string[];
    // المراجع القانونية
    applicableArticles: string[];
    applicableDecrees: string[];
    applicableStandards: string[];
    // الجدول القادم
    nextInspectionDate: string;
    evaluationLevel: 'basic' | 'advanced' | 'expert';
    // تقييم المخاطر
    riskAssessment: RiskAssessment;
}
export interface ComplianceDetail {
    score: number;
    weight: number;
    status: 'متوافق' | 'جزئياً متوافق' | 'غير متوافق';
    items: ComplianceItem[];
    missingItems: string[];
}
export interface ComplianceItem {
    name: string;
    isCompliant: boolean;
    score: number;
    notes: string;
}
export interface RiskAssessment {
    level: 'منخفض' | 'متوسط' | 'عالي' | 'حرج';
    score: number;
    factors: RiskFactor[];
}
export interface RiskFactor {
    factor: string;
    impact: 'منخفض' | 'متوسط' | 'عالي';
    likelihood: 'منخفضة' | 'متوسطة' | 'عالية';
    mitigation: string;
}
// ============================================================
// Inspection Engine
// ============================================================
const LABOR_LAW_ARTICLES = [
    { number: '2', title: 'تعريف المهنة', weight: 10 },
    { number: '3', title: 'التصنيف المهني', weight: 10 },
    { number: '4', title: 'الوصف الوظيفي', weight: 15 },
    { number: '5', title: 'المستويات المهنية', weight: 10 },
    { number: '7', title: 'السلامة المهنية', weight: 20 },
    { number: '8', title: 'الفحوصات الطبية', weight: 15 },
    { number: '9', title: 'الرواتب والأجور', weight: 10 },
    { number: '10', title: 'ساعات العمل', weight: 10 },
];
const MINISTERIAL_DECREES = [
    { number: '42/2020', title: 'التفتيش الميداني الموحد' },
    { number: '15/2018', title: 'نسبة اليمننة' },
    { number: '28/2019', title: 'السلامة المهنية' },
];
export function conductAutomatedInspection(data: {
    enterpriseId: string;
    enterpriseName: string;
    inspectionType?: string;
    occupationLinks?: any[];
    trainingRecords?: any[];
    memberCount?: number;
    yemeniCount?: number;
}): AutomatedInspectionResult {
    const inspectionId = `INSP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const inspectionDate = new Date().toISOString().split('T')[0];
    // تقييم الامتثال لقانون العمل
    const laborLawCompliance = evaluateLaborLawCompliance();
    // تقييم السلامة المهنية
    const safetyCompliance = evaluateSafetyCompliance();
    // تقييم التدريب
    const trainingCompliance = evaluateTrainingCompliance(data);
    // تقييم اليمننة
    const yemenizationCompliance = evaluateYemenizationCompliance(data);
    // تقييم الجودة
    const qualityCompliance = evaluateQualityCompliance();
    // حساب النتيجة الإجمالية
    const overallScore = Math.round((laborLawCompliance.score * 0.25) +
        (safetyCompliance.score * 0.20) +
        (trainingCompliance.score * 0.20) +
        (yemenizationCompliance.score * 0.15) +
        (qualityCompliance.score * 0.20));
    // تحديد حالة الامتثال
    let complianceStatus: 'متوافق بالكامل' | 'متوافق جزئياً' | 'غير متوافق';
    if (overallScore >= 85)
        complianceStatus = 'متوافق بالكامل';
    else if (overallScore >= 60)
        complianceStatus = 'متوافق جزئياً';
    else
        complianceStatus = 'غير متوافق';
    // تقييم المخاطر
    const riskAssessment = assessRisk(overallScore, data);
    // توليد التوصيات
    const { recommendations, strengths, weaknesses } = generateInspectionReport(laborLawCompliance, safetyCompliance, trainingCompliance, yemenizationCompliance, qualityCompliance, riskAssessment);
    // تحديد التاريخ القادم
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + (overallScore >= 80 ? 6 : 3));
    // تحديد مستوى التقييم
    let evaluationLevel: 'basic' | 'advanced' | 'expert';
    if (overallScore >= 95)
        evaluationLevel = 'expert';
    else if (overallScore >= 80)
        evaluationLevel = 'advanced';
    else
        evaluationLevel = 'basic';
    return {
        inspectionId,
        enterpriseId: data.enterpriseId,
        enterpriseName: data.enterpriseName,
        inspectionDate,
        inspectionType: (data.inspectionType as any) || 'روتينية',
        overallScore,
        complianceStatus,
        laborLawCompliance,
        safetyCompliance,
        trainingCompliance,
        yemenizationCompliance,
        qualityCompliance,
        recommendations,
        strengths,
        weaknesses,
        applicableArticles: LABOR_LAW_ARTICLES.map(a => `المادة ${a.number}`),
        applicableDecrees: MINISTERIAL_DECREES.map(d => `قرار ${d.number}`),
        applicableStandards: ['ILO C87', 'ILO C98', 'ISO 45001'],
        nextInspectionDate: nextDate.toISOString().split('T')[0],
        evaluationLevel,
        riskAssessment,
    };
}
// ============================================================
// Evaluation Functions
// ============================================================
function evaluateLaborLawCompliance(): ComplianceDetail {
    const items: ComplianceItem[] = [];
    const missingItems: string[] = [];
    // تقييم كل مادة قانونية
    for (const article of LABOR_LAW_ARTICLES) {
        const isCompliant = Math.random() > 0.2; // محاكاة
        items.push({
            name: `المادة ${article.number}: ${article.title}`,
            isCompliant,
            score: isCompliant ? article.weight : 0,
            notes: isCompliant ? 'متوافق' : 'يحتاج تحسين',
        });
        if (!isCompliant)
            missingItems.push(article.title);
    }
    const totalScore = items.reduce((sum, item) => sum + item.score, 0);
    const maxScore = LABOR_LAW_ARTICLES.reduce((sum, a) => sum + a.weight, 0);
    return {
        score: Math.round((totalScore / maxScore) * 100),
        weight: 25,
        status: totalScore >= maxScore * 0.8 ? 'متوافق' : totalScore >= maxScore * 0.5 ? 'جزئياً متوافق' : 'غير متوافق',
        items,
        missingItems,
    };
}
function evaluateSafetyCompliance(): ComplianceDetail {
    const items: ComplianceItem[] = [];
    const missingItems: string[] = [];
    const safetyChecks = [
        'وجود نظام إدارة السلامة',
        'تدريب العمال على السلامة',
        'توفر معدات الحماية',
        'وجود خطة الطوارئ',
        'فحص المعدات الدورية',
    ];
    for (const check of safetyChecks) {
        const isCompliant = Math.random() > 0.25;
        items.push({
            name: check,
            isCompliant,
            score: isCompliant ? 20 : 0,
            notes: isCompliant ? 'متوافق' : 'يحتاج تحسين',
        });
        if (!isCompliant)
            missingItems.push(check);
    }
    const totalScore = items.reduce((sum, item) => sum + item.score, 0);
    return {
        score: Math.round(totalScore),
        weight: 20,
        status: totalScore >= 80 ? 'متوافق' : totalScore >= 50 ? 'جزئياً متوافق' : 'غير متوافق',
        items,
        missingItems,
    };
}
function evaluateTrainingCompliance(data: any): ComplianceDetail {
    const items: ComplianceItem[] = [];
    const missingItems: string[] = [];
    const trainingRate = data.trainingRecords && data.trainingRecords.length > 0
        ? (data.trainingRecords.filter((r: any) => r.status === 'مكتمل').length / data.trainingRecords.length) * 100
        : 0;
    items.push({
        name: 'نسبة إتمام التدريب',
        isCompliant: trainingRate >= 70,
        score: Math.min(trainingRate, 100),
        notes: `${Math.round(trainingRate)}% من العمال مدربين`,
    });
    if (trainingRate < 70)
        missingItems.push('زيادة برامج التدريب');
    return {
        score: Math.round(trainingRate),
        weight: 20,
        status: trainingRate >= 70 ? 'متوافق' : trainingRate >= 50 ? 'جزئياً متوافق' : 'غير متوافق',
        items,
        missingItems,
    };
}
function evaluateYemenizationCompliance(data: any): ComplianceDetail {
    const items: ComplianceItem[] = [];
    const missingItems: string[] = [];
    const yemenizationRate = data.memberCount && data.yemeniCount
        ? (data.yemeniCount / data.memberCount) * 100
        : 0;
    items.push({
        name: 'نسبة اليمننة',
        isCompliant: yemenizationRate >= 75,
        score: Math.min(yemenizationRate, 100),
        notes: `${Math.round(yemenizationRate)}% يمنيين`,
    });
    if (yemenizationRate < 75)
        missingItems.push('رفع نسبة اليمننة إلى 75% على الأقل');
    return {
        score: Math.round(yemenizationRate),
        weight: 15,
        status: yemenizationRate >= 75 ? 'متوافق' : yemenizationRate >= 50 ? 'جزئياً متوافق' : 'غير متوافق',
        items,
        missingItems,
    };
}
function evaluateQualityCompliance(): ComplianceDetail {
    const items: ComplianceItem[] = [];
    const missingItems: string[] = [];
    const qualityChecks = [
        'وجود نظام إدارة الجودة',
        'رضا العمال',
        'فعالية العمليات',
        'التحسين المستمر',
    ];
    for (const check of qualityChecks) {
        const isCompliant = Math.random() > 0.3;
        items.push({
            name: check,
            isCompliant,
            score: isCompliant ? 25 : 0,
            notes: isCompliant ? 'متوافق' : 'يحتاج تحسين',
        });
        if (!isCompliant)
            missingItems.push(check);
    }
    const totalScore = items.reduce((sum, item) => sum + item.score, 0);
    return {
        score: Math.round(totalScore),
        weight: 20,
        status: totalScore >= 75 ? 'متوافق' : totalScore >= 50 ? 'جزئياً متوافق' : 'غير متوافق',
        items,
        missingItems,
    };
}
function assessRisk(overallScore: number, data: any): RiskAssessment {
    const factors: RiskFactor[] = [];
    if (overallScore < 60) {
        factors.push({
            factor: 'عدم الامتثال لقانون العمل',
            impact: 'عالي',
            likelihood: 'عالية',
            mitigation: 'تحسين الامتثال القانوني فوراً',
        });
    }
    if (data.memberCount && data.yemeniCount && (data.yemeniCount / data.memberCount) < 0.75) {
        factors.push({
            factor: 'نسبة اليمننة منخفضة',
            impact: 'متوسط',
            likelihood: 'عالية',
            mitigation: 'زيادة التوظيف اليمني',
        });
    }
    let level: 'منخفض' | 'متوسط' | 'عالي' | 'حرج';
    if (overallScore >= 80)
        level = 'منخفض';
    else if (overallScore >= 60)
        level = 'متوسط';
    else if (overallScore >= 40)
        level = 'عالي';
    else
        level = 'حرج';
    return {
        level,
        score: 100 - overallScore,
        factors,
    };
}
function generateInspectionReport(laborLaw: ComplianceDetail, safety: ComplianceDetail, training: ComplianceDetail, yemenization: ComplianceDetail, quality: ComplianceDetail, risk: RiskAssessment): {
    recommendations: string[];
    strengths: string[];
    weaknesses: string[];
} {
    const recommendations: string[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    if (laborLaw.status === 'متوافق')
        strengths.push('امتثال ممتاز لقانون العمل');
    else
        weaknesses.push('يحتاج تحسين الامتثال لقانون العمل');
    if (safety.status === 'متوافق')
        strengths.push('معايير سلامة ممتازة');
    else
        weaknesses.push('يحتاج تحسين معايير السلامة');
    if (training.status === 'متوافق')
        strengths.push('برامج تدريب فعالة');
    else
        weaknesses.push('يحتاج زيادة برامج التدريب');
    if (yemenization.status === 'متوافق')
        strengths.push('نسبة يمننة ممتازة');
    else
        weaknesses.push('يحتاج رفع نسبة اليمننة');
    if (quality.status === 'متوافق')
        strengths.push('نظام جودة فعال');
    else
        weaknesses.push('يحتاج تحسين نظام الجودة');
    if (risk.level === 'عالي' || risk.level === 'حرج') {
        recommendations.push('﷼�alary تحسين شامل لجميع محاور الامتثال');
    }
    if (laborLaw.missingItems.length > 0) {
        recommendations.push(`تحسين الامتثال:${laborLaw.missingItems.join(', ')}`);
    }
    if (safety.missingItems.length > 0) {
        recommendations.push(`تعزيز السلامة:${safety.missingItems.join(', ')}`);
    }
    return { recommendations, strengths, weaknesses };
}

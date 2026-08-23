/**
 * Professions Analysis Engine
 * محرك تحليل ووصف المهن
 * وفقاً لمعايير ISCO-08 وقانون العمل اليمني
 */

// ============================================================
// Types
// ============================================================

export interface ProfessionAnalysis {
  professionCode: string;
  professionName: string;
  analysisDate: string;
  maturityScore: number;
  maturityGrade: string;
  completenessScore: number;
  sections: AnalysisSection[];
  recommendations: AnalysisRecommendation[];
  legalCompliance: LegalComplianceStatus;
  hazardAssessment: HazardAssessment;
  competencyGap: CompetencyGap[];
}

export interface AnalysisSection {
  name: string;
  nameEn: string;
  weight: number;
  score: number;
  maxScore: number;
  completionRate: number;
  missingFields: string[];
  suggestions: string[];
}

export interface AnalysisRecommendation {
  priority: 'عالي' | 'متوسط' | 'منخفض';
  category: string;
  title: string;
  description: string;
  impact: string;
}

export interface LegalComplianceStatus {
  isCompliant: boolean;
  requiredArticles: string[];
  missingArticles: string[];
  complianceRate: number;
}

export interface HazardAssessment {
  level: 'شديدة' | 'متوسطة' | 'منخفضة';
  score: number;
  missingSafetyData: string[];
  requiredMedicalExams: string[];
  requiredPPE: string[];
}

export interface CompetencyGap {
  competencyName: string;
  requiredLevel: number;
  currentLevel: number;
  gap: number;
  recommendation: string;
}

// ============================================================
// Analysis Engine
// ============================================================

const SECTION_WEIGHTS = {
  identity: 12,
  description: 18,
  tasks: 16,
  competencies: 14,
  safety: 14,
  career: 10,
  governance: 16,
};

export function analyzeProfession(profession: any): ProfessionAnalysis {
  const sections = analyzeSections(profession);
  const maturityScore = calculateMaturityScore(sections);
  const completenessScore = calculateCompleteness(profession);
  const legalCompliance = analyzeLegalCompliance(profession);
  const hazardAssessment = analyzeHazard(profession);
  const competencyGap = analyzeCompetencyGap(profession);
  const recommendations = generateRecommendations(sections, legalCompliance, hazardAssessment, competencyGap);

  return {
    professionCode: profession.code || profession.code,
    professionName: profession.nameAr || profession.name_ar,
    analysisDate: new Date().toISOString(),
    maturityScore,
    maturityGrade: getMaturityGrade(maturityScore),
    completenessScore,
    sections,
    recommendations,
    legalCompliance,
    hazardAssessment,
    competencyGap,
  };
}

function analyzeSections(profession: any): AnalysisSection[] {
  const sections: AnalysisSection[] = [];

  // 1. الهوية (12%)
  const identityFields = ['code', 'name_ar', 'isco_code', 'major_group_code', 'sector', 'family', 'level'];
  const identityMissing = identityFields.filter(f => !profession[f]);
  sections.push({
    name: 'الهوية والتصنيف',
    nameEn: 'Identity & Classification',
    weight: SECTION_WEIGHTS.identity,
    score: ((identityFields.length - identityMissing.length) / identityFields.length) * 100,
    maxScore: 100,
    completionRate: ((identityFields.length - identityMissing.length) / identityFields.length) * 100,
    missingFields: identityMissing,
    suggestions: identityMissing.length > 0 ? ['إكمال البيانات الأساسية للمهنة'] : [],
  });

  // 2. الأوصاف (18%)
  const descFields = ['description_ar', 'scope', 'description_en'];
  const descMissing = descFields.filter(f => !profession[f]);
  sections.push({
    name: 'الأوصاف والتعاريف',
    nameEn: 'Descriptions',
    weight: SECTION_WEIGHTS.description,
    score: ((descFields.length - descMissing.length) / descFields.length) * 100,
    maxScore: 100,
    completionRate: ((descFields.length - descMissing.length) / descFields.length) * 100,
    missingFields: descMissing,
    suggestions: descMissing.length > 0 ? ['إضافة وصف تفصيلي للمهنة بالعربية والإنجليزية'] : [],
  });

  // 3. المهام (16%)
  const tasks = profession.tasks || [];
  const hasTasks = Array.isArray(tasks) && tasks.length > 0;
  sections.push({
    name: 'المهام والواجبات',
    nameEn: 'Tasks & Duties',
    weight: SECTION_WEIGHTS.tasks,
    score: hasTasks ? 100 : 0,
    maxScore: 100,
    completionRate: hasTasks ? 100 : 0,
    missingFields: hasTasks ? [] : ['tasks'],
    suggestions: hasTasks ? [] : ['إضافة المهام والواجبات الرئيسية والفرعية'],
  });

  // 4. الكفايات (14%)
  const competencies = profession.competencies || [];
  const hasCompetencies = Array.isArray(competencies) && competencies.length > 0;
  sections.push({
    name: 'الكفايات والمهارات',
    nameEn: 'Competencies',
    weight: SECTION_WEIGHTS.competencies,
    score: hasCompetencies ? 100 : 0,
    maxScore: 100,
    completionRate: hasCompetencies ? 100 : 0,
    missingFields: hasCompetencies ? [] : ['competencies'],
    suggestions: hasCompetencies ? [] : ['تحديد الكفايات الفنية والرقمية والسلوكية المطلوبة'],
  });

  // 5. السلامة (14%)
  const safetyFields = ['hazard_level', 'possible_hazards', 'protective_equipment', 'prevention_methods'];
  const safetyMissing = safetyFields.filter(f => !profession[f] || (Array.isArray(profession[f]) && profession[f].length === 0));
  sections.push({
    name: 'السلامة والمخاطر',
    nameEn: 'Safety & Hazards',
    weight: SECTION_WEIGHTS.safety,
    score: ((safetyFields.length - safetyMissing.length) / safetyFields.length) * 100,
    maxScore: 100,
    completionRate: ((safetyFields.length - safetyMissing.length) / safetyFields.length) * 100,
    missingFields: safetyMissing,
    suggestions: safetyMissing.length > 0 ? ['تحديد مخاطر المهنة ومعدات الحماية الطبية'] : [],
  });

  // 6. المسار المهني (10%)
  const careerFields = ['career_path', 'min_salary', 'max_salary', 'salary_grade'];
  const careerMissing = careerFields.filter(f => !profession[f]);
  sections.push({
    name: 'المسار المهني والرواتب',
    nameEn: 'Career Path & Salary',
    weight: SECTION_WEIGHTS.career,
    score: ((careerFields.length - careerMissing.length) / careerFields.length) * 100,
    maxScore: 100,
    completionRate: ((careerFields.length - careerMissing.length) / careerFields.length) * 100,
    missingFields: careerMissing,
    suggestions: careerMissing.length > 0 ? ['تحديد نطاق الرواتب والمسار الترقي'] : [],
  });

  // 7. الحوكمة (16%)
  const govFields = ['legal_references', 'institutional_standards', 'decree_number'];
  const govMissing = govFields.filter(f => !profession[f] || (Array.isArray(profession[f]) && profession[f].length === 0));
  sections.push({
    name: 'الحوكمة والمراجع القانونية',
    nameEn: 'Governance & Legal',
    weight: SECTION_WEIGHTS.governance,
    score: ((govFields.length - govMissing.length) / govFields.length) * 100,
    maxScore: 100,
    completionRate: ((govFields.length - govMissing.length) / govFields.length) * 100,
    missingFields: govMissing,
    suggestions: govMissing.length > 0 ? ['إضافة المراجع القانونية والمعايير المؤسسية'] : [],
  });

  return sections;
}

function calculateMaturityScore(sections: AnalysisSection[]): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const section of sections) {
    totalWeightedScore += (section.score * section.weight) / 100;
    totalWeight += section.weight;
  }

  return Math.round((totalWeightedScore / totalWeight) * 100);
}

function calculateCompleteness(profession: any): number {
  const allFields = [
    'code', 'name_ar', 'isco_code', 'sector', 'family', 'level',
    'description_ar', 'scope', 'hazard_level',
    'min_salary', 'max_salary',
  ];
  const filled = allFields.filter(f => profession[f]).length;
  return Math.round((filled / allFields.length) * 100);
}

function getMaturityGrade(score: number): string {
  if (score >= 90) return 'متكاملة';
  if (score >= 75) return 'متقدمة';
  if (score >= 60) return 'نموذجية';
  if (score >= 40) return 'أساسية';
  return 'مبدئية';
}

function analyzeLegalCompliance(profession: any): LegalComplianceStatus {
  const requiredArticles = ['2', '3', '4', '5'];
  const hasLegalRefs = profession.legal_references && profession.legal_references.length > 0;
  const missingArticles = hasLegalRefs ? [] : requiredArticles;

  return {
    isCompliant: missingArticles.length === 0,
    requiredArticles,
    missingArticles,
    complianceRate: Math.round(((requiredArticles.length - missingArticles.length) / requiredArticles.length) * 100),
  };
}

function analyzeHazard(profession: any): HazardAssessment {
  const level = profession.hazard_level || 'منخفضة';
  const hasHazards = profession.possible_hazards && profession.possible_hazards.length > 0;
  const hasPPE = profession.protective_equipment && profession.protective_equipment.length > 0;
  const hasMedical = profession.medical_exams && (
    profession.medical_exams.periodic?.length > 0 ||
    profession.medical_exams.preEmployment?.length > 0
  );

  const missingSafetyData: string[] = [];
  if (!hasHazards) missingSafetyData.push('possible_hazards');
  if (!hasPPE) missingSafetyData.push('protective_equipment');
  if (!hasMedical) missingSafetyData.push('medical_exams');

  const score = Math.round(((3 - missingSafetyData.length) / 3) * 100);

  return {
    level: level as any,
    score,
    missingSafetyData,
    requiredMedicalExams: hasMedical ? [] : ['فحص طبي قبل التعيين', 'فحوصات دورية'],
    requiredPPE: hasPPE ? [] : ['معدات حماية شخصية حسب نوع المخاطر'],
  };
}

function analyzeCompetencyGap(profession: any): CompetencyGap[] {
  const gaps: CompetencyGap[] = [];
  const competencies = profession.competencies || [];

  if (competencies.length === 0) {
    gaps.push({
      competencyName: 'الكفايات الأساسية',
      requiredLevel: 5,
      currentLevel: 0,
      gap: 5,
      recommendation: 'تحديد الكفايات المطلوبة للمهنة',
    });
  }

  return gaps;
}

function generateRecommendations(
  sections: AnalysisSection[],
  legalCompliance: LegalComplianceStatus,
  hazardAssessment: HazardAssessment,
  competencyGap: CompetencyGap[]
): AnalysisRecommendation[] {
  const recommendations: AnalysisRecommendation[] = [];

  for (const section of sections) {
    if (section.completionRate < 50) {
      recommendations.push({
        priority: 'عالي',
        category: section.name,
        title: `إكمال ${section.name}`,
        description: `معدل الإكمال الحالي ${Math.round(section.completionRate)}%`,
        impact: 'تحسين النضج العام للمهنة',
      });
    }
  }

  if (!legalCompliance.isCompliant) {
    recommendations.push({
      priority: 'عالي',
      category: 'الامتثال القانوني',
      title: 'إضافة المراجع القانونية',
      description: `_missing ${legalCompliance.missingArticles.length} مراجع قانونية مطلوبة`,
      impact: 'ضمان الامتثال لقانون العمل',
    });
  }

  if (hazardAssessment.score < 80) {
    recommendations.push({
      priority: 'متوسط',
      category: 'السلامة المهنية',
      title: 'تعزيز بيانات السلامة',
      description: 'إكمال بيانات المخاطر ومعدات الحماية',
      impact: 'تحسين بيئة العمل والسلامة',
    });
  }

  for (const gap of competencyGap) {
    recommendations.push({
      priority: 'متوسط',
      category: 'الكفايات',
      title: gap.recommendation,
      description: `فجوة ${gap.gap} في مستوى ${gap.competencyName}`,
      impact: 'تحسين الكفايات المهنية',
    });
  }

  return recommendations;
}

/**
 * Recommendation Engine — AI-powered insights and suggestions
 * Yemen National Labor Platform
 *
 * Analyzes data patterns to generate actionable recommendations
 * for ministry staff, employers, and workers.
 *
 * Categories:
 * - Compliance recommendations
 * - Risk alerts
 * - Efficiency suggestions
 * - Training recommendations
 * - Preventive actions
 */

export type RecommendationCategory =
  | 'compliance'
  | 'risk'
  | 'efficiency'
  | 'training'
  | 'prevention'
  | 'opportunity';

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationAudience = 'ministry' | 'employer' | 'worker' | 'union' | 'all';

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  audience: RecommendationAudience[];
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  rationale: string; // Why this recommendation
  rationaleEn: string;
  dataBasis: string; // What data triggered this
  actionLabel: string;
  actionLabelEn: string;
  actionUrl?: string;
  metric?: {
    name: string;
    nameEn?: string;
    current: number;
    target: number;
    unit: string;
  };
  expiresAt?: Date;
  acknowledgedAt?: Date;
  createdAt: Date;
  tags: string[];
}

export interface RecommendationContext {
  userId?: string;
  role?: string;
  entityId?: string;
  governorate?: string;
  // Dashboard data
  complianceScore?: number;
  openViolations?: number;
  criticalViolations?: number;
  pendingFees?: number;
  expiringDocuments?: number;
  overdueCases?: number;
  workerCount?: number;
  contractCount?: number;
  inspectionCount?: number;
  yemenizationRate?: number;
  // Time context
  periodDays?: number;
}

// ─────────────────────────────────────────────────
// Recommendation Generators
// ─────────────────────────────────────────────────

/**
 * Generate compliance recommendations
 */
export function generateComplianceRecommendations(
  ctx: RecommendationContext
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Critical: Low compliance score
  if (ctx.complianceScore !== undefined && ctx.complianceScore < 50) {
    recs.push({
      id: `compliance-critical-${ctx.entityId || 'system'}`,
      category: 'compliance',
      priority: 'critical',
      audience: ['employer', 'ministry'],
      title: 'معدل الامتثال يتطلب تدخلاً فورياً',
      titleEn: 'Compliance score requires immediate intervention',
      description:
        'معدل الامتثال الحالي دون 50%. يجب اتخاذ إجراءات تصحيحية عاجلة لتجنب العقوبات.',
      descriptionEn:
        'Current compliance score is below 50%. Immediate corrective action required to avoid penalties.',
      rationale:
        'معدل الامتثال مؤشر رئيسي على الالتزام بالأنظمة. الانخفاض الحاد قد يؤدي إلى إلغاء التراخيص.',
      rationaleEn:
        'Compliance score is a key indicator of regulatory adherence. Sharp decline may lead to license revocation.',
      dataBasis: `compliance_score=${ctx.complianceScore}`,
      actionLabel: 'عرض خطة التصحيح',
      actionLabelEn: 'View correction plan',
      actionUrl: '/compliance-plan',
      metric: {
        name: 'معدل الامتثال',
        current: ctx.complianceScore,
        target: 80,
        unit: '%',
      },
      createdAt: new Date(),
      tags: ['compliance', 'critical', 'action-required'],
    });
  }

  // High: Open violations accumulating
  if (ctx.openViolations !== undefined && ctx.openViolations >= 5) {
    recs.push({
      id: `violations-accumulating-${ctx.entityId || 'system'}`,
      category: 'risk',
      priority: 'high',
      audience: ['employer', 'ministry'],
      title: 'تراكم المخالفات المفتوحة',
      titleEn: 'Accumulating open violations',
      description: `يوجد ${ctx.openViolations} مخالفات مفتوحة لم يتم معالجتها. هذا يؤثر على معدل الامتثال.`,
      descriptionEn: `${ctx.openViolations} open violations remain unresolved. This affects your compliance score.`,
      rationale: 'كل مخالفة مفتوحة تتراكم وتزيد من خطر التصعيد والعقوبات.',
      rationaleEn: 'Each open violation accumulates and increases risk of escalation and penalties.',
      dataBasis: `open_violations=${ctx.openViolations}`,
      actionLabel: 'مراجعة المخالفات',
      actionLabelEn: 'Review violations',
      actionUrl: '/violations',
      createdAt: new Date(),
      tags: ['violations', 'risk', 'pending-action'],
    });
  }

  // High: Critical violations
  if (ctx.criticalViolations !== undefined && ctx.criticalViolations > 0) {
    recs.push({
      id: `critical-violations-${ctx.entityId || 'system'}`,
      category: 'risk',
      priority: 'critical',
      audience: ['employer', 'ministry'],
      title: 'مخالفات جسيمة تتطلب إجراءً عاجلاً',
      titleEn: 'Critical violations require urgent action',
      description: `يوجد ${ctx.criticalViolations} مخالفة جسيمة. هذه المخالفات قد تؤدي إلى إيقاف النشاط.`,
      descriptionEn: `${ctx.criticalViolations} critical violations exist. These may lead to activity suspension.`,
      rationale: 'المخالفات الجسيمة تتعلق بسلامة العمال والبيئة المهنية ولا يمكن تأجيل معالجتها.',
      rationaleEn: 'Critical violations relate to worker safety and occupational environment and cannot be delayed.',
      dataBasis: `critical_violations=${ctx.criticalViolations}`,
      actionLabel: 'معالجة فورية',
      actionLabelEn: 'Urgent resolution required',
      actionUrl: '/violations?severity=critical',
      createdAt: new Date(),
      tags: ['critical', 'safety', 'urgent'],
    });
  }

  // Medium: Pending fees
  if (ctx.pendingFees !== undefined && ctx.pendingFees > 0) {
    recs.push({
      id: `pending-fees-${ctx.entityId || 'system'}`,
      category: 'compliance',
      priority: 'medium',
      audience: ['employer'],
      title: 'رسوم معلقة تؤثر على الامتثال',
      titleEn: 'Pending fees affecting compliance',
      description: `يوجد رسوم مستحقة بقيمة. تسديدها يحسن معدل الامتثال.`,
      descriptionEn: `Outstanding fees exist. Paying them will improve your compliance score.`,
      rationale: 'الرسوم المعلقة تؤثر على الامتثال وقد تؤدي إلى غرامات تأخير.',
      rationaleEn: 'Pending fees affect compliance and may result in late penalties.',
      dataBasis: `pending_fees=${ctx.pendingFees}`,
      actionLabel: 'سداد الرسوم',
      actionLabelEn: 'Pay fees',
      actionUrl: '/payments',
      createdAt: new Date(),
      tags: ['fees', 'payment', 'compliance'],
    });
  }

  // Medium: Expiring documents
  if (ctx.expiringDocuments !== undefined && ctx.expiringDocuments >= 3) {
    recs.push({
      id: `expiring-docs-${ctx.entityId || 'system'}`,
      category: 'prevention',
      priority: 'medium',
      audience: ['employer'],
      title: 'وثائق قريبة الانتهاء',
      titleEn: 'Documents expiring soon',
      description: `${ctx.expiringDocuments} وثائق تنتهي خلال 90 يوماً. يُنصح بتجديدها مبكراً.`,
      descriptionEn: `${ctx.expiringDocuments} documents expire within 90 days. Early renewal recommended.`,
      rationale: 'تجديد الوثائق قبل انتهائها يضمن استمرارية العمل دون انقطاع.',
      rationaleEn: 'Renewing documents before expiry ensures business continuity.',
      dataBasis: `expiring_documents=${ctx.expiringDocuments}`,
      actionLabel: 'عرض الوثائق',
      actionLabelEn: 'View documents',
      actionUrl: '/documents?filter=expiring',
      createdAt: new Date(),
      tags: ['documents', 'renewal', 'prevention'],
    });
  }

  return recs;
}

/**
 * Generate efficiency recommendations
 */
export function generateEfficiencyRecommendations(
  ctx: RecommendationContext
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Low inspection coverage
  if (
    ctx.inspectionCount !== undefined &&
    ctx.workerCount !== undefined &&
    ctx.workerCount > 50 &&
    (ctx.inspectionCount === 0 || ctx.inspectionCount < ctx.workerCount / 20)
  ) {
    recs.push({
      id: `low-inspection-${ctx.entityId || 'system'}`,
      category: 'efficiency',
      priority: 'medium',
      audience: ['ministry'],
      title: 'انخفاض معدل التفتيش',
      titleEn: 'Low inspection rate',
      description: `المنشأة لم تخضع للتفتيش منذ فترة. جدولة زيارة تفتيشية موصى بها.`,
      descriptionEn: `This entity has not been inspected recently. Scheduling an inspection is recommended.`,
      rationale: 'التفتيش الدوري يضمن الامتثال ويمنع تراكم المخالفات.',
      rationaleEn: 'Regular inspections ensure compliance and prevent accumulation of violations.',
      dataBasis: `workers=${ctx.workerCount}, inspections=${ctx.inspectionCount}`,
      actionLabel: 'جدولة تفتيش',
      actionLabelEn: 'Schedule inspection',
      actionUrl: '/inspections/new',
      createdAt: new Date(),
      tags: ['inspection', 'oversight', 'efficiency'],
    });
  }

  // Overdue cases
  if (ctx.overdueCases !== undefined && ctx.overdueCases > 0) {
    recs.push({
      id: `overdue-cases-${ctx.entityId || 'system'}`,
      category: 'efficiency',
      priority: 'high',
      audience: ['ministry'],
      title: 'حالات متجاوزة للمهلة النظامية',
      titleEn: 'Cases overdue for resolution',
      description: `${ctx.overdueCases} حالة تجاوزت المهلة النظامية. يجب تسريع المعالجة.`,
      descriptionEn: `${ctx.overdueCases} cases have exceeded their SLA. Resolution should be expedited.`,
      rationale: 'تجاوز المهلة يؤثر على سمعة الوزارة ويقلل ثقة المستفيدين.',
      rationaleEn: 'SLA breaches affect ministry reputation and reduce stakeholder trust.',
      dataBasis: `overdue_cases=${ctx.overdueCases}`,
      actionLabel: 'مراجعة الحالات',
      actionLabelEn: 'Review cases',
      actionUrl: '/cases?filter=overdue',
      createdAt: new Date(),
      tags: ['cases', 'sla', 'efficiency'],
    });
  }

  // High Yemenization opportunity
  if (ctx.yemenizationRate !== undefined && ctx.yemenizationRate < 80) {
    recs.push({
      id: `yemenization-${ctx.entityId || 'system'}`,
      category: 'opportunity',
      priority: 'medium',
      audience: ['employer'],
      title: 'فرصة تحسين نسبة التعيين الوطني',
      titleEn: 'Opportunity to improve Yemenization rate',
      description: `نسبة التعيين الوطني الحالية ${ctx.yemenizationRate}%. تحقيق 80% يمنح أولوية في التراخيص.`,
      descriptionEn: `Current Yemenization rate is ${ctx.yemenizationRate}%. Reaching 80% grants licensing priority.`,
      rationale: 'الوصول إلى سقف التعيين الوطني يمنح المنشأة أولوية في معالجة طلبات التوسع والترخيص.',
      rationaleEn: 'Reaching the national hiring quota grants the entity priority in expansion and licensing requests.',
      dataBasis: `yemenization_rate=${ctx.yemenizationRate}`,
      metric: {
        name: 'نسبة التعيين الوطني',
        current: ctx.yemenizationRate,
        target: 80,
        unit: '%',
      },
      actionLabel: 'عرض فرص التوظيف',
      actionLabelEn: 'View hiring opportunities',
      actionUrl: '/job-market',
      createdAt: new Date(),
      tags: ['yemenization', 'opportunity', 'hiring'],
    });
  }

  return recs;
}

/**
 * Generate training recommendations
 */
export function generateTrainingRecommendations(
  ctx: RecommendationContext
): Recommendation[] {
  const recs: Recommendation[] = [];

  // New employer
  if (ctx.entityId && ctx.complianceScore !== undefined && ctx.complianceScore < 60) {
    recs.push({
      id: `training-required-${ctx.entityId}`,
      category: 'training',
      priority: 'high',
      audience: ['employer'],
      title: 'تدريب إلزامي على أنظمة العمل',
      titleEn: 'Mandatory labor law training',
      description: 'بناءً على معدل الامتثال، يُنصح بإكمال دورة تدريبية على أنظمة العمل.',
      descriptionEn: 'Based on your compliance score, completing a labor law training course is recommended.',
      rationale: 'التدريب يقلل الأخطاء ويعزز الفهم الصحيح للأنظمة.',
      rationaleEn: 'Training reduces errors and enhances correct understanding of regulations.',
      dataBasis: `compliance_score=${ctx.complianceScore}`,
      actionLabel: 'عرض الدورات',
      actionLabelEn: 'View courses',
      actionUrl: '/training',
      createdAt: new Date(),
      tags: ['training', 'capacity-building', 'required'],
    });
  }

  // Safety training for high-risk entities
  if (ctx.criticalViolations && ctx.criticalViolations > 0) {
    recs.push({
      id: `safety-training-${ctx.entityId || 'system'}`,
      category: 'training',
      priority: 'critical',
      audience: ['employer', 'worker'],
      title: 'تدريب سلامة بيئة العمل إلزامي',
      titleEn: 'Mandatory occupational safety training',
      description: 'وجود مخالفات جسيمة يتطلب تدريب جميع العاملين على إجراءات السلامة.',
      descriptionEn: 'Presence of critical violations requires training all workers on safety procedures.',
      rationale: 'السلامة المهنية حق العامل وواجب المنشأة.',
      rationaleEn: 'Occupational safety is the worker\'s right and the entity\'s duty.',
      dataBasis: `critical_violations=${ctx.criticalViolations}`,
      actionLabel: 'سجل التدريب',
      actionLabelEn: 'Training records',
      actionUrl: '/training/safety',
      createdAt: new Date(),
      tags: ['safety', 'osh', 'mandatory'],
    });
  }

  return recs;
}

/**
 * Generate prevention recommendations
 */
export function generatePreventionRecommendations(
  ctx: RecommendationContext
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Upcoming contract expirations
  if (ctx.contractCount !== undefined && ctx.contractCount > 0) {
    recs.push({
      id: `contract-review-${ctx.entityId || 'system'}`,
      category: 'prevention',
      priority: 'medium',
      audience: ['employer', 'worker'],
      title: 'مراجعة العقود القريبة من الانتهاء',
      titleEn: 'Review contracts nearing expiry',
      description: 'مراجعة العقود قبل انتهائها يمنع النزاعات ويضمن حقوق الطرفين.',
      descriptionEn: 'Reviewing contracts before expiry prevents disputes and ensures both parties\' rights.',
      rationale: '60% من النزاعات العمالية سببها عدم وضوح شروط العقد.',
      rationaleEn: '60% of labor disputes stem from unclear contract terms.',
      dataBasis: `contract_count=${ctx.contractCount}`,
      actionLabel: 'مراجعة العقود',
      actionLabelEn: 'Review contracts',
      actionUrl: '/contracts?filter=expiring',
      createdAt: new Date(),
      tags: ['contracts', 'prevention', 'dispute-avoidance'],
    });
  }

  return recs;
}

/**
 * Generate all recommendations for a context
 */
export function generateRecommendations(ctx: RecommendationContext): Recommendation[] {
  const all: Recommendation[] = [
    ...generateComplianceRecommendations(ctx),
    ...generateEfficiencyRecommendations(ctx),
    ...generateTrainingRecommendations(ctx),
    ...generatePreventionRecommendations(ctx),
  ];

  // Sort by priority
  const priorityOrder: Record<RecommendationPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return all.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Filter recommendations by audience
 */
export function filterByAudience(
  recs: Recommendation[],
  audience: RecommendationAudience
): Recommendation[] {
  return recs.filter(
    (r) => r.audience.includes(audience) || r.audience.includes('all')
  );
}

/**
 * Get priority badge color
 */
export function getPriorityColor(priority: RecommendationPriority): string {
  const colors: Record<RecommendationPriority, string> = {
    critical: 'destructive',
    high: 'warning',
    medium: 'secondary',
    low: 'outline',
  };
  return colors[priority];
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: RecommendationCategory): string {
  const icons: Record<RecommendationCategory, string> = {
    compliance: 'shield-check',
    risk: 'alert-triangle',
    efficiency: 'zap',
    training: 'graduation-cap',
    prevention: 'shield',
    opportunity: 'trending-up',
  };
  return icons[category];
}

# منهجية بناء "بنك معلومات تفاصيل بطاقة تحليل وتوصيف المهنة" (أهم 50 مهنة)

## الهدف
بناء بطاقات تحليل وتوصيف مهني مؤسسي احترافية متكاملة لأهم 50 مهنة في سوق العمل اليمني، وفق
(أ) أفضل الممارسات العالمية: ISCO-08، ESCO، O*NET، OSHA/NIOSH، SFIA للمهارات.
(ب) القوانين واللوائح اليمنية: قانون العمل رقم 5 لسنة 1995، قانون التأمينات الاجتماعية،
    قوانين المهن والنقابات، لوائح التراخيص المهنية.
قيم التوصيف تقديرية مرجعية (benchmark) معلَّمة أنها تقديرية، بمنهجية تقييم وظيفي موحّدة.

## مخرجات كل مهنة
ست بطاقات (card_type) تُكتب بالعربية في حقل `data` (JSONB) كما في المخطط أدناه.
المسار: profession_analysis_cards (سطر واحد لكل card_type لكل مهنة = 6 أسطر × 50 مهنة = 300 بطاقة).

## معايير الجودة
1. لغة عربية فصيحة مهنية، دقيقة، بلا أرقام تخمينية غير معلّمة.
2. الأرقام (الدرجات، الأجور) تقديرية مرجعية معلَّمة برمز "تقديري".
3. الربط بالقوانين اليمنية بنص/رقم مادة حيث أمكن.
4. لا تكرار بين البطاقات: كل بُعد في مكانه (التصنيف في classification، الأجور/المسار في career_path، المخاطر في risk_profile، اليمننة في yemenization، السوق في gap_analysis، التوظيف في allocation_summary).
5. الاتساق: نفس أسماء الكفايات/المهام تتكرر بنفس الصياغة عبر بطاقات المهنة الواحدة.

## المخطط (data JSONB) لكل card_type

### 1) classification — تصنيف وتوصيف المهنة
{
  "isco": {"code":"<isco>","major_group":<رقم>,"major_group_name_ar":"<الاسم>","skill_level":<1-6>},
  "isic_sectors": ["<before>", ...],
  "summary_ar": "<ملخص في سطرين>",
  "description_ar": "<وصف موسّع فقرتان>",
  "scope": "<عام/خاص/مؤسسي>",
  "family": "<العائلة المهنية>",
  "activity_category": "<فئة النشاط>",
  "syndicate": "<النقابة المرتبطة أو 'لا توجد نقابة متخصصة'>",
  "environment": {"indoor":true/false,"outdoor":true/false,"climate":"<الظروف المناخية>","shift":"<نمط الوردية>","work_hours_per_day":<قيمة>,"max_service_years":<قيمة تقديرية>},
  "work_access": "<وصول لسوق العمل>",
  "tasks": [{"id":1,"task":"<مهمة>","is_critical":true/false}],
  "competencies": {"hard_skills":["<مهارة>"],"soft_skills":["<مهارة>"]},
  "qualifications": {"min_education":"<المؤهل الأدنى>","certification":"<شهادة/رخصة>","training_requirements":"<متطلبات التدريب>","experience_required":"<الخبرة>","pre_work_conditions":"<الشروط القبلية>","onboarding":"<الإدماج>","trial_period":"<فترة التجربة>"},
  "reporting": {"supervision_level":"<مستوى الإشراف>","decision_making_level":"<مستوى صنع القرار>","reporting_structure":"<الهيكل>","team_size":"<حجم الفريق>"},
  "tools_equipment":["<أداة/معدة>"],
  "technology_used":["<تقنية/برنامج>"]
}

### 2) yemenization — اليمننة / فرص التوطين
{
  "yemenization_target_pct": <0-100>,
  "is_restricted_to_nationals": true/false,
  "skills_shortage": "<high/medium/low>",
  "expat_dependency": "<high/medium/low>",
  "training_pathway_ar": "<مسار التطوير لليمنيين>",
  "qualification_recognition_ar": "<اعتراف المؤهلات>",
  "legal_basis_ar": "<النص القانوني: قانون العمل 5/1995 مادة ...>",
  "recommendations_ar":["<توصية>"]
}

### 3) gap_analysis — فجوة المهارات والعرض/الطلب
{
  "market_demand": "<high/medium/low>",
  "supply_balance": "<surplus/balanced/shortage>",
  "skill_gap_level": "<critical/typical/none>",
  "emerging_trends_ar": ["<اتجاه ناشئ>"],
  "future_outlook_ar": "<النظرة المستقبلية (تقديري)>",
  "recommended_investment_ar": ["<استثمار مقترح>"]
}

### 4) career_path — المسار الوظيفي والتدرج
{
  "progression": [
    {"level":1,"title_ar":"<مبتدئ>","years":"<0-2>","salary_range":{"min":<>, "max":<>}},
    {"level":2,"title_ar":"<ممارس>","years":"<2-5>","salary_range":{"min":<>, "max":<>}},
    {"level":3,"title_ar":"<أقدم>","years":"<5-10>","salary_range":{"min":<>, "max":<>}},
    {"level":4,"title_ar":"<خبير/مشرف>","years":"<10+>","salary_range":{"min":<>, "max":<>}}
  ],
  "salary_benchmarks": {"currency":"YER","frequency":"<شهري/يومي>","entry":{"min":<>, "max":<>},"senior":{"min":<>, "max":<>}},
  "advancement_requirements_ar": ["<متطلب ترقٍّ>"],
  "horizontal_moves_ar": ["<انتقال أفقي>"]
}

### 5) risk_profile — ملف المخاطر المهنية والصحة
{
  "hazard_level": "<منخفضة/متوسطة/عالية/حرجة>",
  "job_evaluation_scores": {"skill":<0-100>,"responsibility":<0-100>,"autonomy":<0-100>,"complexity":<0-100>,"hazard":<0-100>,"total":<مجموع>},
  "grade": "<الدرجة الوظيفية>",
  "hazards_ar": ["<خطر>"],
  "potential_injuries_ar": ["<إصابة محتملة>"],
  "occupational_diseases_ar": ["<مرض مهني>"],
  "prevention_ar": ["<إجراء وقائي>"],
  "ppe_ar": ["<معدات وقاية شخصية>"],
  "medical_exams_ar": ["<فحص طبي دوري>"],
  "ergonomic_demands_ar": "<المتطلبات الإرغونومية>",
  "psychological_demands_ar": "<المتطلبات النفسية>"
}

### 6) allocation_summary — خلاصة التوظيف والتخصيص
{
  "priority": <1-50>,
  "sector_priority_ar": "<أولوية القطاع>",
  "employment_tiers_ar": ["<مستوى توظيف>"],
  "contract_types_ar": ["<نوع عقد>"],
  "allowances_ar": ["<بدل>"],
  "overtime_policy_ar": "<سياسة العمل الإضافي>",
  "national_demand_estimate": "<تقدير الطلب الوطني (وصفي)>",
  "salary_grade": "<الدرجة>",
  "benchmark_salary_range": {"min":<>, "max":<>,"currency":"YER"}
}

## مراجع قانونية يمنية يُستخدم نصها/موادها
- قانون العمل رقم 5 لسنة 1995 (مثلاً: المواد الخاصة بساعات العمل الأسبوعية 48 ساعة، الإجازات، السلامة المهنية، إنهاء الخدمة، الحد الأدنى للأجور النسبية). اجعل المرجع عاماً ومحلّياً بارقام المواد الصحيحة المعروفة دون اختلاق أرقام مادية دقيقة غير مؤكدة — صُغ "المادة (راجع قانون العمل اليمني)" عند عدم التأكد.
- قانون التأمينات الاجتماعية (الضمان الاجتماعي).
- قانون النقابات والعمل النقابي، وقانون المهن الحرة حسب القطاع.
- لائحة التراخيص المهنية (نقابة/وزارة).

## معايير الأجور التقديرية (بريال يمني شهرياً — تقديري مرجعي)
- حرف/عمالة عامة: 90,000 – 200,000
- فنيون/حرفيون متوسطون: 180,000 – 400,000
- اختصاصيون/خبراء: 300,000 – 800,000
- إدارة عليا/قادة: 500,000 – 1,500,000+
(قيم مرجعية تقديرية تُعدَّل حسب القطاع والموقع؛ صِغها دائماً كنطاق تقديري.)

## معايير تقييم الوظيفة (درجة 0-100 لكل بُعد)
- skill (المهارة): حسب التعقيد والمؤهل
- responsibility (المسؤولية): حسب الأثر والتبعات
- autonomy (الاستقلالية): حسب حرية القرار
- complexity (التعقيد): حسب تعدد المهام وحل المشكلات
- hazard (الخطر المهني): حسب درجة الخطورة
- total = مجموع الأبعاد الخمسة (0-500)
- grade: أ (400-500) / ب (300-399) / ج (200-299) / د (100-199)

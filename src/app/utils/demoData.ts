/**
 * بيانات تجريبية لوضع Demo
 * يتم استخدامها عند تسجيل الدخول بدون Supabase
 */

export const initDemoData = () => {
  // التحقق من وجود البيانات
  if (localStorage.getItem('demo_data_initialized')) {
    return;
  }

  // نقابات تجريبية
  const demoUnions = [
    {
      id: 'YE-2024-001',
      unionNumber: 'YE-2024-001',
      nameAr: 'نقابة المهندسين اليمنية',
      nameEn: 'Yemen Engineers Syndicate',
      type: 'مهنية',
      structure: 'اتحاد',
      establishDate: '1990-01-15',
      province: 'صنعاء',
      city: 'صنعاء',
      address: 'شارع الزبيري، صنعاء',
      phone: '+967-1-234567',
      email: 'info@engineers.ye',
      website: 'www.engineers.ye',
      presidentName: 'م. عبدالله أحمد',
      presidentPhone: '+967-777-123456',
      memberCount: 15420,
      foundingMembers: 250,
      status: 'نشط',
      registrationDate: '1990-01-15',
      lastUpdate: new Date().toISOString(),
      createdAt: '1990-01-15T00:00:00.000Z',
    },
    {
      id: 'YE-2024-002',
      unionNumber: 'YE-2024-002',
      nameAr: 'نقابة عمال البناء',
      nameEn: 'Construction Workers Union',
      type: 'عمالية',
      structure: 'نقابة',
      establishDate: '1995-03-20',
      province: 'عدن',
      city: 'عدن',
      address: 'شارع المعلا، عدن',
      phone: '+967-2-345678',
      email: 'info@construction.ye',
      website: 'www.construction.ye',
      presidentName: 'أحمد محمد سالم',
      presidentPhone: '+967-733-234567',
      memberCount: 8750,
      foundingMembers: 120,
      status: 'نشط',
      registrationDate: '1995-03-20',
      lastUpdate: new Date().toISOString(),
      createdAt: '1995-03-20T00:00:00.000Z',
    },
    {
      id: 'YE-2024-003',
      unionNumber: 'YE-2024-003',
      nameAr: 'نقابة الأطباء اليمنية',
      nameEn: 'Yemen Doctors Syndicate',
      type: 'مهنية',
      structure: 'اتحاد',
      establishDate: '1985-11-05',
      province: 'صنعاء',
      city: 'صنعاء',
      address: 'شارع حدة، صنعاء',
      phone: '+967-1-456789',
      email: 'info@doctors.ye',
      website: 'www.doctors.ye',
      presidentName: 'د. فاطمة علي',
      presidentPhone: '+967-711-345678',
      memberCount: 12300,
      foundingMembers: 180,
      status: 'نشط',
      registrationDate: '1985-11-05',
      lastUpdate: new Date().toISOString(),
      createdAt: '1985-11-05T00:00:00.000Z',
    },
    {
      id: 'YE-2024-004',
      unionNumber: 'YE-2024-004',
      nameAr: 'نقابة المعلمين',
      nameEn: 'Teachers Union',
      type: 'مهنية',
      structure: 'نقابة',
      establishDate: '1980-09-15',
      province: 'تعز',
      city: 'تعز',
      address: 'شارع جمال، تعز',
      phone: '+967-4-567890',
      email: 'info@teachers.ye',
      website: 'www.teachers.ye',
      presidentName: 'أ. خالد حسن',
      presidentPhone: '+967-770-456789',
      memberCount: 25680,
      foundingMembers: 320,
      status: 'نشط',
      registrationDate: '1980-09-15',
      lastUpdate: new Date().toISOString(),
      createdAt: '1980-09-15T00:00:00.000Z',
    },
    {
      id: 'YE-2024-005',
      unionNumber: 'YE-2024-005',
      nameAr: 'نقابة الصحفيين',
      nameEn: 'Journalists Syndicate',
      type: 'مهنية',
      structure: 'نقابة',
      establishDate: '1992-06-10',
      province: 'صنعاء',
      city: 'صنعاء',
      address: 'شارع الصافية، صنعاء',
      phone: '+967-1-678901',
      email: 'info@journalists.ye',
      website: 'www.journalists.ye',
      presidentName: 'محمد عبدالله',
      presidentPhone: '+967-777-567890',
      memberCount: 3250,
      foundingMembers: 85,
      status: 'نشط',
      registrationDate: '1992-06-10',
      lastUpdate: new Date().toISOString(),
      createdAt: '1992-06-10T00:00:00.000Z',
    },
  ];

  // أعضاء تجريبيين
  const demoMembers = [
    {
      id: '01011234567',
      nationalId: '01011234567',
      fullName: 'أحمد محمد علي',
      gender: 'ذكر',
      birthDate: '1985-05-15',
      phone: '+967-777-111222',
      email: 'ahmed.ali@email.ye',
      address: 'صنعاء - شارع الستين',
      unionId: 'YE-2024-001',
      unionNumber: 'YE-2024-001',
      membershipNumber: 'ENG-2010-001234',
      joinDate: '2010-03-20',
      profession: 'مهندس مدني',
      workplace: 'شركة الإنشاءات اليمنية',
      qualification: 'بكالوريوس هندسة مدنية',
      status: 'نشط',
      createdAt: '2010-03-20T00:00:00.000Z',
    },
    {
      id: '01021234568',
      nationalId: '01021234568',
      fullName: 'فاطمة أحمد حسن',
      gender: 'أنثى',
      birthDate: '1990-08-22',
      phone: '+967-733-222333',
      email: 'fatima.hassan@email.ye',
      address: 'صنعاء - حدة',
      unionId: 'YE-2024-003',
      unionNumber: 'YE-2024-003',
      membershipNumber: 'DOC-2015-005678',
      joinDate: '2015-07-10',
      profession: 'طبيبة',
      workplace: 'مستشفى الثورة',
      qualification: 'دكتوراه طب وجراحة',
      status: 'نشط',
      createdAt: '2015-07-10T00:00:00.000Z',
    },
    {
      id: '01031234569',
      nationalId: '01031234569',
      fullName: 'خالد عبدالله سعيد',
      gender: 'ذكر',
      birthDate: '1982-12-10',
      phone: '+967-770-333444',
      email: 'khaled.saeed@email.ye',
      address: 'تعز - شارع جمال',
      unionId: 'YE-2024-004',
      unionNumber: 'YE-2024-004',
      membershipNumber: 'TCH-2005-009012',
      joinDate: '2005-09-01',
      profession: 'معلم رياضيات',
      workplace: 'مدرسة الأمل الثانوية',
      qualification: 'ماجستير رياضيات',
      status: 'نشط',
      createdAt: '2005-09-01T00:00:00.000Z',
    },
    {
      id: '01041234570',
      nationalId: '01041234570',
      fullName: 'مريم حسين علي',
      gender: 'أنثى',
      birthDate: '1988-04-18',
      phone: '+967-711-444555',
      email: 'mariam.ali@email.ye',
      address: 'عدن - المعلا',
      unionId: 'YE-2024-002',
      unionNumber: 'YE-2024-002',
      membershipNumber: 'CNS-2012-003456',
      joinDate: '2012-11-15',
      profession: 'مهندسة معمارية',
      workplace: 'مكتب الهندسة الحديثة',
      qualification: 'بكالوريوس عمارة',
      status: 'نشط',
      createdAt: '2012-11-15T00:00:00.000Z',
    },
    {
      id: '01051234571',
      nationalId: '01051234571',
      fullName: 'علي حسن محمد',
      gender: 'ذكر',
      birthDate: '1995-02-28',
      phone: '+967-777-555666',
      email: 'ali.hassan@email.ye',
      address: 'صنعاء - الصافية',
      unionId: 'YE-2024-005',
      unionNumber: 'YE-2024-005',
      membershipNumber: 'JRN-2018-007890',
      joinDate: '2018-05-20',
      profession: 'صحفي',
      workplace: 'صحيفة اليمن اليوم',
      qualification: 'بكالوريوس إعلام',
      status: 'نشط',
      createdAt: '2018-05-20T00:00:00.000Z',
    },
  ];

  // حفظ البيانات في localStorage
  localStorage.setItem('demo_unions', JSON.stringify(demoUnions));
  localStorage.setItem('demo_members', JSON.stringify(demoMembers));
  localStorage.setItem('demo_data_initialized', 'true');

  console.log('[Demo] Initialized demo data:', {
    unions: demoUnions.length,
    members: demoMembers.length,
  });
};

export const clearDemoData = () => {
  localStorage.removeItem('demo_unions');
  localStorage.removeItem('demo_members');
  localStorage.removeItem('demo_data_initialized');
  console.log('[Demo] Cleared demo data');
};

export const getDemoUnions = () => {
  const data = localStorage.getItem('demo_unions');
  return data ? JSON.parse(data) : [];
};

export const getDemoMembers = () => {
  const data = localStorage.getItem('demo_members');
  return data ? JSON.parse(data) : [];
};

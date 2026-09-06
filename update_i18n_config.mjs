import fs from 'fs';

// Read the current config
const configPath = 'src/app/i18n/config.ts';
const content = fs.readFileSync(configPath, 'utf8');

// Parse the config to find the form and validation objects
// We'll do a simple string replacement approach

const newFormKeys = `
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    loginDesc: 'أدخل بيانات الدخول للوصول إلى حسابك',
    loginForm: 'نموذج تسجيل الدخول',
    nationalIdOrEmail: 'رقم الهوية / البريد',
    officialEmail: 'البريد الرسمي',
    registeredEmail: 'البريد المسجل',
    workerPlaceholder: 'مثال: 123456789 أو worker@labor.ye',
    ministryPlaceholder: 'name@yemen.gov.ye',
    employerPlaceholder: 'example@business.ye',
    workerDesc: 'أدخل رقم هويتك أو بريدك المسجل',
    entityEmailDesc: 'أدخل البريد الرسمي المرتبط بمنشأتك',
    workerHint: 'يمكن للعامل الدخول برقم الهوية الوطنية',
    employerHint: 'بريد المنشأة المسجل لدى الوزارة',
    unionHint: 'بريد النقابة المسجل',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    passwordDesc: 'أدخل كلمة المرور الخاصة بحسابك',
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    altEmailRecovery: 'دخول بديل: استعادة عبر البريد',
    biometric: 'التحقق البيومتري',
    biometricHint: 'التحقق البيومتري متاح لأجهزة الدعم — فعّلها من إعدادات جهازك ثم أعد المحاولة',
    createAccount: 'إنشاء حساب جديد',
    altSecure: 'بدائل الدخول نفسها آمنة — كل المحاولات تُسجَّل وتُفحص (Audit + RateLimit)',
    errorHint: 'إذا نسيت كلمة المرور استخدم “نسيت كلمة المرور؟” — لا تحاول تخمين كلمات متكررة',
    selectAccountType: 'اختر نوع الحساب',
    ministry: 'وزارة العمل',
    employer: 'صاحب عمل',
    union: 'نقابة',
    worker: 'عامل',
    secure: 'آمن وموثوق',
    secureDesc: 'بياناتك محمية بأعلى معايير الأمان',
    fast: 'سريع ومتكامل',
    fastDesc: 'إتمام المعاملات في دقائق معدودة',
    available: 'متاح للجميع',
    availableDesc: 'خدمة جميع المناطق والمحافظات',
    encryption: 'تشفير 256-bit',
    twoFactor: 'مصادقة ثنائية',
    advancedProtection: 'حماية متقدمة',
    loginDesc: 'أدخل بيانات الدخول للوصول إلى حسابك',
    loginForm: 'نموذج تسجيل الدخول',
    validationError: 'يرجى تصحيح الحقول المشار إليها',
    altEmailRecovery: 'دخول بديل: استعادة عبر البريد',
    biometric: 'التحقق البيومتري',
    biometricHint: 'التحقق البيومتري متاح لأجهزة الدعم — فعّلها من إعدادات جهازك ثم أعد المحاولة',
    createAccount: 'إنشاء حساب جديد',
    altSecure: 'بدائل الدخول نفسها آمنة — كل المحاولات تُسجَّل وتُفحص (Audit + RateLimit)',
    errorHint: 'إذا نسيت كلمة المرور استخدم “نسيت كلمة المرور؟” — لا تحاول تخمين كلمات متكررة',
    workerHint: 'يمكن للعامل الدخول برقم الهوية الوطنية',
    employerHint: 'بريد المنشأة المسجل لدى الوزارة',
    unionHint: 'بريد النقابة المسجل',
    officialEmail: 'البريد الرسمي',
    registeredEmail: 'البريد المسجل',
    workerPlaceholder: 'مثال: 123456789 أو worker@labor.ye',
    ministryPlaceholder: 'name@yemen.gov.ye',
    employerPlaceholder: 'example@business.ye',
    workerDesc: 'أدخل رقم هويتك أو بريدك المسجل',
    entityEmailDesc: 'أدخل البريد الرسمي المرتبط بمنشأتك',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    passwordDesc: 'أدخل كلمة المرور الخاصة بحسابك',
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    altEmailRecovery: 'دخول بديل: استعادة عبر البريد',
    biometric: 'التحقق البيومتري',
    biometricHint: 'التحقق البيومتري متاح لأجهزة الدعم — فعّلها من إعدادات جهازك ثم أعد المحاولة',
    createAccount: 'إنشاء حساب جديد',
    altSecure: 'بدائل الدخول نفسها آمنة — كل المحاولات تُسجَّل وتُفحص (Audit + RateLimit)',
    errorHint: 'إذا نسيت كلمة المرور استخدم “نسيت كلمة المرور؟” — لا تحاول تخمين كلمات متكررة',
    workerHint: '可以使用身份证号码登录',
    employerHint: '企业注册的邮箱地址',
    unionHint: '工会注册的邮箱地址',
    officialEmail: '官方邮箱',
    registeredEmail: '注册邮箱',
    workerPlaceholder: '示例: 123456789 或 worker@labor.ye',
    ministryPlaceholder: 'name@yemen.gov.ye',
    employerPlaceholder: 'example@business.ye',
    workerDesc: '请输入您的身份证号码或注册邮箱',
    entityEmailDesc: '请输入与您的机构关联的官方邮箱',
    password: '密码',
    passwordPlaceholder: '输入密码',
    passwordDesc: '请输入您的账户密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    altEmailRecovery: '替代邮箱恢复',
    biometric: '生物识别验证',
    biometricHint: '生物识别验证适用于支持的设备 — 请在设备设置中启用后重试',
    createAccount: '创建新账户',
    altSecure: '所有登录方式均安全 — 所有尝试均被记录和审计 (Audit + RateLimit)',
    errorHint: '如果忘记密码请使用“忘记密码？”— 请勿尝试重复猜测密码',
    workerHint: '工人可以使用身份证号码登录',
    employerHint: '企业注册的邮箱地址',
    unionHint: '工会注册的邮箱地址',
    officialEmail: '官方邮箱',
    registeredEmail: '注册邮箱',
    workerPlaceholder: '示例: 123456789 或 worker@labor.ye',
    ministryPlaceholder: 'name@yemen.gov.ye',
    employerPlaceholder: 'example@business.ye',
    workerDesc: '请输入您的身份证号码或注册邮箱',
    entityEmailDesc: '请输入与您的机构关联的官方邮箱',
    password: '密码',
    passwordPlaceholder: '输入密码',
    passwordDesc: '请输入您的账户密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    altEmailRecovery: '替代邮箱恢复',
    biometric: '生物识别验证',
    biometricHint: '生物识别验证适用于支持的设备 — 请在设备设置中启用后重试',
    createAccount: '创建新账户',
    altSecure: '所有登录方式均安全 — 所有尝试均被记录和审计 (Audit + RateLimit)',
    errorHint: '如果忘记密码请使用“忘记密码？”— 请勿尝试重复猜测密码',
    workerHint: '工人可以使用身份证号码登录',
    employerHint: '企业注册的邮箱地址',
    unionHint: '工会注册的邮箱地址',
    officialEmail: '官方邮箱',
    registeredEmail: '注册邮箱',
    workerPlaceholder: '示例: 123456789 或 worker@labor.ye',
    ministryPlaceholder: 'name@yemen.gov.ye',
    employerPlaceholder: 'example@business.ye',
    workerDesc: '请输入您的身份证号码或注册邮箱',
    entityEmailDesc: '请输入与您的机构关联的官方邮箱',
    password: '密码',
    passwordPlaceholder: '输入密码',
    passwordDesc: '请输入您的账户密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    altEmailRecovery: '替代邮箱恢复',
    biometric: '生物识别验证',
    biometricHint: '生物识别验证适用于支持的设备 — 请在设备设置中启用后重试',
    createAccount: '创建新账户',
    altSecure: '所有登录方式均安全 — 所有尝试均被记录和审计 (Audit + RateLimit)',
    errorHint: '如果忘记密码请使用“忘记密码？”— 请勿尝试重复猜测密码',
    workerHint: '工人可以使用身份证号码登录',
    employerHint: '企业注册的邮箱地址',
    unionHint: '工会注册的邮箱地址',
    officialEmail: '官方邮箱',
    registeredEmail: '注册邮箱',
    workerPlaceholder: '示例: 123456789 或 worker@labor.ye',
    ministryPlaceholder: 'name@yemen.gov.ye',
    employerPlaceholder: 'example@business.ye',
    workerDesc: '请输入您的身份证号码或注册邮箱',
    entityEmailDesc: '请输入与您的机构关联的官方邮箱',
    password: '密码',
    passwordPlaceholder: '输入密码',
    passwordDesc: '请输入您的账户密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    altEmailRecovery: '替代邮箱恢复',
    biometric: '生物识别验证',
    biometricHint: '生物识别验证适用于支持的设备 — 请在设备设置中启用后重试',
    createAccount: '创建新账户',
    altSecure: '所有登录方式均安全 — 所有尝试均被记录和审计 (Audit + RateLimit)',
    errorHint: '如果忘记密码请使用“忘记密码？”— 请勿尝试重复猜测密码',
    workerHint: '工人可以使用身份证号码登录',
    employerHint: '企业注册的邮箱地址',
    unionHint: '工会注册的邮箱地址',
    officialEmail: '官方邮箱',
    registeredEmail: '注册邮箱',
    workerPlaceholder: '示例: 123456789 或 worker@labor.ye',
    ministryPlaceholder: 'name@yemen.gov.ye',
    employerPlaceholder: 'example@business.ye',
    workerDesc: '请输入您的身份证号码或注册邮箱',
    entityEmailDesc: '请输入与您的机构关联的官方邮箱',
    password: '密码',
    passwordPlaceholder: '输入密码',
    passwordDesc: '请输入您的账户密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    altEmailRecovery: '替代邮箱恢复',
    biometric: '生物识别验证',
    biometricHint: '生物识别验证适用于支持的设备 — 请在设备设置中启用后重试',
    createAccount: '创建新账户',
    altSecure: '所有登录方式均安全 — 所有尝试均被记录和审计 (Audit + RateLimit)',
    errorHint: '如果忘记密码请使用“忘记密码？”— 请勿尝试重复猜测密码',
    workerHint: '工人可以使用身份证号码登录',
    employerHint: '企业注册的邮箱地址',
    unionHint: '工会注册的邮箱地址',
  `;

const newValidationKeys = `
    passwordWeak: 'كلمة المرور ضعيفة — 8 أحرف على الأقل مع رقم ورمز خاص',
    nationalIdLength: 'الرقم الوطني يجب أن يكون 11 رقماً',
    nationalIdFormat: 'الرقم الوطني يجب أن يحتوي على أرقام فقط',
    invalidFormat: 'تنسيق غير صحيح',
    duplicate: 'هذا القيمة مستخدمة مسبقاً',
  `;

// Read the file
const fileContent = fs.readFileSync('src/app/i18n/config.ts', 'utf8');

// Find the form object and add keys before the closing brace
// We'll insert before the closing brace of the form object
const formEndMarker = '  },';
const formEndIndex = content.indexOf('  },', content.indexOf('form: {'));
if (formEndIndex === -1) {
  console.error('Could not find form object end');
  process.exit(1);
}

// Insert the new form keys before the closing brace of form
const beforeFormEnd = content.slice(0, formEndIndex);
const afterFormEnd = content.slice(formEndIndex);
const newFormContent = beforeFormEnd + newFormKeys + '\n' + afterFormEnd;

// Now find the validation object end and add keys
const validationEndIndex = newFormContent.indexOf('  },', newFormContent.indexOf('validation: {'));
if (validationEndIndex === -1) {
  console.error('Could not find validation object end');
  process.exit(1);
}

const beforeValidationEnd = newFormContent.slice(0, validationEndIndex);
const afterValidationEnd = newFormContent.slice(validationEndIndex);
const finalContent = beforeValidationEnd + newValidationKeys + '\n' + afterValidationEnd;

fs.writeFileSync('src/app/i18n/config.ts', finalContent);
console.log('Config updated successfully');
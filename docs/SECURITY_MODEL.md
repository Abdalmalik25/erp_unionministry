# Security Model — UnionSphere Enterprise v2.4.0
> نموذج أمني موحد — يعكس `server/middleware/rbac.js:27` و `src/app/hooks/usePermissions.tsx:94` و `src/app/roles.ts:4`

## 1) مصدر الحقيقة
- **الأدوار:** `src/app/roles.ts:4` `ROLES` 15 دور + `ROLE_ALIASES` — تُستهلك من `server/middleware/rbac.js:5` و `usePermissions`.
- **الصلاحيات:** `usePermissions.tsx:94` `ROLE_PERMISSIONS` 50+ `action:resource` — مرآة الخادم `rbac.js:27` `PERMISSIONS` 30 مفتاح `read:/write:` بعد التوسعة.

## 2) حدود التنفيذ
| المستوى | الآلية | الملف |
|---|---|---|
| **شبكة** | `securityHeaders`, `threatDetection`, `sanitizeBody/Query`, `csrf`, `requireMFA`, `roleRateLimit` | `server/index.js:140` |
| **مصادقة** | `ENABLE_AUTH` fail-closed، `PUBLIC_GET/POST` allowlists، `JWT_SECRET>=32`، `auth_token` + `isSessionActive` | `server/index.js:40`, `AuthContext.tsx:69` |
| **ترخيص** | `requirePermission('read:entities')` يمر فقط `SUPER_ADMIN/MINISTRY_ADMIN` أو `hasPermission` | `rbac.js:68` |
| **ABAC جغرافي** | `requireJurisdiction` — محافظة/مديرية — يقارن `user.governorate` بـ `req.query.governorate` | `rbac.js:81` |
| **واجهة** | `ProtectedRoute` + `PermissionGate` يخفي الزر ويُعيد التوجيه مع `returnTo` + `logAudit GUARD_DENY` | `ProtectedRoute.tsx:29`, `RootLayoutNew.tsx:242` |

## 3) Tanner المصادقة
- `AuthContext.tsx:66 restoreSession` — أولوية `auth_token → /api/auth/me`، لا `demo_user` في `production`.
- `signIn` — `sanitizeInput` + `recordFailedAttempt` + `clearRateLimit` + `logAudit LOGIN_SUCCESS/FAILED`.
- `signOut` — `POST /api/auth/logout` + `destroySession` + إزالة `linked_establishment`.

## 4) التهديدات المغطاة
- **XSS:** `escapeHtml`, `sanitizeUrl`, `sanitizeHtml` + CSP `vercel.json:11` + `vite.config.ts:28` (متطابقة).
- **CSRF:** `csrf` middleware + `credentials: include`.
- **Brute-force:** `roleRateLimit` 60→5000 req/min حسب الدور + `checkRateLimit` في `Login.tsx:264` مع عدّاد.
- **IDOR/تصعيد:** `rbac.js:30` يمنع `REGISTRY_OFFICER` من `write:violations` إلخ.

## 5) الفجوة الموثقة
- `requireJurisdiction` يفحص `req.query` فقط لا `body/path` — ABAC جزئي، مسجل كـ P2 في `PRODUCTION_READINESS.md:20`.
- `PERMISSIONS` 30 من أصل ~311 معالج — الباقي محمي بـ JWT العام + `rateLimit` — توسيع `requirePermission` مسجل في `SECURITY.md`.

## 6) المراجع
- `docs/SECURITY.md` (تفصيلي)، `docs/SECURITY_ASSESSMENT.md`، `PRODUCTION_READINESS.md:20` (مصفوفة القبول).

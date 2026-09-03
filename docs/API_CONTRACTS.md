# API Contracts — UnionSphere Enterprise v2.4.0
> مصدر الحقيقة: `src/app/services/api.ts:15` + `docs/API_INVENTORY.md` + `openapi.yaml` + `server/index.js:140`

## 1. Envelope (unified)
```ts
// src/app/services/api.ts:17 ApiError + src/app/types/api.ts:1
{ success: boolean, data: T, meta?: PaginationMeta, errors?: unknown[], correlationId?: string }
headers: Authorization: Bearer <JWT>, X-Correlation-Id, Idempotency-Key (POST/PUT), If-None-Match (ETag)
```

## 2. Pagination (standard)
`GET /api/<resource>?limit=10&sort=created_at&order=desc&page=1&search=&governorate=`
→ `meta: { total, totalPages, page, limit }` (`PaginationMeta`)

## 3. Auth
- `POST /api/auth/login` → `{ token, user }` + `recordFailedAttempt` + `429` lock 15m
- `GET /api/auth/me` — `Authorization: Bearer`
- `POST /api/auth/logout` — `destroySession`

## 4. RBAC (30 perms)
`requirePermission('read:entities'|'write:violations'|...)` (`rbac.js:27`) — `SUPER_ADMIN/MINISTRY_ADMIN` bypass، الباقي `hasPermission`.

## 5. Examples (verified)
- `GET /api/commercial?limit=15` → `200 { data: CommercialEstablishment[], meta }`
- `POST /api/activities` → `201` + `logAudit create`
- `GET /api/system/branding` → `200 { ministryNameAr, countryAr }` (PublicHome hero)

## 6. Errors
`4xx: { success:false, errors:{ error: "رسالة عربية" } }` + `correlationId` header — لا تسريب `stack`.

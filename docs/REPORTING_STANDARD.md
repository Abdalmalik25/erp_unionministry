# Reporting Standard — UnionSphere Enterprise v2.4.0
> قاعدة: `src/app/components/enterprise/PrintExportManager.tsx:33` + `src/app/components/reports/SmartReportsGenerator.tsx:215` + `src/app/pages/ministry/ReportsManagement.tsx:230`

## 1. Parameters (standard)
كل تقرير: `title, subtitle, reportType, data: Record<string,unknown>[], columns: ReportColumn[]`, `dateFrom/dateTo`, `filters` (governorate, sector, status), `entity?` — كلها `encodeURIComponent` + `limit` + `logAudit export`.

## 2. Columns (typed)
```ts
// PrintExportManager.tsx:33
{ key: string, label: string, width?: number, format?: (val: unknown)=>string }
```
`format` آمن لـ `unknown` — لا `any`.

## 3. Rendering (RTL)
- `GovernmentHeader` + `BrandLogo` + `Cairo/IBM Plex` + `dir=rtl` + `toLocaleString('ar')`.
- `jsPDF + jspdf-autotable` محملة كسولًا (`import()` داخل `exportReportToExcel`) — `vendor-pdf-defer 417k` لا يدخل `modulepreload`.

## 4. Audit & Freshness
- كل تصدير `logAudit({action:'export', resource, details:{count}})` + `reportCache` (TTL) + `SLOReports` 6h scheduler في `server/index.js`.

## 5. KPI (definition → source → formula → display)
كل KPI: `Definition (institutional.ts) → Source (view: ministry_dashboard_stats) → Query (CTE) → Formula (SQL) → Display (GaugeChart/MiniBarChart)` — لا KPI بلا مصدر.

# UX Design Standard — UnionSphere Enterprise v2.4.0
> مصدر: `src/app/components/ui/*` + `src/app/components/ui/primitives/*` + `vitest` + `PublicHome:PublicLayout`

## 1. Tokens (government)
`#0a2540 navy`, `#c9a84c gold`, `#0d9488 teal` — `tailwind.config` + `BrandLogo` — كل `Button/Card/Input` يستخدم `focus-visible:ring-2` + `min-h-44` touch.

## 2. Patterns (enterprise tables)
كل جدول: `server pagination (PAGE_SIZE 6–15) + debounced search (300ms) + filters + sort + column visibility + skeleton + empty (EmptyState) + error (toast+retry) + export (PrintExportManager) + audit`.

## 3. Accessibility (WCAG 2.2 AA target)
- `SkipToContent`, `A11yAnnouncer`, `aria-live="polite/assertive"` (`RootLayout:490`, `PublicLayout:Skip`), `aria-label` لكل أيقونة، `focus-visible:ring`, `role=dialog/region`, `aria-controls/expanded` (`PublicPages:Accordian:48`), `dir=rtl`, `Cairo/IBM Plex`, `min-h-44`.

## 4. Public (premium)
`PublicHome:5 sections` + `PublicHeroSearch` (`datalist` + `Search` icon + `role=search`) + `GlassHeader` (`w-11 h-11` touch, `aria-expanded`) + `PremiumFooter`.

## 5. Interactive Messages
`sonner` (`toast.error/success/info`) + `ConfirmDialog` (`useConfirm`) + `CommandPalette` (`role=dialog`, storage tolerant) — كل فشل يُسجل `logAudit` ولا يكشف `stack`.

## 6. Motion
`motion 12.23` + `transition-all duration-200` — `hover:-translate-y-0.5` موحد، `FloatingParticles useMemo` لتجنب `Math.random` كل render.

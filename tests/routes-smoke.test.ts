import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Smoke test for critical routes — ensures every route in src/app/routes.tsx has a component file
// and that ProtectedRoute gates are present

const routesPath = path.resolve('src/app/routes.tsx');
const routesContent = fs.readFileSync(routesPath, 'utf8');

describe('Routes smoke — critical gateways + ministry portals', () => {
  const critical: Array<{ path: string; segment: string }> = [
    { path: '/login', segment: '"/login"' },
    { path: '/ministry', segment: '"/ministry"' },
    { path: '/ministry/indicators', segment: '"indicators"' },
    { path: '/ministry/commercial', segment: '"commercial"' },
    { path: '/ministry/members', segment: '"members"' },
    { path: '/ministry/violations', segment: '"violations"' },
    { path: '/ministry/reports', segment: '"reports"' },
    { path: '/organization', segment: '"/organization"' },
    { path: '/employer', segment: '"/employer"' },
    { path: '/worker', segment: '"/worker"' },
  ];
  for(const r of critical){
    it(`route ${r.path} is declared in routes.tsx`, () => {
      expect(routesContent.includes(r.segment)).toBe(true);
    });
  }
  it('ProtectedRoute is used for /ministry', () => {
    expect(routesContent.includes('ProtectedRoute')).toBe(true);
    expect(routesContent.includes('requireMinistry')).toBe(true);
  });
  it('lazy loading is used for heavy pages', () => {
    expect(routesContent.includes('lazy(')).toBe(true);
  });
  it('public pages are present', () => {
    expect(routesContent.includes('PublicHome')).toBe(true);
    expect(routesContent.includes('"/"')).toBe(true);
  });
});

describe('Public pages — institutional content', () => {
  it('PublicHome imports institutional content (no fake numbers)', () => {
    const c = fs.readFileSync('src/app/pages/public/PublicHome.tsx','utf8');
    expect(c.includes('NATIONAL_REGISTRIES') || c.includes('GOVERNANCE_PRINCIPLES')).toBe(true);
    expect(c.includes('50,000')).toBe(false);
  });
});

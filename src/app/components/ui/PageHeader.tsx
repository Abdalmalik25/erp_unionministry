/**
 * PageHeader — ترويسة الصفحات الموحّدة
 */
import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

interface Breadcrumb { label: string; to?: string; }

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  badge?: { label: string; color?: string };
}

export function PageHeader({ title, subtitle, actions, breadcrumbs, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronLeft className="w-3 h-3" />}
                {b.to ? (
                  <Link to={b.to} className="hover:text-primary transition-colors">{b.label}</Link>
                ) : (
                  <span className="text-muted-foreground font-medium">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-heading">{title}</h1>
          {badge && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.color || 'bg-info/15 text-info-dark'}`}>
              {badge.label}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

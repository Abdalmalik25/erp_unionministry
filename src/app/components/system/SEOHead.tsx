/**
 * SEO Head — Production-grade meta tag management
 * Lightweight, no external dependencies, full SSR-friendly
 */
import * as React from 'react';
import { useEffect } from 'react';

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile' | 'book';
  locale?: 'ar' | 'en';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogImageWidth?: number;
  ogImageHeight?: number;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  hreflang?: { ar?: string; en?: string };
  schema?: Record<string, unknown> | Record<string, unknown>[];
  themeColor?: string;
}

const SITE_NAME = 'المنظومة الوطنية للعمل';
const SITE_NAME_EN = 'National Labor Platform';
const DEFAULT_TITLE = 'المنظومة الوطنية للعمل | الجمهورية اليمنية';
const DEFAULT_DESCRIPTION =
  'منظومة وطنية شاملة لإدارة العمل والمنشآت والعاملين وفق أحدث المعايير المؤسسية';
const DEFAULT_OG_IMAGE = '/og-default.png';
const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://erp-unionministry.vercel.app';

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name'): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string, attrs: Record<string, string> = {}): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

function removeScript(id: string): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(id);
  if (existing) existing.remove();
}

function injectSchema(schema: Record<string, unknown>, id: string): void {
  if (typeof document === 'undefined') return;
  removeScript(id);
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

export function SEOHead(config: SEOConfig): null {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    keywords = [],
    canonical,
    image = DEFAULT_OG_IMAGE,
    type = 'website',
    locale = 'ar',
    author,
    publishedTime,
    modifiedTime,
    noindex = false,
    nofollow = false,
    ogImageWidth = 1200,
    ogImageHeight = 630,
    twitterCard = 'summary_large_image',
    hreflang,
    schema,
    themeColor = '#0a1428',
  } = config;

  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;
  const fullCanonical = canonical
    ? canonical.startsWith('http')
      ? canonical
      : `${SITE_URL}${canonical}`
    : typeof window !== 'undefined'
      ? window.location.href
      : SITE_URL;

  useEffect(() => {
    // Document title
    document.title = fullTitle;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';

    // Theme color
    setMeta('theme-color', themeColor);

    // Basic meta
    setMeta('description', description);
    if (keywords.length > 0) {
      setMeta('keywords', keywords.join(', '));
    }
    if (author) setMeta('author', author);

    // Robots
    const robots: string[] = [];
    if (noindex) robots.push('noindex');
    if (nofollow) robots.push('nofollow');
    if (robots.length === 0) robots.push('index', 'follow');
    setMeta('robots', robots.join(', '));

    // Canonical
    setLink('canonical', fullCanonical);

    // Open Graph
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:image', fullImage, 'property');
    setMeta('og:image:width', String(ogImageWidth), 'property');
    setMeta('og:image:height', String(ogImageHeight), 'property');
    setMeta('og:url', fullCanonical, 'property');
    setMeta('og:type', type, 'property');
    setMeta('og:site_name', locale === 'ar' ? SITE_NAME : SITE_NAME_EN, 'property');
    setMeta('og:locale', locale === 'ar' ? 'ar_YE' : 'en_US', 'property');

    // Twitter
    setMeta('twitter:card', twitterCard);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', fullImage);

    // Article-specific
    if (type === 'article') {
      if (publishedTime) setMeta('article:published_time', publishedTime, 'property');
      if (modifiedTime) setMeta('article:modified_time', modifiedTime, 'property');
      if (author) setMeta('article:author', author, 'property');
    }

    // hreflang
    if (hreflang?.ar) setLink('alternate', hreflang.ar, { hreflang: 'ar' });
    if (hreflang?.en) setLink('alternate', hreflang.en, { hreflang: 'en' });
    if (hreflang?.ar || hreflang?.en) {
      setLink('alternate', hreflang?.ar || fullCanonical, { hreflang: 'x-default' });
    }

    // JSON-LD schema
    if (schema) {
      const schemas = Array.isArray(schema) ? schema : [schema];
      schemas.forEach((s, i) => injectSchema(s, `ld-json-${i}`));
    }

    // Cleanup on unmount
    return () => {
      if (schema) {
        const schemas = Array.isArray(schema) ? schema : [schema];
        schemas.forEach((_, i) => removeScript(`ld-json-${i}`));
      }
    };
  }, [
    fullTitle,
    description,
    keywords.join(','),
    fullCanonical,
    fullImage,
    type,
    locale,
    author,
    publishedTime,
    modifiedTime,
    noindex,
    nofollow,
    ogImageWidth,
    ogImageHeight,
    twitterCard,
    hreflang?.ar,
    hreflang?.en,
    themeColor,
    JSON.stringify(schema),
  ]);

  return null;
}

// Utility builders for common schema types
export const SchemaBuilders = {
  organization: () => ({
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    logo: `${SITE_URL}/logo_yemen.jpg`,
    sameAs: [],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'YE',
    },
  }),
  website: () => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ['ar', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }),
  breadcrumb: (items: { name: string; url: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  }),
};

export default SEOHead;

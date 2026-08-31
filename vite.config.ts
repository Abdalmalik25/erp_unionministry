import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Enterprise-grade Vite Configuration
 * Union Ministry Management System
 *
 * Features:
 * - Intelligent port allocation with fallback strategy
 * - Optimized chunk splitting for performance
 * - Tailwind CSS v4 with PostCSS integration
 * - PWA support with offline capabilities
 * - Security headers and CSP compliance
 * - Standardized asset handling
 */

const getPort = (): number => {
  const envPort = process.env.PORT
  if (envPort && !isNaN(Number(envPort))) {
    return Number(envPort)
  }
  return 5173
}

const CSP_META = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  // 'unsafe-inline' للأنماط فقط: مكوّنات الواجهة (Radix) تضيف أنماطاً داخلية لا يمكن تجزئتها ثابتةً — الأنماط لا تنفّذ شيفرة
  // الخطوط ذاتية الاستضافة في /fonts — لا مضيفات خارجية للخطوط أو الأنماط
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "object-src 'none'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  // frame-ancestors لا تعمل داخل <meta> — تُفرض عبر ترويسة الاستجابة في الخادم/vercel.json
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')

const injectCsp = () => ({
  name: 'inject-csp-meta',
  transformIndexHtml(html: string, ctx: { server?: object }) {
    if (ctx.server) return html
    return html.replace(
      /<meta name="description"/,
      `<meta http-equiv="Content-Security-Policy" content="${CSP_META}" />\n    <meta name="description"`,
    )
  },
})

/**
 * حزم ثقيلة تُحمَّل كسولًّا داخل دوال التصدير (جُعلت dynamic import في PrintExportManager).
 * نستبعدها من الـ modulepreload لئلّا يُفرَّغ تحميلها عند أول زيارة — يُجلب الأول مرة عند
 * أول طلب تصدير فعلي فقط (يقلل الحجم المُنقَّان في مسار العرض الحرج).
 */
const HEAVY_DEFERRED_CHUNKS = /(vendor-pdf|xlsx|html2canvas)/

const notHeavyDeferred = (
  filename: string,
  deps: Array<string | { file?: string; name?: string }>,
): string[] =>
  deps
    .filter((dep) => {
      const ref = typeof dep === 'string' ? dep : (dep as { file?: string; name?: string }).file ?? (dep as { name?: string }).name ?? ''
      return !HEAVY_DEFERRED_CHUNKS.test(ref)
    })
    .map((dep) => (typeof dep === 'string' ? dep : dep.file ?? dep.name ?? ''))

const getManualChunks = (id: string) => {
  if (id.includes('node_modules')) {
    if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
    if (id.includes('lucide-react') || id.includes('@radix-ui')) return 'vendor-ui'
    if (id.includes('recharts')) return 'vendor-charts'
    if (id.includes('jspdf')) return 'vendor-pdf'
    if (id.includes('@supabase')) return 'vendor-supabase'
    if (id.includes('date-fns')) return 'vendor-utils'
  }
  return undefined
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    injectCsp(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    port: getPort(),
    strictPort: false,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      overlay: true,
    },
  },
  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssCodeSplit: true,
    cssMinify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: false,
    modulePreload: {
      polyfill: false,
      resolveDependencies: notHeavyDeferred,
    },
    rollupOptions: {
      output: {
        manualChunks: getManualChunks,
        experimentalMinChunkSize: 20000,
        // Preserve module names for better long-term caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
      treeshake: {
        moduleSideEffects: (id) => /\.css$/.test(id),
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    chunkSizeWarningLimit: 800,
    // Pre-compress assets for serving via Nginx/CDN
  },
  esbuild: {
    target: 'es2022',
    legalComments: 'none',
    keepNames: false,
    drop: ['debugger', 'console'],
  },
  preview: {
    port: getPort(),
    strictPort: false,
    host: true,
  },
})
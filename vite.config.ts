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
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "object-src 'none'",
  "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
  "worker-src 'self' blob:",
  // frame-ancestors لا تعمل داخل <meta> — تُفرض عبر ترويسة الاستجابة في الخادم/vercel.json
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')

const injectCsp = () => ({
  name: 'inject-csp-meta',
  transformIndexHtml(html: string, ctx: { server?: boolean }) {
    if (ctx.server) return html
    return html.replace(
      /<meta name="description"/,
      `<meta http-equiv="Content-Security-Policy" content="${CSP_META}" />\n    <meta name="description"`,
    )
  },
})

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
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: getManualChunks,
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  preview: {
    port: getPort(),
    strictPort: false,
    host: true,
  },
})
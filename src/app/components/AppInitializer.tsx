import React, { useEffect, useState, createContext, useContext } from 'react'
import { ProgressBar } from './ProgressBar'
import { BRAND } from '../branding'

interface AppInitializerContext {
  isOnline: boolean
  isInstalled: boolean
  isReady: boolean
}

const AppInitializerContext = createContext<AppInitializerContext>({
  isOnline: true,
  isInstalled: false,
  isReady: false,
})

/**
 * مكون تهيئة التطبيق الاحترافي
 * - ين Register Service Worker تلقائيًا
 * - يظهر شريط التقدم أثناء التحميل
 * - يدير حالة الاتصال بالإنترنت
 * - يدعم العمل دون اتصال (Offline First)
 */
export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine ?? true)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // التحقق من التثبيت
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
      }
    }

    checkInstalled()

    // مراقبة الاتصال
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // تسجيل Service Worker
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          })
          console.log('[PWA] Service Worker registered:', registration.scope)
        } catch (error) {
          console.error('[PWA] Service Worker registration failed:', error)
        }
      }
    }

    registerSW()

    // تهيئة التطبيق
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 100)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // إظهار شاشة التحميل المبكر
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-bright/40 border-t-primary-bright rounded-full animate-spin mx-auto mb-4"></div>
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin absolute top-2 left-2 mx-auto"></div>
          </div>
          <h2 className="text-xl font-bold text-heading mb-2">{BRAND.systemName}</h2>
          <p className="text-muted-foreground">جاري التحميل...</p>
          <ProgressBar />
        </div>
      </div>
    )
  }

  return (
    <AppInitializerContext.Provider value={{ isOnline, isInstalled, isReady }}>
      <ProgressBar />
      {children}
    </AppInitializerContext.Provider>
  )
}

export const useAppInitializer = () => useContext(AppInitializerContext)
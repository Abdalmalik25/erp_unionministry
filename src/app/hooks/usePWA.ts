import { useState, useEffect } from 'react'

/**
 * Hook مؤسسي للعمل دون اتصال (PWA)
 * يدير حالة التثبيت والاتصال والتخزين المؤقت
 */
export const usePWA = () => {
  const [isOnline, setIsOnline] = useState(() => {
    return navigator.onLine ?? true
  })
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // مراقبة حالة الاتصال
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // التعامل مع طلب التثبيت
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // التحقق من التثبيت الأولي
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('[PWA] Service Worker registered:', registration.scope)
      return registration
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error)
      return null
    }
  }

  return {
    isOnline,
    isInstalled,
    showInstallPrompt,
    installApp,
    registerServiceWorker,
  }
}
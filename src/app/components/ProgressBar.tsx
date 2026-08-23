import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

/**
 * مكون شريط التقدم الاحترافي للنظام المؤسسي
 * يظهر عند التنقل بين الصفحات وعند التحميل الأولي
 */
export const ProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // بدء التحميل عند تغيير المسار
    setVisible(true)
    setProgress(0)

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer)
          return prev
        }
        return prev + Math.random() * 10
      })
    }, 100)

    // إكمال التحميل
    const completeTimer = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
    }, 500)

    return () => {
      clearInterval(timer)
      clearTimeout(completeTimer)
    }
  }, [location.pathname])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
      <div 
        className="h-full bg-gradient-to-r from-primary-bright via-primary to-primary-dark transition-all duration-300 ease-out shadow-lg"
        style={{ width: `${progress}%` }}
      />
      {/* Glow effect */}
      <div 
        className="absolute top-0 h-4 bg-primary-bright/20 blur-md rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, transform: 'translateY(-1.5px)' }}
      />
    </div>
  )
}
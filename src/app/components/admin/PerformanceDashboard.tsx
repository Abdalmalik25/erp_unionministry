/**
 * Performance Dashboard - Real-time monitoring UI
 * 
 * Features:
 * 1. Core Web Vitals visualization
 * 2. Resource timing breakdown
 * 3. API call latency tracking
 * 4. Cache statistics
 * 5. Performance score with recommendations
 */

import { useState, useEffect, useMemo } from 'react';
import { usePerformanceMetrics } from '../../hooks/usePerformanceMetrics';

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  target?: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  description?: string;
}

function MetricCard({ title, value, unit = 'ms', target, rating, description }: MetricCardProps) {
  const displayRating = rating || (
    target
      ? Number(value) <= target
        ? 'good'
        : Number(value) <= target * 2
          ? 'needs-improvement'
          : 'poor'
      : 'good'
  );

  const colors = {
    good: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-500' },
    'needs-improvement': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-500' },
    poor: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-500' },
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 ${colors[displayRating].border} ${colors[displayRating].bg} transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {target && (
          <span className={`text-xs px-2 py-1 rounded-full ${colors[displayRating].text}`}>
            target: {target}{unit}
          </span>
        )}
      </div>
      <div className={`text-3xl font-bold ${colors[displayRating].text}`}>
        {typeof value === 'number' ? value.toFixed(0) : value}
        <span className="text-base font-normal ml-1">{unit}</span>
      </div>
      {description && (
        <p className="text-xs text-gray-600 mt-2">{description}</p>
      )}
    </div>
  );
}

export function PerformanceDashboard() {
  const { vitals, getSummary, resources, apiCalls } = usePerformanceMetrics();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ name: string; size: number }[]>([]);

  const summary = useMemo(() => getSummary(), [vitals, resources, apiCalls, getSummary]);

  // Get cache statistics from Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_STATUS') {
          setCacheStats(event.data.stats);
        }
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
    }
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleClearCache = async () => {
    if ('serviceWorker' in navigator && confirm('هل تريد حقاً مسح جميع ذاكرة التخزين المؤقت؟')) {
      navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' });
      setCacheStats([]);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">لوحة قياس الأداء</h1>
          <div className="flex gap-2">
            <button
              onClick={handleClearCache}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
            >
              مسح الكاش
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              {isRefreshing ? 'جاري التحديث...' : 'تحديث القياسات'}
            </button>
          </div>
        </div>
        <p className="text-gray-600">مراقبة Core Web Vitals وأداء التطبيق في الزمن الحقيقي</p>
      </div>

      {/* Performance Score */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">نتيجة الأداء الإجمالية</h2>
            <p className="text-gray-700">تقييم شامل بناءً على جميع المقاييس</p>
          </div>
          <div className="text-6xl font-bold">
            <span
              className={
                summary.score >= 90
                  ? 'text-green-600'
                  : summary.score >= 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }
            >
              {summary.score}
            </span>
            <span className="text-2xl text-gray-500">/100</span>
          </div>
        </div>

        {summary.issues.length > 0 && (
          <div className="mt-4 p-3 bg-white/50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">المشاكل المكتشفة:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {summary.issues.map((issue, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.recommendations.length > 0 && (
          <div className="mt-3 p-3 bg-white/50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">التوصيات:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {summary.recommendations.map((rec, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Core Web Vitals Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Core Web Vitals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="LCP - Largest Contentful Paint"
            value={vitals.lcp || 0}
            unit="ms"
            target={2500}
            description="وقت عرض أكبر عنصر مرئي"
          />
          <MetricCard
            title="FID - First Input Delay"
            value={vitals.fid || 0}
            unit="ms"
            target={100}
            description="تأخير الاستجابة لأول تفاعل"
          />
          <MetricCard
            title="CLS - Cumulative Layout Shift"
            value={vitals.cls || 0}
            unit=""
            target={0.1}
            description="استقرار التخطيط البصري"
          />
          <MetricCard
            title="INP - Interaction to Next Paint"
            value={vitals.inp || 0}
            unit="ms"
            target={200}
            description="زمن استجابة التفاعلات"
          />
          <MetricCard
            title="TTFB - Time to First Byte"
            value={vitals.ttfb || 0}
            unit="ms"
            target={800}
            description="وقت وصول أول بايت من الخادم"
          />
          <MetricCard
            title="FCP - First Contentful Paint"
            value={vitals.fcp || 0}
            unit="ms"
            target={1800}
            description="وقت أول محتوى مرئي"
          />
          <MetricCard
            title="TTI - Time to Interactive"
            value={vitals.tti || 0}
            unit="ms"
            target={3800}
            description="وقت التفاعل الكامل"
          />
          <MetricCard
            title="Resources Loaded"
            value={resources.length}
            unit=""
            description="إجمالي الموارد المحملة"
          />
        </div>
      </div>

      {/* Resource Performance */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">أداء الموارد</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المورد</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحجم</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">DNS</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">TTFB</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resources.slice(-20).reverse().map((resource, i) => (
                  <tr key={i} className={resource.duration > 1000 ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
                        {resource.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-md">
                      {resource.name.split('/').pop()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          resource.duration > 1000
                            ? 'text-red-600 font-semibold'
                            : resource.duration > 500
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        }
                      >
                        {resource.duration.toFixed(0)}ms
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {(resource.size / 1024).toFixed(1)}KB
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{resource.dns.toFixed(0)}ms</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{resource.ttfb.toFixed(0)}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* API Latency */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">زمن استجابة API</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {apiCalls.length === 0 ? (
            <p className="text-gray-500 text-center py-4">لا توجد طلبات API حالياً</p>
          ) : (
            <div className="space-y-2">
              {apiCalls.slice(-10).reverse().map((call, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {call.method}
                    </span>
                    <span className="text-sm text-gray-700 mr-2">{call.endpoint}</span>
                    {call.cached && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                        من الكاش
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        call.duration > 2000
                          ? 'text-red-600 font-semibold'
                          : call.duration > 1000
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }
                    >
                      {call.duration}ms
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        call.status >= 200 && call.status < 300
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {call.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cache Stats */}
      {cacheStats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">إحصائيات الكاش</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {cacheStats.map((cache) => (
              <div key={cache.name} className="p-4 bg-white border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">{cache.name}</p>
                <p className="text-2xl font-bold text-gray-900">{cache.size}</p>
                <p className="text-xs text-gray-500">عنصر مخزن</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

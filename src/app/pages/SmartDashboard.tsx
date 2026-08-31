/**
 * SmartDashboard — لوحة القيادة الذكية الموحدة
 * AI-powered insights, real-time data, Arabic-first design
 * Unified view across all portals: Ministry, Organization, Employer, Worker, Union
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/Button';
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, BookOpen, Building2,
  CheckCircle2, ChevronLeft, Clock, FileText, Home, Loader2,
  RefreshCw, Server, Shield, TrendingDown, TrendingUp, User,
  Users, XCircle, Zap, BarChart3, PieChart as PieChartIcon,
  LineChart, Calendar, Filter, Download, Eye, AlertOctagon
} from 'lucide-react';
import {
  getMinistryDashboard, getSystemHealth, getSmartNotifications,
  markNotificationRead, getQuickActionsForRole, formatChartData,
  getRelativeTime
} from '../services/smartDashboardService';
import type { DashboardSummary, SystemHealth, SmartNotification, AIInsight } from '../services/smartDashboardService';
import { useAuth } from '../contexts/AuthContext';

// Simple inline chart components (no external chart library needed)
interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

function MiniBarChart({ data, height = 120 }: { data: BarChartItem[]; height?: number }) {
  const max = Math.max(...data.map((d: BarChartItem) => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d: BarChartItem, i: number) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-muted rounded-t" style={{ height: `${(d.value / max) * height}px` }}>
            <div className="w-full rounded-t transition-all hover:opacity-80" style={{ height: '100%', backgroundColor: d.color || 'var(--primary)' }} />
          </div>
          <span className="text-[9px] text-muted-foreground truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function GaugeChart({ value, label, color = 'emerald' }: { value: number; label: string; color?: string }) {
  const percentage = Math.min(100, Math.max(0, value));
  const colorMap: Record<string, string> = {
    emerald: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    blue: '#3b82f6',
  };
  const strokeColor = colorMap[color] || colorMap.emerald;
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle cx="60" cy="60" r="45" fill="none" stroke={strokeColor} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-all duration-700" />
      </svg>
      <div className="-mt-20 text-center">
        <div className="text-2xl font-black">{value}%</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function TrendIndicator({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{Math.abs(value)}%</span>
      <span className="text-muted-foreground font-normal">{label}</span>
    </div>
  );
}

export default function SmartDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'insights'>('overview');

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const [dashData, healthData, notifData] = await Promise.all([
        getMinistryDashboard(),
        getSystemHealth(),
        getSmartNotifications(),
      ]);
      setDashboard(dashData);
      setHealth(healthData);
      setNotifications(notifData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => loadData(true), 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const quickActions = useMemo(() => {
    return getQuickActionsForRole(user?.role || 'ministry_admin');
  }, [user?.role]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notif: SmartNotification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" dir="rtl">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-sm text-muted-foreground">جاري تحميل لوحة القيادة الذكية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Home className="w-8 h-8" />
            </div>
            <div>
              <div className="text-amber-300 text-xs font-bold flex items-center gap-1">
                <Zap className="w-4 h-4" /> لوحة القيادة الذكية
              </div>
              <h1 className="text-2xl font-black mt-1">
                {user?.name || 'مرحباً بك'} 👋
              </h1>
              <div className="text-sm text-slate-300 mt-0.5">
                آخر تحديث: {new Date().toLocaleTimeString('ar-YE')}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10" onClick={() => loadData(true)} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ml-1 ${refreshing ? 'animate-spin' : ''}`} />تحديث
            </Button>
          </div>
        </div>

        {/* System Health Indicator */}
        {health && (
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <Server className={`w-4 h-4 ${health.status === 'healthy' ? 'text-emerald-400' : health.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`} />
              <span className="text-xs">النظام: {health.status === 'healthy' ? 'سليم' : health.status === 'degraded' ? 'متدهور' : 'حرج'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs">زمن الاستجابة: {health.responseTime}ms</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs">معدل الأخطاء: {health.errorRate}%</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs">وقت التشغيل: {Math.floor(health.uptime / 3600)}س</span>
            </div>
          </div>
        )}
      </div>

      {/* Notifications Banner */}
      {unreadCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="font-bold">{unreadCount} إشعارات غير مقروءة</div>
                <div className="text-xs text-muted-foreground">لديك إشعارات جديدة تحتاج انتباهك</div>
              </div>
            </div>
            <Button size="sm" variant="outline">عرض الكل</Button>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-emerald-600 font-medium">الكيانات النشطة</div>
              <div className="text-3xl font-black text-emerald-700 mt-1">{dashboard?.totalEntities || 0}</div>
              <TrendIndicator value={12} label="هذا الشهر" />
            </div>
            <Building2 className="w-10 h-10 text-emerald-500/50" />
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-600 font-medium">طلبات معلقة</div>
              <div className="text-3xl font-black text-blue-700 mt-1">{dashboard?.pendingRequests || 0}</div>
              <TrendIndicator value={-8} label="مقارنة بالأسبوع" />
            </div>
            <Clock className="w-10 h-10 text-blue-500/50" />
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-600 font-medium">مخالفات مفتوحة</div>
              <div className="text-3xl font-black text-amber-700 mt-1">{dashboard?.openViolations || 0}</div>
              <TrendIndicator value={-15} label="تحسن" />
            </div>
            <AlertTriangle className="w-10 h-10 text-amber-500/50" />
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-rose-600 font-medium">تنبيهات نشطة</div>
              <div className="text-3xl font-black text-rose-700 mt-1">{dashboard?.activeAlerts || 0}</div>
              <TrendIndicator value={3} label="جديدة" />
            </div>
            <Bell className="w-10 h-10 text-rose-500/50" />
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
          { id: 'activity', label: 'النشاط الأخير', icon: Activity },
          { id: 'insights', label: 'رؤى الذكاء', icon: Zap },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Compliance Gauge */}
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-600" /> معدل الامتثال
                    </h3>
                    <Badge className="bg-emerald-100 text-emerald-700">هدف: 85%</Badge>
                  </div>
                  <div className="flex items-center justify-center">
                    <GaugeChart value={dashboard?.charts?.complianceRate?.value || 0} label="معدل الامتثال" color="emerald" />
                  </div>
                </div>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <div className="p-5">
                    <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" /> الكيانات حسب الحالة
                    </h3>
                    <MiniBarChart
                      data={[
                        { label: 'نشط', value: 156, color: '#22c55e' },
                        { label: 'معلق', value: 23, color: '#eab308' },
                        { label: 'موقوف', value: 12, color: '#ef4444' },
                      ]}
                    />
                  </div>
                </Card>

                <Card>
                  <div className="p-5">
                    <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> المخالفات حسب النوع
                    </h3>
                    <MiniBarChart
                      data={[
                        { label: 'بيئية', value: 45, color: '#f97316' },
                        { label: 'أمان', value: 32, color: '#ef4444' },
                        { label: 'صحية', value: 28, color: '#eab308' },
                        { label: 'مالية', value: 15, color: '#3b82f6' },
                      ]}
                    />
                  </div>
                </Card>
              </div>

              {/* AI Insights */}
              {dashboard?.aiInsights && dashboard.aiInsights.length > 0 && (
                <Card>
                  <div className="p-5">
                    <h3 className="font-bold flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-amber-500" /> رؤى الذكاء الاصطناعي
                    </h3>
                    <div className="space-y-3">
                      {dashboard.aiInsights.slice(0, 3).map((insight) => (
                        <div key={insight.id} className={`p-3 rounded-xl border ${
                          insight.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                          insight.type === 'anomaly' ? 'bg-red-50 border-red-200' :
                          insight.type === 'opportunity' ? 'bg-emerald-50 border-emerald-200' :
                          'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-bold text-sm">{insight.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{insight.description}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[10px]">
                                  ثقة: {insight.confidence}%
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${
                                  insight.impact === 'high' ? 'border-red-300 text-red-600' :
                                  insight.impact === 'medium' ? 'border-amber-300 text-amber-600' :
                                  'border-slate-300'
                                }`}>
                                  {insight.impact === 'high' ? 'تأثير عالي' : insight.impact === 'medium' ? 'متوسط' : 'منخفض'}
                                </Badge>
                              </div>
                            </div>
                            {insight.action && insight.action_url && (
                              <a href={insight.action_url || '#'} className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-slate-100 transition">
                                <ChevronLeft className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          {activeTab === 'activity' && (
            <Card>
              <div className="p-5">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-blue-600" /> النشاط الأخير
                </h3>
                <div className="space-y-3">
                  {(dashboard?.recentActivity || []).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.severity === 'critical' ? 'bg-red-100' :
                        activity.severity === 'high' ? 'bg-amber-100' :
                        activity.severity === 'medium' ? 'bg-blue-100' :
                        'bg-slate-100'
                      }`}>
                        {activity.type === 'contract' && <FileText className="w-4 h-4 text-blue-600" />}
                        {activity.type === 'violation' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {activity.type === 'inspection' && <Eye className="w-4 h-4 text-emerald-600" />}
                        {activity.type === 'complaint' && <XCircle className="w-4 h-4 text-red-600" />}
                        {activity.type === 'registration' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {activity.type === 'renewal' && <Clock className="w-4 h-4 text-slate-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm">{activity.title}</div>
                        <div className="text-xs text-muted-foreground">{activity.description}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {getRelativeTime(activity.timestamp)}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {activity.entity_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'insights' && (
            <Card>
              <div className="p-5">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-amber-500" /> جميع رؤى الذكاء الاصطناعي
                </h3>
                <div className="space-y-4">
                  {(dashboard?.aiInsights || []).map((insight) => (
                    <div key={insight.id} className="border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                            {insight.type === 'anomaly' && <AlertOctagon className="w-4 h-4 text-red-600" />}
                            {insight.type === 'opportunity' && <TrendingUp className="w-4 h-4 text-emerald-600" />}
                            {insight.type === 'trend' && <BarChart3 className="w-4 h-4 text-blue-600" />}
                            {insight.type === 'recommendation' && <Zap className="w-4 h-4 text-amber-500" />}
                            <span className="font-bold">{insight.title}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">{insight.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge>ثقة: {insight.confidence}%</Badge>
                        <Badge variant="outline">{insight.category}</Badge>
                        <Badge variant="outline" className={
                          insight.impact === 'high' ? 'border-red-300 text-red-600' :
                          insight.impact === 'medium' ? 'border-amber-300 text-amber-600' : ''
                        }>
                          {insight.impact}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <div className="p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" /> إجراءات سريعة
              </h3>
              <div className="space-y-2">
                {quickActions.slice(0, 6).map((action) => (
                  <a
                    key={action.id}
                    href={action.url}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-[10px] text-muted-foreground">{action.description}</div>
                    </div>
                    {action.badge !== undefined && action.badge > 0 && (
                      <Badge variant="destructive" className="text-[10px]">{action.badge}</Badge>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600" /> الإشعارات
                </h3>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{unreadCount}</Badge>
                )}
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {notifications.slice(0, 5).map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-right p-3 rounded-lg transition ${
                      notif.read ? 'bg-slate-50' : 'bg-amber-50 border border-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        notif.priority === 'urgent' ? 'bg-red-500' :
                        notif.priority === 'high' ? 'bg-amber-500' :
                        notif.priority === 'medium' ? 'bg-blue-500' :
                        'bg-slate-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{notif.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{notif.message}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {getRelativeTime(notif.timestamp)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* System Info */}
          <Card className="bg-slate-900 text-white">
            <div className="p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <Server className="w-4 h-4" /> معلومات النظام
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">الإصدار</span>
                  <span className="font-mono">v2.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">وقت التشغيل</span>
                  <span>{health ? Math.floor(health.uptime / 3600) + ' ساعة' : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">حجم الذاكرة المؤقتة</span>
                  <span>{health ? Math.round(health.cacheHitRate) + '%' : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الإنتاج</span>
                  <Badge variant="outline" className="text-[10px] border-white/30 text-white">نشط</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

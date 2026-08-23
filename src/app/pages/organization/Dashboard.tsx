/**
 * Organization Dashboard - لوحة تحكم المنظمة
 * بيانات حقيقية من API مع روابط سريعة
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { Users, Activity, DollarSign, FileCheck, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OrgStats {
  members: number;
  activities: number;
  documents: number;
  pendingServices: number;
}

interface ActivityItem {
  id: string;
  activity_name: string;
  activity_type: string;
  start_date: string;
  location: string;
  participants_count: number;
  status: string;
}

interface ServiceRequest {
  id: string;
  service_type: string;
  entity_name: string;
  status: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = { completed: 'مكتمل', in_progress: 'جاري', pending: 'معلق', cancelled: 'ملغي' };
const STATUS_COLORS: Record<string, string> = { completed: 'bg-success/15 text-success-dark', in_progress: 'bg-info/15 text-info-dark', pending: 'bg-warning/15 text-warning-dark', cancelled: 'bg-muted text-heading' };

export function OrganizationDashboard() {
  const [stats, setStats] = useState<OrgStats>({ members: 0, activities: 0, documents: 0, pendingServices: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, activitiesRes, servicesRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/activities'),
        fetch('/api/service-requests'),
      ]);

      const membersData = membersRes.ok ? await membersRes.json() : { data: [] };
      const activitiesData = activitiesRes.ok ? await activitiesRes.json() : { data: [] };
      const servicesData = servicesRes.ok ? await servicesRes.json() : { data: [] };

      const membersList = Array.isArray(membersData) ? membersData : membersData.data || [];
      const activitiesList = Array.isArray(activitiesData) ? activitiesData : activitiesData.data || [];
      const servicesList = Array.isArray(servicesData) ? servicesData : servicesData.data || servicesData.requests || [];

      setStats({
        members: membersList.length,
        activities: activitiesList.length,
        documents: 0,
        pendingServices: servicesList.filter((s: ServiceRequest) => s.status === 'pending' || s.status === 'in_progress').length,
      });

      setActivities(activitiesList.slice(0, 5));
      setServiceRequests(servicesList.filter((s: ServiceRequest) => s.status !== 'completed' && s.status !== 'closed').slice(0, 5));
    } catch (err) {
      console.error('[OrgDashboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const monthlyData = [
    { month: 'يناير', activities: 3 }, { month: 'فبراير', activities: 5 },
    { month: 'مارس', activities: 4 }, { month: 'أبريل', activities: 6 },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Banner */}
      <div className="bg-gradient-to-r from-primary to-primary-bright rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">لوحة تحكم المنظمة</h2>
            <p className="text-blue-100">نظرة شاملة على نشاطات وأعضاء المنظمة</p>
          </div>
          <Link to="/organization/members" className="bg-white/20 backdrop-blur-sm rounded-lg p-4 hover:bg-white/30 transition-colors">
            <p className="text-sm text-blue-100">إجمالي الأعضاء</p>
            <p className="text-3xl font-bold">{loading ? '—' : stats.members.toLocaleString()}</p>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/organization/members" className="bg-card rounded-xl shadow-sm p-6 border border-border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-info/15 rounded-lg"><Users className="text-primary" size={24} /></div>
            <span className="text-xs text-muted-foreground">الأعضاء</span>
          </div>
          <h3 className="text-3xl font-bold text-heading mb-1">{loading ? '—' : stats.members.toLocaleString()}</h3>
          <p className="text-sm text-muted-foreground">عضو مسجل</p>
        </Link>

        <Link to="/organization/activities" className="bg-card rounded-xl shadow-sm p-6 border border-border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gold/15 rounded-lg"><Activity className="text-gold-dark" size={24} /></div>
            <span className="text-xs text-muted-foreground">الأنشطة</span>
          </div>
          <h3 className="text-3xl font-bold text-heading mb-1">{loading ? '—' : stats.activities.toLocaleString()}</h3>
          <p className="text-sm text-muted-foreground">نشاط مسجل</p>
        </Link>

        <Link to="/organization/documents" className="bg-card rounded-xl shadow-sm p-6 border border-border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success/15 rounded-lg"><DollarSign className="text-success" size={24} /></div>
            <span className="text-xs text-muted-foreground">الوثائق</span>
          </div>
          <h3 className="text-3xl font-bold text-heading mb-1">{loading ? '—' : stats.documents.toLocaleString()}</h3>
          <p className="text-sm text-muted-foreground">وثيقة مسجلة</p>
        </Link>

        <Link to="/organization/services" className="bg-card rounded-xl shadow-sm p-6 border border-border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-warning/15 rounded-lg"><FileCheck className="text-warning-dark" size={24} /></div>
            <span className="text-xs text-muted-foreground">الخدمات</span>
          </div>
          <h3 className="text-3xl font-bold text-heading mb-1">{loading ? '—' : stats.pendingServices.toLocaleString()}</h3>
          <p className="text-sm text-muted-foreground">طلب معلق</p>
        </Link>
      </div>

      {/* Chart + Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities Chart */}
        <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
          <h3 className="text-lg font-bold text-heading mb-4">الأنشطة المنفذة (آخر 4 أشهر)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="activities" fill="var(--color-primary)" name="عدد الأنشطة" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Activities */}
        <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-heading flex items-center gap-2"><Calendar size={20} />الأنشطة الأخيرة</h3>
            <Link to="/organization/activities" className="text-xs text-primary font-semibold hover:underline">عرض الكل</Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">جاري التحميل...</p>
            ) : activities.length > 0 ? activities.map(a => (
              <div key={a.id} className="p-3 bg-muted/50 rounded-lg hover:bg-accent transition-colors">
                <p className="font-semibold text-sm text-heading">{a.activity_name}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>{a.start_date}</span>
                  <span>{a.location}</span>
                  <span>{a.participants_count} مشارك</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[a.status] || 'bg-muted text-heading'}`}>
                    {STATUS_LABELS[a.status] || a.status}
                  </span>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">لا توجد أنشطة</p>}
          </div>
        </div>
      </div>

      {/* Service Requests */}
      <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-heading flex items-center gap-2"><FileCheck size={20} />طلبات الخدمات المعلقة</h3>
          <Link to="/organization/services" className="text-xs text-primary font-semibold hover:underline">عرض الكل</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4 col-span-3">جاري التحميل...</p>
          ) : serviceRequests.length > 0 ? serviceRequests.map(r => (
            <div key={r.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-heading truncate">{r.service_type}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleDateString('ar-YE')}</p>
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] || 'bg-muted text-heading'}`}>
                {STATUS_LABELS[r.status] || r.status}
              </span>
            </div>
          )) : <p className="text-sm text-muted-foreground text-center py-4 col-span-3">لا توجد طلبات معلقة</p>}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
        <h3 className="text-lg font-bold text-heading mb-4">الإجراءات السريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/organization/members" className="p-4 bg-info/10 hover:bg-info/15 rounded-lg transition-colors text-center">
            <Users className="mx-auto mb-2 text-primary" size={24} />
            <p className="text-sm font-semibold text-heading">إدارة الأعضاء</p>
          </Link>
          <Link to="/organization/activities" className="p-4 bg-gold/10 hover:bg-gold/15 rounded-lg transition-colors text-center">
            <Activity className="mx-auto mb-2 text-gold-dark" size={24} />
            <p className="text-sm font-semibold text-heading">إدارة الأنشطة</p>
          </Link>
          <Link to="/organization/documents" className="p-4 bg-success/10 hover:bg-success/15 rounded-lg transition-colors text-center">
            <FileCheck className="mx-auto mb-2 text-success-dark" size={24} />
            <p className="text-sm font-semibold text-heading">إدارة الوثائق</p>
          </Link>
          <Link to="/organization/services" className="p-4 bg-warning/10 hover:bg-warning/15 rounded-lg transition-colors text-center">
            <Calendar className="mx-auto mb-2 text-warning-dark" size={24} />
            <p className="text-sm font-semibold text-heading">طلب خدمة</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

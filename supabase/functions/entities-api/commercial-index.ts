/**
 * Commercial Entities API - الواصلة البرمجية للمنشآت التجارية
 * UnionSphere Enterprise - الوزارة of الشؤون الاجتماعية والعمل
 */

import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from '../server/kv_store.tsx';

// ============================================
// Commercial Establishments Endpoints
// ============================================

async function handleGetCommercial(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sector = url.searchParams.get('sector');
    const classification = url.searchParams.get('classification');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    const establishments = await kv.getByPrefix('commercial:');
    
    // تطبيق الفلاتر
    let filtered = establishments;
    
    if (sector) {
      filtered = filtered.filter((e: any) => e.sector === sector);
    }
    if (classification) {
      filtered = filtered.filter((e: any) => e.classification === classification);
    }
    if (status) {
      filtered = filtered.filter((e: any) => e.status === status);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((e: any) => 
        e.nameAr?.toLowerCase().includes(searchLower) ||
        e.nameEn?.toLowerCase().includes(searchLower) ||
        e.unifiedCode?.toLowerCase().includes(searchLower) ||
        e.commercialRegisterNumber?.toLowerCase().includes(searchLower)
      );
    }
    
    // تطبيق الترقيم
    const startIndex = (page - 1) * limit;
    const paginatedData = filtered.slice(startIndex, startIndex + limit);
    
    return new Response(JSON.stringify({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching commercial establishments:', error);
    return new Response(JSON.stringify({ error: 'خطأ في جلب البيانات' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetCommercialById(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    
    const result = await kv.get(`commercial:${id}`);
    
    if (!result) {
      return new Response(JSON.stringify({ error: 'المنشأة غير موجودة' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching establishment:', error);
    return new Response(JSON.stringify({ error: 'خطأ في جلب البيانات' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleCreateCommercial(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    
    // التحقق من الحقول المطلوبة
    const requiredFields = ['nameAr', 'unifiedCode', 'commercialRegisterNumber'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(JSON.stringify({ error: `الحقل ${field} مطلوب` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    const id = `commercial:${body.unifiedCode || crypto.randomUUID()}`;
    const establishment = {
      ...body,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(id, establishment);
    
    return new Response(JSON.stringify({ success: true, data: establishment }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating establishment:', error);
    return new Response(JSON.stringify({ error: 'خطأ في إنشاء المنشأة' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleUpdateCommercial(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').slice(-2, -1)[0];
    const body = await req.json();
    
    const existing = await kv.get(`commercial:${id}`);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'المنشأة غير موجودة' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const updated = {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`commercial:${id}`, updated);
    
    return new Response(JSON.stringify({ success: true, data: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating establishment:', error);
    return new Response(JSON.stringify({ error: 'خطأ في تحديث المنشأة' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleDeleteCommercial(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').slice(-2, -1)[0];
    
    const existing = await kv.get(`commercial:${id}`);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'المنشأة غير موجودة' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    await kv.del(id);
    
    return new Response(JSON.stringify({ success: true, message: 'تم حذف المنشأة بنجاح' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting establishment:', error);
    return new Response(JSON.stringify({ error: 'خطأ في حذف المنشأة' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ============================================
// Branches Endpoints
// ============================================

async function handleGetBranches(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const establishmentId = url.pathname.split('/')[3];
    const branches = await kv.getByPrefix(`branch:${establishmentId}:`);
    return new Response(JSON.stringify({ branches }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'خطأ في جلب الفروع' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleCreateBranch(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const establishmentId = url.pathname.split('/')[3];
    const body = await req.json();
    
    const branchId = `branch:${establishmentId}:${body.branchId || crypto.randomUUID()}`;
    const branch = {
      ...body,
      id: branchId,
      establishmentId,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(branchId, branch);
    
    return new Response(JSON.stringify({ success: true, data: branch }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'خطأ في إنشاء الفرع' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ============================================
// Equipment Endpoints
// ============================================

async function handleGetEquipment(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const establishmentId = url.pathname.split('/')[3];
    const equipment = await kv.getByPrefix(`equipment:${establishmentId}:`);
    return new Response(JSON.stringify({ equipment }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'خطأ في جلب المعدات' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleCreateEquipment(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const establishmentId = url.pathname.split('/')[3];
    const body = await req.json();
    
    const equipmentId = `equipment:${establishmentId}:${body.equipmentId || crypto.randomUUID()}`;
    const equipment = {
      ...body,
      id: equipmentId,
      establishmentId,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(equipmentId, equipment);
    
    return new Response(JSON.stringify({ success: true, data: equipment }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'خطأ في إنشاء المعدف' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ============================================
// Warehouses Endpoints
// ============================================

async function handleGetWarehouses(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const establishmentId = url.pathname.split('/')[3];
    const warehouses = await kv.getByPrefix(`warehouse:${establishmentId}:`);
    return new Response(JSON.stringify({ warehouses }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'خطأ في جلب المخازن' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ============================================
// Contracts Endpoints
// ============================================

async function handleGetContracts(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const establishmentId = url.pathname.split('/')[3];
    const contracts = await kv.getByPrefix(`contract:${establishmentId}:`);
    return new Response(JSON.stringify({ contracts }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'خطأ في جلب العقود' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ============================================
// Statistics Endpoint
// ============================================

async function handleGetStats(): Promise<Response> {
  try {
    const establishments = await kv.getByPrefix('commercial:');
    
    const stats = {
      total: establishments.length,
      byStatus: establishments.reduce((acc: any, e: any) => {
        acc[e.status || 'unknown'] = (acc[e.status || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      bySector: establishments.reduce((acc: any, e: any) => {
        acc[e.sector || 'unknown'] = (acc[e.sector || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      byClassification: establishments.reduce((acc: any, e: any) => {
        acc[e.classification || 'unknown'] = (acc[e.classification || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
    };
    
    return new Response(JSON.stringify({ stats }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'خطأ في جلب الإحصائيات' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ============================================
// Export Endpoint
// ============================================

async function handleExport(): Promise<Response> {
  try {
    const establishments = await kv.getByPrefix('commercial:');
    
    return new Response(JSON.stringify({ 
      data: establishments,
      exportedAt: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'خطأ في التصدير' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ============================================
// Main Handler
// ============================================

serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // Security Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };

  // Handle OPTIONS for CORS
  if (method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    let response: Response;
    
    if (method === 'GET' && path === '/api/commercial') {
      response = await handleGetCommercial(req);
    } else if (method === 'GET' && path.match(/^\/api\/commercial\/[^/]+$/)) {
      response = await handleGetCommercialById(req);
    } else if (method === 'POST' && path === '/api/commercial') {
      response = await handleCreateCommercial(req);
    } else if (method === 'PUT' && path.match(/^\/api\/commercial\/[^/]+$/)) {
      response = await handleUpdateCommercial(req);
    } else if (method === 'DELETE' && path.match(/^\/api\/commercial\/[^/]+$/)) {
      response = await handleDeleteCommercial(req);
    } else if (method === 'GET' && path.endsWith('/branches')) {
      response = await handleGetBranches(req);
    } else if (method === 'POST' && path.endsWith('/branches')) {
      response = await handleCreateBranch(req);
    } else if (method === 'GET' && path.endsWith('/equipment')) {
      response = await handleGetEquipment(req);
    } else if (method === 'POST' && path.endsWith('/equipment')) {
      response = await handleCreateEquipment(req);
    } else if (method === 'GET' && path.endsWith('/warehouses')) {
      response = await handleGetWarehouses(req);
    } else if (method === 'GET' && path.endsWith('/contracts')) {
      response = await handleGetContracts(req);
    } else if (method === 'GET' && path === '/api/commercial/stats') {
      response = await handleGetStats();
    } else if (method === 'GET' && path === '/api/commercial/export') {
      response = await handleExport();
    } else {
      response = new Response(JSON.stringify({ error: 'المسار غير موجود' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add security headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'خطأ داخلي في الخادم' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
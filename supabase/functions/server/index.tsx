import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-c73879ee/health", (c) => {
  return c.json({ status: "ok" });
});

// Initialize sample data
app.post("/make-server-c73879ee/init-data", async (c) => {
  try {
    // Sample unions
    const sampleUnions = [
      {
        unionNumber: 'YE-2024-001',
        nameAr: 'نقابة المهندسين اليمنية',
        nameEn: 'Yemen Engineers Syndicate',
        type: 'مهنية',
        structure: 'اتحاد',
        establishDate: '1990-01-15',
        province: 'صنعاء',
        status: 'نشط',
      },
      {
        unionNumber: 'YE-2024-002',
        nameAr: 'نقابة عمال البناء',
        nameEn: 'Construction Workers Union',
        type: 'عمالية',
        structure: 'نقابة',
        establishDate: '1995-03-20',
        province: 'عدن',
        status: 'نشط',
      },
      {
        unionNumber: 'YE-2024-003',
        nameAr: 'نقابة الأطباء',
        nameEn: 'Doctors Syndicate',
        type: 'مهنية',
        structure: 'اتحاد',
        establishDate: '1985-11-05',
        province: 'صنعاء',
        status: 'نشط',
      },
    ];

    for (const union of sampleUnions) {
      await kv.set(`union:${union.unionNumber}`, { ...union, createdAt: new Date().toISOString() });
    }

    // Sample members
    const sampleMembers = [
      {
        nationalId: '01011234567',
        fullName: 'أحمد محمد علي',
        gender: 'ذكر',
        unionNumber: 'YE-2024-001',
        profession: 'مهندس مدني',
        status: 'نشط',
      },
      {
        nationalId: '01021234568',
        fullName: 'فاطمة أحمد حسن',
        gender: 'أنثى',
        unionNumber: 'YE-2024-003',
        profession: 'طبيبة',
        status: 'نشط',
      },
    ];

    for (const member of sampleMembers) {
      await kv.set(`member:${member.nationalId}`, { ...member, createdAt: new Date().toISOString() });
    }

    return c.json({ success: true, message: 'تم إضافة البيانات الأولية بنجاح' });
  } catch (error) {
    console.log(`Init data error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Authentication routes
app.post("/make-server-c73879ee/auth/signup", async (c) => {
  try {
    const { email, password, name, role, organizationId } = await c.req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, organizationId },
      email_confirm: true,
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role,
      organizationId,
      createdAt: new Date().toISOString()
    });

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log(`Signup exception: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Create demo users (للاختبار فقط)
app.post("/make-server-c73879ee/auth/create-demo-users", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const demoUsers = [
      {
        email: 'ministry@yemen.gov.ye',
        password: 'Ministry@2026',
        name: 'محمد أحمد الوزير',
        role: 'وزارة',
        organizationId: null
      },
      {
        email: 'engineers@union.ye',
        password: 'Engineers@2026',
        name: 'علي حسن المهندس',
        role: 'نقابة',
        organizationId: 'YE-2024-001'
      }
    ];

    const createdUsers = [];

    for (const user of demoUsers) {
      // حذف المستخدم إذا كان موجود
      try {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers.users.find(u => u.email === user.email);
        if (existing) {
          await supabase.auth.admin.deleteUser(existing.id);
        }
      } catch (e) {
        console.log(`Could not delete existing user: ${e}`);
      }

      // إنشاء المستخدم
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        user_metadata: {
          name: user.name,
          role: user.role,
          organizationId: user.organizationId
        },
        email_confirm: true,
      });

      if (error) {
        console.log(`Error creating user ${user.email}: ${error.message}`);
        continue;
      }

      await kv.set(`user:${data.user.id}`, {
        id: data.user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: new Date().toISOString()
      });

      createdUsers.push({
        email: user.email,
        password: user.password,
        name: user.name,
        role: user.role
      });
    }

    return c.json({
      success: true,
      message: 'تم إنشاء المستخدمين التجريبيين بنجاح',
      users: createdUsers
    });
  } catch (error) {
    console.log(`Create demo users error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all unions
app.get("/make-server-c73879ee/unions", async (c) => {
  try {
    const unions = await kv.getByPrefix("union:");
    return c.json({ unions });
  } catch (error) {
    console.log(`Get unions error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Create union
app.post("/make-server-c73879ee/unions", async (c) => {
  try {
    const unionData = await c.req.json();
    const id = `union:${unionData.unionNumber}`;
    await kv.set(id, { ...unionData, createdAt: new Date().toISOString() });
    return c.json({ success: true, union: unionData });
  } catch (error) {
    console.log(`Create union error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Update union
app.put("/make-server-c73879ee/unions/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const unionData = await c.req.json();
    const existing = await kv.get(`union:${id}`);
    if (!existing) {
      return c.json({ error: "Union not found" }, 404);
    }
    await kv.set(`union:${id}`, { ...existing, ...unionData, updatedAt: new Date().toISOString() });
    return c.json({ success: true });
  } catch (error) {
    console.log(`Update union error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all members
app.get("/make-server-c73879ee/members", async (c) => {
  try {
    const members = await kv.getByPrefix("member:");
    return c.json({ members });
  } catch (error) {
    console.log(`Get members error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Create member
app.post("/make-server-c73879ee/members", async (c) => {
  try {
    const memberData = await c.req.json();
    const id = `member:${memberData.nationalId}`;
    await kv.set(id, { ...memberData, createdAt: new Date().toISOString() });
    return c.json({ success: true, member: memberData });
  } catch (error) {
    console.log(`Create member error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get activities
app.get("/make-server-c73879ee/activities", async (c) => {
  try {
    const activities = await kv.getByPrefix("activity:");
    return c.json({ activities });
  } catch (error) {
    console.log(`Get activities error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Create activity
app.post("/make-server-c73879ee/activities", async (c) => {
  try {
    const activityData = await c.req.json();
    const id = `activity:${Date.now()}`;
    await kv.set(id, { ...activityData, createdAt: new Date().toISOString() });
    return c.json({ success: true, activity: activityData });
  } catch (error) {
    console.log(`Create activity error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get service requests
app.get("/make-server-c73879ee/service-requests", async (c) => {
  try {
    const requests = await kv.getByPrefix("service-request:");
    return c.json({ requests });
  } catch (error) {
    console.log(`Get service requests error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Create service request
app.post("/make-server-c73879ee/service-requests", async (c) => {
  try {
    const requestData = await c.req.json();
    const id = `service-request:${Date.now()}`;
    await kv.set(id, { ...requestData, createdAt: new Date().toISOString(), status: 'pending' });
    return c.json({ success: true, request: requestData });
  } catch (error) {
    console.log(`Create service request error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
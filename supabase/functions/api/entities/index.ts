/**
 * Entities API - واجهة برمط الكيانات
 * UnionSphere Platform - وزارة الشؤون الاجتماعية والعمل
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_ANON_KEY') || '',
  {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  }
);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);

    // GET /entities - الحصول على الكيانات
    if (req.method === 'GET' && path.length <= 1) {
      const { data, error } = await supabase
        .from('organizational_entities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /entities/:id - الحصول على كيان محدد
    if (req.method === 'GET' && path.length === 2) {
      const { data, error } = await supabase
        .from('organizational_entities')
        .select('*')
        .eq('entity_id', path[1])
        .single();

      if (error) throw error;
      
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
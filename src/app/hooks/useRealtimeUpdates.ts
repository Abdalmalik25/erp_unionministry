/**
 * Realtime Updates Hook - تحديثات فورية
 * الاستماع للتحديثات الفورية من Supabase
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from '../components/ui/Toast';

// التحقق من صحة إعدادات Supabase قبل الاتصال
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isRealtimeEnabled = import.meta.env.VITE_ENABLE_REALTIME === 'true';

// إنشاء عميل Supabase فقط إذا كانت الإعدادات صالحة
const supabase = supabaseUrl && supabaseKey && isRealtimeEnabled
  ? createClient(supabaseUrl, supabaseKey)
  : null;

interface RealtimeConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
  showToast?: boolean;
}

/**
 * Hook للاستماع للتحديثات الفورية مع حماية من فشل WebSocket
 */
export function useRealtimeUpdates(config: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // التحقق من صحة إعدادات Supabase
    if (!supabase) {
      console.warn('[Realtime] Supabase client not configured, skipping realtime connection');
      console.info('[Realtime] To enable realtime, set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_ENABLE_REALTIME in .env');
      setIsConnected(false);
      return;
    }

    const channel = supabase
      .channel(`realtime:${config.table}`)
      .on(
        'postgres_changes',
        {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
          filter: config.filter,
        },
        (payload) => {
          console.log('[Realtime] Change received:', payload);

          setLastUpdate(new Date());

          // استدعاء Callbacks المناسبة
          if (payload.eventType === 'INSERT' && config.onInsert) {
            config.onInsert(payload.new);
          } else if (payload.eventType === 'UPDATE' && config.onUpdate) {
            config.onUpdate(payload.new);
          } else if (payload.eventType === 'DELETE' && config.onDelete) {
            config.onDelete(payload.old);
          }

          if (config.onChange) {
            config.onChange(payload);
          }

          // إظهار Toast
          if (config.showToast) {
            const messages = {
              INSERT: 'تمت إضافة عنصر جديد',
              UPDATE: 'تم تحديث عنصر',
              DELETE: 'تم حذف عنصر',
            };

            toast.info(messages[payload.eventType] || 'حدث تحديث');
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
      setIsConnected(false);
    };
  }, [
    config.table,
    config.event,
    config.filter,
    config.onInsert,
    config.onUpdate,
    config.onDelete,
    config.onChange,
    config.showToast,
  ]);

  return {
    isConnected,
    lastUpdate,
  };
}

/**
 * Hook للاستماع لتحديثات قائمة معينة
 */
export function useRealtimeList<T>(
  table: string,
  initialData: T[] = []
) {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const handleInsert = useCallback((newItem: T) => {
    setData((prev) => [...prev, newItem]);
  }, []);

  const handleUpdate = useCallback((updatedItem: T & { id: string }) => {
    setData((prev) =>
      prev.map((item: any) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    );
  }, []);

  const handleDelete = useCallback((deletedItem: { id: string }) => {
    setData((prev) => prev.filter((item: any) => item.id !== deletedItem.id));
  }, []);

  const { isConnected, lastUpdate } = useRealtimeUpdates({
    table,
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    showToast: true,
  });

  // تحديث البيانات
  const refresh = useCallback(async () => {
    if (!supabase) {
      console.warn('[Realtime] Cannot refresh data - Supabase client not configured');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: newData, error } = await supabase
        .from(table)
        .select('*');

      if (error) throw error;
      setData(newData || []);
    } catch (error) {
      console.error('[Realtime] Refresh error:', error);
      toast.error('فشل تحديث البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [table]);

  // جلب البيانات أول مرة
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    setData,
    isConnected,
    lastUpdate,
    isLoading,
    refresh,
  };
}

/**
 * Hook للاستماع لتحديثات عنصر واحد
 */
export function useRealtimeItem<T>(
  table: string,
  id: string,
  initialData: T | null = null
) {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = useCallback((updatedItem: T) => {
    setData(updatedItem);
  }, []);

  const handleDelete = useCallback(() => {
    setData(null);
    toast.warning('تم حذف هذا العنصر');
  }, []);

  const { isConnected, lastUpdate } = useRealtimeUpdates({
    table,
    filter: `id=eq.${id}`,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
  });

  // تحديث البيانات
  const refresh = useCallback(async () => {
    if (!supabase) {
      console.warn('[Realtime] Cannot refresh item - Supabase client not configured');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: newData, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setData(newData);
    } catch (error) {
      console.error('[Realtime] Refresh error:', error);
      toast.error('فشل تحديث البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [table, id]);

  return {
    data,
    setData,
    isConnected,
    lastUpdate,
    isLoading,
    refresh,
  };
}

/**
 * Hook للاستماع لعدد غير مقروء (مثل الإشعارات)
 */
export function useRealtimeCount(
  table: string,
  filter?: string
) {
  const [count, setCount] = useState(0);

  const handleInsert = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  const handleDelete = useCallback(() => {
    setCount((prev) => Math.max(0, prev - 1));
  }, []);

  const { isConnected } = useRealtimeUpdates({
    table,
    filter,
    onInsert: handleInsert,
    onDelete: handleDelete,
  });

  // تحديث العدد
  const refresh = useCallback(async () => {
    if (!supabase) {
      return;
    }

    try {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });

      if (filter) {
        const [column, value] = filter.split('=eq.');
        query = query.eq(column, value);
      }

      const { count: newCount, error } = await query;

      if (error) throw error;
      setCount(newCount || 0);
    } catch (error) {
      console.error('[Realtime] Count refresh error:', error);
    }
  }, [table, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    count,
    isConnected,
    refresh,
  };
}

/**
 * Hook للبث المباشر (Broadcast)
 */
export function useBroadcast(channelName: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        console.log('[Broadcast] Message received:', payload);
        setMessages((prev) => [...prev, payload]);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
      setIsConnected(false);
    };
  }, [channelName]);

  const send = useCallback(
    async (message: any) => {
      if (!supabase) {
        console.warn('[Broadcast] Cannot send - Supabase client not configured');
        return;
      }

      const channel = supabase.channel(channelName);
      await channel.send({
        type: 'broadcast',
        event: 'message',
        payload: message,
      });
    },
    [channelName]
  );

  return {
    messages,
    send,
    isConnected,
  };
}

/**
 * Hook للوجود (Presence) - من متصل الآن
 */
export function usePresence(channelName: string, userId: string, userInfo: any) {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[Presence] User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[Presence] User left:', leftPresences);
      })
      .subscribe(async (status) => {
        setIsConnected(status === 'SUBSCRIBED');

        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            ...userInfo,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (supabase) {
        const channel = supabase.channel(channelName);
        channel.untrack();
        supabase.removeChannel(channel);
      }
      setIsConnected(false);
    };
  }, [channelName, userId, userInfo]);

  return {
    onlineUsers,
    isConnected,
  };
}
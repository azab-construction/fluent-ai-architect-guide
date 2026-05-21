import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Clock, XCircle, Activity } from 'lucide-react';

interface LogRow {
  id: string;
  operation: string | null;
  model: string;
  status: string;
  summary: string | null;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  operation: 'vision' | 'docint' | 'search' | string;
  limit?: number;
}

const statusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:   { label: 'قيد الانتظار', cls: 'bg-muted text-foreground',                       icon: <Clock className="w-3 h-3" /> },
  running:   { label: 'قيد التنفيذ',  cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  succeeded: { label: 'نجحت',         cls: 'bg-green-500/15 text-green-600 border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
  success:   { label: 'نجحت',         cls: 'bg-green-500/15 text-green-600 border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:    { label: 'فشلت',         cls: 'bg-destructive/15 text-destructive border-destructive/30', icon: <XCircle className="w-3 h-3" /> },
  error:     { label: 'فشلت',         cls: 'bg-destructive/15 text-destructive border-destructive/30', icon: <XCircle className="w-3 h-3" /> },
};

export const LiveOperationStatus: React.FC<Props> = ({ operation, limit = 5 }) => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(user?.id ?? null);
      if (!user) return;
      const { data } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('operation', operation)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (mounted && data) setRows(data as LogRow[]);
    })();
    return () => { mounted = false; };
  }, [operation, limit]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`ai-logs-${operation}-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ai_usage_logs', filter: `user_id=eq.${userId}` },
        (payload) => {
          const r = (payload.new || payload.old) as LogRow;
          if (!r || r.operation !== operation) return;
          setRows(prev => {
            const filtered = prev.filter(x => x.id !== r.id);
            if (payload.eventType === 'DELETE') return filtered;
            return [r, ...filtered].slice(0, limit);
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, operation, limit]);

  if (rows.length === 0) {
    return (
      <Card className="p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Activity className="w-3 h-3" /> لا توجد عمليات بعد — سيتم عرض الحالة لحظياً
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <div className="text-xs font-medium mb-2 flex items-center gap-2">
        <Activity className="w-3 h-3" /> الحالة اللحظية ({rows.length})
      </div>
      <div className="space-y-1.5">
        {rows.map(r => {
          const m = statusMeta[r.status] || statusMeta.pending;
          return (
            <div key={r.id} className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className={`gap-1 ${m.cls}`}>{m.icon}{m.label}</Badge>
              <span className="text-muted-foreground truncate flex-1" dir="ltr">{r.model}</span>
              {r.latency_ms != null && <span className="text-muted-foreground">{r.latency_ms}ms</span>}
              {r.summary && <span className="text-muted-foreground truncate max-w-[40%]" title={r.summary}>{r.summary}</span>}
              {r.error_message && <span className="text-destructive truncate max-w-[40%]" title={r.error_message}>{r.error_message}</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default LiveOperationStatus;

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LiveOperationStatus } from '@/components/azure/LiveOperationStatus';

const MaintenanceSearch = () => {
  const { toast } = useToast();
  const [index, setIndex] = useState(localStorage.getItem('alazab_search_index') || '');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [top, setTop] = useState(10);
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!index || !q) return toast({ title: 'أدخل اسم الفهرس والاستعلام', variant: 'destructive' });
    localStorage.setItem('alazab_search_index', index);
    setLoading(true); setRes(null);
    try {
      const body: any = { index, query: q, top };
      if (filter) body.filter = filter;
      const { data, error } = await supabase.functions.invoke('azure-search', { body });
      if (error) throw error;
      setRes(data);
    } catch (e: any) { toast({ title: 'فشل', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">بحث طلبات الصيانة</h1>
            <p className="text-sm text-muted-foreground">بحث داخل 4,700+ طلب صيانة وملفات المشاريع عبر Azure Cognitive Search</p>
          </div>

          <Card className="p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>اسم الفهرس</Label>
                <Input value={index} onChange={e => setIndex(e.target.value)} placeholder="maintenance-requests" dir="ltr" />
              </div>
              <div>
                <Label>عدد النتائج</Label>
                <Input type="number" min={1} max={50} value={top} onChange={e => setTop(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>الاستعلام</Label>
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="مثال: تسريب مياه فرع المعادي" onKeyDown={e => e.key === 'Enter' && run()} />
            </div>
            <div>
              <Label>فلتر OData (اختياري)</Label>
              <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="branch eq 'maadi' and status eq 'open'" dir="ltr" />
            </div>
            <Button onClick={run} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              بحث
            </Button>
          </Card>

          {res && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">عدد النتائج: {res.results?.length || 0}</p>
              {res.results?.map((r: any, i: number) => (
                <Card key={i} className="p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">#{i + 1}</Badge>
                    {r['@search.score'] && <span className="text-xs text-muted-foreground">score: {r['@search.score'].toFixed(3)}</span>}
                  </div>
                  <pre className="text-xs whitespace-pre-wrap break-all bg-muted/30 p-2 rounded">{JSON.stringify(r, null, 2)}</pre>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSearch;

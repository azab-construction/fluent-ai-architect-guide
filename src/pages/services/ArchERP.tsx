import React, { useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Sparkles, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Unit {
  id: string;
  name: string;
  type: string; // door, cabinet, panel...
  length: number; // mm
  width: number;
  thickness: number;
  qty: number;
  woodType: string; // MDF, Oak, Beech
  pricePerM3: number; // EGP
}

const newUnit = (): Unit => ({
  id: crypto.randomUUID(), name: '', type: 'باب', length: 2100, width: 900,
  thickness: 45, qty: 1, woodType: 'MDF', pricePerM3: 18000,
});

const calc = (u: Unit) => {
  const vol = (u.length / 1000) * (u.width / 1000) * (u.thickness / 1000) * u.qty; // m³
  const area = (u.length / 1000) * (u.width / 1000) * u.qty; // m²
  const cost = vol * u.pricePerM3;
  return { vol, area, cost };
};

const ArchERP = () => {
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>([newUnit()]);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => units.reduce((acc, u) => {
    const c = calc(u);
    return { vol: acc.vol + c.vol, area: acc.area + c.area, cost: acc.cost + c.cost };
  }, { vol: 0, area: 0, cost: 0 }), [units]);

  const upd = (id: string, k: keyof Unit, v: any) => setUnits(us => us.map(u => u.id === id ? { ...u, [k]: v } : u));
  const del = (id: string) => setUnits(us => us.filter(u => u.id !== id));

  const analyze = async () => {
    setLoading(true); setAnalysis('');
    try {
      const summary = units.map(u => { const c = calc(u); return `${u.name || u.type}: ${u.length}×${u.width}×${u.thickness}mm × ${u.qty} (${u.woodType}) → ${c.vol.toFixed(3)} م³، ${c.cost.toLocaleString()} ج.م`; }).join('\n');
      const { data, error } = await supabase.functions.invoke('azure-ai-chat', {
        body: {
          model: 'gpt-5',
          messages: [
            { role: 'system', content: 'أنت مهندس تصنيع خشبي في شركة العزب. حلّل قائمة الوحدات: اقترح تحسينات تقليل الفاقد، اختيار الخامة، ومراجعة التسعير. كن مختصراً وعملياً.' },
            { role: 'user', content: `الوحدات:\n${summary}\n\nالإجماليات: ${totals.vol.toFixed(3)} م³، ${totals.area.toFixed(2)} م²، ${totals.cost.toLocaleString()} ج.م` },
          ],
        },
      });
      if (error) throw error;
      setAnalysis(data?.content || '');
    } catch (e: any) { toast({ title: 'فشل', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const exportCsv = () => {
    const header = 'name,type,length_mm,width_mm,thickness_mm,qty,wood,price_per_m3,volume_m3,area_m2,cost_egp\n';
    const rows = units.map(u => { const c = calc(u); return [u.name, u.type, u.length, u.width, u.thickness, u.qty, u.woodType, u.pricePerM3, c.vol.toFixed(4), c.area.toFixed(2), c.cost.toFixed(2)].join(','); }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'arch-erp.csv'; a.click();
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Arch ERP — حساب الوحدات الخشبية</h1>
            <p className="text-sm text-muted-foreground">نموذج هندسي مخصص لمنظومة العزب: حساب الحجم، المساحة، التكلفة، وتحليل بـAI</p>
          </div>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">الوحدات ({units.length})</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2"><Download className="w-4 h-4" />CSV</Button>
                <Button size="sm" onClick={() => setUnits([...units, newUnit()])} className="gap-2"><Plus className="w-4 h-4" />إضافة</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>طول (مم)</TableHead>
                    <TableHead>عرض (مم)</TableHead>
                    <TableHead>سُمك (مم)</TableHead>
                    <TableHead>كمية</TableHead>
                    <TableHead>خامة</TableHead>
                    <TableHead>سعر/م³</TableHead>
                    <TableHead>م³</TableHead>
                    <TableHead>تكلفة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map(u => {
                    const c = calc(u);
                    return (
                      <TableRow key={u.id}>
                        <TableCell><Input value={u.name} onChange={e => upd(u.id, 'name', e.target.value)} className="h-8 w-28" placeholder="باب رئيسي" /></TableCell>
                        <TableCell><Input value={u.type} onChange={e => upd(u.id, 'type', e.target.value)} className="h-8 w-24" /></TableCell>
                        <TableCell><Input type="number" value={u.length} onChange={e => upd(u.id, 'length', +e.target.value)} className="h-8 w-20" /></TableCell>
                        <TableCell><Input type="number" value={u.width} onChange={e => upd(u.id, 'width', +e.target.value)} className="h-8 w-20" /></TableCell>
                        <TableCell><Input type="number" value={u.thickness} onChange={e => upd(u.id, 'thickness', +e.target.value)} className="h-8 w-16" /></TableCell>
                        <TableCell><Input type="number" value={u.qty} onChange={e => upd(u.id, 'qty', +e.target.value)} className="h-8 w-14" /></TableCell>
                        <TableCell>
                          <select value={u.woodType} onChange={e => upd(u.id, 'woodType', e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
                            <option>MDF</option><option>HDF</option><option>زان</option><option>أرو</option><option>صنوبر</option>
                          </select>
                        </TableCell>
                        <TableCell><Input type="number" value={u.pricePerM3} onChange={e => upd(u.id, 'pricePerM3', +e.target.value)} className="h-8 w-24" /></TableCell>
                        <TableCell className="text-xs font-mono">{c.vol.toFixed(4)}</TableCell>
                        <TableCell className="text-xs font-mono">{c.cost.toLocaleString()}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => del(u.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4"><Label className="text-xs">إجمالي الحجم</Label><p className="text-2xl font-bold">{totals.vol.toFixed(3)} م³</p></Card>
            <Card className="p-4"><Label className="text-xs">إجمالي المساحة</Label><p className="text-2xl font-bold">{totals.area.toFixed(2)} م²</p></Card>
            <Card className="p-4"><Label className="text-xs">إجمالي التكلفة</Label><p className="text-2xl font-bold">{totals.cost.toLocaleString()} ج.م</p></Card>
          </div>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">تحليل AI</h3>
              <Button onClick={analyze} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                حلّل بـAI
              </Button>
            </div>
            {analysis && <Textarea value={analysis} readOnly className="min-h-[200px]" />}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ArchERP;

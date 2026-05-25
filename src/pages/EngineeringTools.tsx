import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Box, FileText, Calculator, Save, Loader2, FileDown } from 'lucide-react';
import { exportQuotePdf } from '@/lib/quote-pdf';
import { Model3DViewer } from '@/components/engineering/Model3DViewer';
import { DXFViewer } from '@/components/engineering/DXFViewer';
import { calcQuoteItems, totals, QuoteSpecs } from '@/lib/quote-utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EngineeringTools = () => {
  const { toast } = useToast();

  // 3D
  const [model3D, setModel3D] = useState<{ url: string; ext: string } | null>(null);
  // DXF
  const [dxfText, setDxfText] = useState<string | null>(null);

  // Quote
  const [customer, setCustomer] = useState('');
  const [specs, setSpecs] = useState<QuoteSpecs>({
    unitType: 'باب خشبي', woodType: 'MDF', length: 2100, width: 900, thickness: 45, finishing: 'دوكو',
  });
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(18000);
  const [saving, setSaving] = useState(false);

  const items = calcQuoteItems(specs, qty, price);
  const t = totals(items);

  const on3D = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!['glb', 'gltf', 'obj', 'stl'].includes(ext)) {
      toast({ title: 'صيغة غير مدعومة', description: 'استخدم GLB/GLTF/OBJ/STL', variant: 'destructive' });
      return;
    }
    if (model3D?.url) URL.revokeObjectURL(model3D.url);
    setModel3D({ url: URL.createObjectURL(f), ext });
  };

  const onDXF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'dxf') {
      toast({ title: 'يدعم DXF فقط', description: 'لملفات DWG حوّلها إلى DXF أولاً', variant: 'destructive' });
      return;
    }
    setDxfText(await f.text());
  };

  const saveQuote = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('سجّل الدخول أولاً');
      const { error } = await supabase.from('quotes').insert({
        user_id: user.id,
        customer_name: customer || null,
        unit_type: specs.unitType,
        specs: specs as any,
        items: items as any,
        subtotal: t.subtotal, tax: t.tax, total: t.total,
        currency: 'EGP', status: 'draft',
      });
      if (error) throw error;
      toast({ title: 'تم حفظ عرض السعر' });
    } catch (e: any) {
      toast({ title: 'فشل الحفظ', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl font-bold">الأدوات الهندسية</h1>
            <p className="text-sm text-muted-foreground">عارض 3D، عارض DXF، حاسبة الوحدات الخشبية وعروض الأسعار</p>
          </div>

          <Tabs defaultValue="3d">
            <TabsList>
              <TabsTrigger value="3d" className="gap-2"><Box className="w-4 h-4" /> عارض 3D</TabsTrigger>
              <TabsTrigger value="dxf" className="gap-2"><FileText className="w-4 h-4" /> DXF / AutoCAD</TabsTrigger>
              <TabsTrigger value="quote" className="gap-2"><Calculator className="w-4 h-4" /> عرض سعر</TabsTrigger>
            </TabsList>

            <TabsContent value="3d" className="space-y-3">
              <Card className="p-4 space-y-3">
                <Label>ارفع ملف 3D (GLB / GLTF / OBJ / STL)</Label>
                <Input type="file" accept=".glb,.gltf,.obj,.stl" onChange={on3D} />
                {model3D && <Model3DViewer url={model3D.url} ext={model3D.ext} />}
              </Card>
            </TabsContent>

            <TabsContent value="dxf" className="space-y-3">
              <Card className="p-4 space-y-3">
                <Label>ارفع ملف DXF (تصديره من AutoCAD)</Label>
                <Input type="file" accept=".dxf" onChange={onDXF} />
                {dxfText && <DXFViewer text={dxfText} />}
              </Card>
            </TabsContent>

            <TabsContent value="quote" className="space-y-3">
              <Card className="p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label>اسم العميل</Label><Input value={customer} onChange={e => setCustomer(e.target.value)} /></div>
                  <div><Label>نوع الوحدة</Label><Input value={specs.unitType} onChange={e => setSpecs({ ...specs, unitType: e.target.value })} /></div>
                  <div><Label>نوع الخشب</Label><Input value={specs.woodType} onChange={e => setSpecs({ ...specs, woodType: e.target.value })} /></div>
                  <div><Label>التشطيب</Label><Input value={specs.finishing} onChange={e => setSpecs({ ...specs, finishing: e.target.value })} /></div>
                  <div><Label>الطول (mm)</Label><Input type="number" value={specs.length} onChange={e => setSpecs({ ...specs, length: +e.target.value })} /></div>
                  <div><Label>العرض (mm)</Label><Input type="number" value={specs.width} onChange={e => setSpecs({ ...specs, width: +e.target.value })} /></div>
                  <div><Label>السماكة (mm)</Label><Input type="number" value={specs.thickness} onChange={e => setSpecs({ ...specs, thickness: +e.target.value })} /></div>
                  <div><Label>الكمية</Label><Input type="number" value={qty} onChange={e => setQty(+e.target.value)} /></div>
                  <div><Label>سعر المتر المكعب (EGP)</Label><Input type="number" value={price} onChange={e => setPrice(+e.target.value)} /></div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium mb-2">بنود عرض السعر</h3>
                <div className="space-y-1 text-sm">
                  {items.map((it, i) => (
                    <div key={i} className="flex justify-between border-b py-1">
                      <span>{it.description} × {it.qty}</span>
                      <span className="font-mono">{it.total.toLocaleString()} EGP</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2"><span>المجموع الفرعي</span><span className="font-mono">{t.subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>الضريبة (14%)</span><span className="font-mono">{t.tax.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-1 border-t"><span>الإجمالي</span><Badge className="text-base">{t.total.toLocaleString()} EGP</Badge></div>
                </div>
                <Button className="mt-3 gap-2" onClick={saveQuote} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ عرض السعر
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EngineeringTools;

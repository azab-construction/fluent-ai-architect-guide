import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Sparkles, RefreshCw, Download, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import jsPDF from 'jspdf';

interface Party { role: string; name: string; id?: string; address?: string }
interface Contract { id: string; title: string; template: string; content: string; created_at: string }

const TEMPLATES = [
  { value: 'employment', label: 'عقد عمل' },
  { value: 'contracting', label: 'عقد مقاولة هندسية' },
  { value: 'nda', label: 'اتفاقية سرية (NDA)' },
  { value: 'quote', label: 'عرض سعر رسمي' },
  { value: 'delivery', label: 'مذكرة تسليم' },
  { value: 'custom', label: 'مستند مخصص' },
];

const ContractsGenerator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [template, setTemplate] = useState('employment');
  const [title, setTitle] = useState('عقد عمل');
  const [parties, setParties] = useState<Party[]>([
    { role: 'الطرف الأول (صاحب العمل)', name: '' },
    { role: 'الطرف الثاني (العامل)', name: '' },
  ]);
  const [fields, setFields] = useState('');
  const [extraClauses, setExtraClauses] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Contract[]>([]);
  const [tab, setTab] = useState('form');

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('contracts').select('id,title,template,content,created_at')
      .order('created_at', { ascending: false }).limit(30);
    setHistory((data as Contract[]) || []);
  };
  useEffect(() => { loadHistory(); }, [user]);

  const generate = async () => {
    if (!title.trim()) return toast({ title: 'أدخل عنوان المستند', variant: 'destructive' });
    setLoading(true); setError('');
    try {
      const fieldsObj: Record<string, string> = {};
      fields.split('\n').forEach(line => {
        const [k, ...rest] = line.split(':');
        if (k && rest.length) fieldsObj[k.trim()] = rest.join(':').trim();
      });
      const { data, error: fnErr } = await supabase.functions.invoke('contract-generate', {
        body: {
          template, title,
          parties: parties.filter(p => p.name.trim()),
          fields: fieldsObj,
          extra_clauses: extraClauses.trim() || undefined,
        },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setContent(data.content || '');
      setTab('preview');
      toast({ title: 'تم توليد المستند' });
    } catch (e: any) {
      setError(e.message); toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const save = async () => {
    if (!user || !content) return;
    setSaving(true);
    const { error: dbErr } = await supabase.from('contracts').insert({
      user_id: user.id, template, title, content,
      parties: parties.filter(p => p.name.trim()) as any,
      metadata: { fields, extra_clauses: extraClauses } as any,
    });
    setSaving(false);
    if (dbErr) {
      toast({ title: 'فشل الحفظ', description: dbErr.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحفظ في السجل' });
      loadHistory();
    }
  };

  const downloadPdf = () => {
    if (!content) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(title, 196, 18, { align: 'right' });
    doc.setDrawColor(245, 191, 35); doc.setLineWidth(0.8); doc.line(14, 22, 196, 22);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 196, 30, { align: 'right', maxWidth: 180 });
    doc.save(`${title.replace(/\s+/g, '_')}-${Date.now()}.pdf`);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title.replace(/\s+/g, '_')}-${Date.now()}.md`;
    a.click(); URL.revokeObjectURL(url);
  };

  const updateParty = (i: number, field: keyof Party, v: string) => {
    setParties(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: v } : p));
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ai-primary to-ai-accent flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">مولد العقود والمستندات</h1>
                <p className="text-xs text-muted-foreground">صياغة عقود واتفاقيات احترافية بالعربية باستخدام الذكاء الاصطناعي</p>
              </div>
            </div>
            <Button onClick={generate} disabled={loading} size="sm">
              {loading ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Sparkles className="w-4 h-4 ml-2" />}
              {loading ? 'جاري التوليد...' : 'توليد المستند'}
            </Button>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="form">1. البيانات</TabsTrigger>
              <TabsTrigger value="preview" disabled={!content}>2. المعاينة والتصدير</TabsTrigger>
              <TabsTrigger value="history">3. السجل ({history.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">نوع المستند والعنوان</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>نوع المستند</Label>
                      <Select value={template} onValueChange={setTemplate}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TEMPLATES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>عنوان المستند</Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">الأطراف</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setParties(p => [...p, { role: `طرف ${p.length + 1}`, name: '' }])}>
                    <Plus className="w-3.5 h-3.5 ml-1" /> إضافة طرف
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parties.map((p, i) => (
                    <div key={i} className="grid md:grid-cols-4 gap-2 items-end p-3 border rounded-md">
                      <div className="md:col-span-1">
                        <Label className="text-xs">الصفة</Label>
                        <Input value={p.role} onChange={e => updateParty(i, 'role', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">الاسم</Label>
                        <Input value={p.name} onChange={e => updateParty(i, 'name', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">رقم الهوية</Label>
                        <Input value={p.id || ''} onChange={e => updateParty(i, 'id', e.target.value)} />
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1">
                          <Label className="text-xs">العنوان</Label>
                          <Input value={p.address || ''} onChange={e => updateParty(i, 'address', e.target.value)} />
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setParties(prev => prev.filter((_, idx) => idx !== i))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">الحقول والبنود</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">الحقول (سطر لكل حقل بصيغة: المفتاح: القيمة)</Label>
                    <Textarea
                      value={fields} onChange={e => setFields(e.target.value)}
                      rows={5}
                      placeholder={`تاريخ البداية: 2026/07/01\nالراتب: 15000 جنيه شهرياً\nمدة العقد: سنة قابلة للتجديد\nمكان العمل: القاهرة`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">بنود إضافية (اختياري)</Label>
                    <Textarea
                      value={extraClauses} onChange={e => setExtraClauses(e.target.value)}
                      rows={3}
                      placeholder="مثال: شرط عدم المنافسة لمدة سنتين بعد انتهاء العقد..."
                    />
                  </div>
                </CardContent>
              </Card>

              {error && <ErrorState message={error} onRetry={generate} />}
            </TabsContent>

            <TabsContent value="preview" className="mt-4 space-y-3">
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={downloadMarkdown}>
                  <Download className="w-4 h-4 ml-2" /> Markdown
                </Button>
                <Button variant="outline" size="sm" onClick={downloadPdf}>
                  <Download className="w-4 h-4 ml-2" /> PDF
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  <Save className="w-4 h-4 ml-2" /> {saving ? 'جاري الحفظ...' : 'حفظ في السجل'}
                </Button>
              </div>
              <Card className="p-8 bg-white text-black min-h-[800px]" dir="rtl">
                <div className="max-w-3xl mx-auto whitespace-pre-wrap leading-loose text-[15px]" style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}>
                  <h1 className="text-2xl font-bold text-center mb-6 pb-3 border-b-2" style={{ borderColor: '#f5bf23' }}>{title}</h1>
                  {content}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {history.length === 0 ? (
                <EmptyState icon={FileText} title="لا توجد مستندات محفوظة بعد" description="ابدأ بتوليد مستند وحفظه ليظهر هنا." />
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {history.map(c => (
                    <Card key={c.id} className="p-4 cursor-pointer hover:bg-accent/50" onClick={() => { setTitle(c.title); setTemplate(c.template); setContent(c.content); setTab('preview'); }}>
                      <h4 className="font-semibold text-sm truncate">{c.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {TEMPLATES.find(t => t.value === c.template)?.label || c.template} ·{' '}
                        {new Date(c.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ContractsGenerator;

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Sparkles, RefreshCw, Download, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MermaidChart } from '@/components/charts/MermaidChart';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

interface Kpi { name: string; value: string; trend?: 'up'|'down'|'flat'; note?: string }
interface Section { heading: string; content: string }
interface SmartReport {
  title: string;
  executive_summary: string;
  key_findings: string[];
  kpis: Kpi[];
  sections: Section[];
  recommendations: string[];
  charts?: { primary?: string; trend?: string; flow?: string };
}

const SOURCES = [
  { value: 'finance', label: 'التحليل المالي' },
  { value: 'whatsapp', label: 'محادثات واتساب' },
  { value: 'architecture', label: 'التحليل المعماري' },
  { value: 'tasks', label: 'المشاريع والمهام' },
  { value: 'custom', label: 'بيانات مخصصة' },
];

const TYPES = [
  { value: 'executive', label: 'تنفيذي' },
  { value: 'operational', label: 'تشغيلي' },
  { value: 'analytical', label: 'تحليلي' },
];

const trendIcon = (t?: string) => t === 'up' ? <TrendingUp className="w-3 h-3 text-success" />
  : t === 'down' ? <TrendingDown className="w-3 h-3 text-destructive" />
  : <Minus className="w-3 h-3 text-muted-foreground" />;

const SmartReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<'executive'|'operational'|'analytical'>('executive');
  const [source, setSource] = useState<'finance'|'whatsapp'|'architecture'|'tasks'|'custom'>('tasks');
  const [title, setTitle] = useState('تقرير الأداء الشهري');
  const [periodDays, setPeriodDays] = useState(30);
  const [customData, setCustomData] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SmartReport | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState('setup');

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase.from('reports').select('id,title,type,source,payload,created_at').order('created_at', { ascending: false }).limit(20);
    setHistory(data || []);
  };
  useEffect(() => { loadHistory(); }, [user]);

  const generate = async () => {
    setLoading(true); setError(''); setReport(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('report-generate', {
        body: { type, source, title, period_days: periodDays, custom_data: customData || undefined, notes: notes || undefined },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      if (data?.report) {
        setReport(data.report); setTab('view');
        toast({ title: 'تم إنشاء التقرير' });
      } else {
        throw new Error('استجابة غير صالحة من النموذج');
      }
    } catch (e: any) {
      setError(e.message); toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const save = async () => {
    if (!user || !report) return;
    const { error: dbErr } = await supabase.from('reports').insert({
      user_id: user.id, type, source, title: report.title || title, payload: report as any,
    });
    if (dbErr) toast({ title: 'فشل الحفظ', description: dbErr.message, variant: 'destructive' });
    else { toast({ title: 'تم الحفظ' }); loadHistory(); }
  };

  const downloadMd = () => {
    if (!report) return;
    const md = [
      `# ${report.title}`,
      '',
      '## الملخص التنفيذي',
      report.executive_summary,
      '',
      '## أهم النتائج',
      ...report.key_findings.map(f => `- ${f}`),
      '',
      '## المؤشرات',
      ...report.kpis.map(k => `- **${k.name}**: ${k.value} ${k.note ? `(${k.note})` : ''}`),
      '',
      '## الأقسام',
      ...report.sections.flatMap(s => [`### ${s.heading}`, s.content, '']),
      '## التوصيات',
      ...report.recommendations.map(r => `- ${r}`),
    ].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title.replace(/\s+/g, '_')}-${Date.now()}.md`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ai-primary to-ai-accent flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">مولد التقارير الذكية</h1>
                <p className="text-xs text-muted-foreground">تقارير تنفيذية وتحليلية مع KPIs ومخططات بصرية تلقائية</p>
              </div>
            </div>
            <Button onClick={generate} disabled={loading} size="sm">
              {loading ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Sparkles className="w-4 h-4 ml-2" />}
              {loading ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
            </Button>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">1. الإعداد</TabsTrigger>
              <TabsTrigger value="view" disabled={!report}>2. التقرير</TabsTrigger>
              <TabsTrigger value="history">3. السجل ({history.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-4 grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>نوع التقرير</Label>
                    <Select value={type} onValueChange={v => setType(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>مصدر البيانات</Label>
                    <Select value={source} onValueChange={v => setSource(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>عنوان التقرير</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>الفترة (أيام)</Label>
                    <Input type="number" value={periodDays} onChange={e => setPeriodDays(parseInt(e.target.value) || 30)} />
                  </div>
                  {source === 'custom' && (
                    <div className="md:col-span-2">
                      <Label>البيانات المخصصة (لصق نص/CSV/JSON)</Label>
                      <Textarea value={customData} onChange={e => setCustomData(e.target.value)} rows={6} />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <Label>ملاحظات للمحلل (اختياري)</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="مثال: ركّز على الانحرافات وقدّم 3 توصيات قصيرة المدى" />
                  </div>
                </CardContent>
              </Card>
              {error && <ErrorState message={error} onRetry={generate} />}
            </TabsContent>

            <TabsContent value="view" className="mt-4 space-y-4">
              {report && (
                <>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={downloadMd}><Download className="w-4 h-4 ml-2" /> Markdown</Button>
                    <Button size="sm" onClick={save}><Save className="w-4 h-4 ml-2" /> حفظ في السجل</Button>
                  </div>

                  <Card>
                    <CardHeader><CardTitle className="text-lg">{report.title}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{report.executive_summary}</p>
                    </CardContent>
                  </Card>

                  {report.kpis?.length > 0 && (
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {report.kpis.map((k, i) => (
                        <Card key={i} className="p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">{trendIcon(k.trend)} {k.name}</p>
                          <p className="text-xl font-bold mt-1">{k.value}</p>
                          {k.note && <p className="text-[10px] text-muted-foreground mt-1">{k.note}</p>}
                        </Card>
                      ))}
                    </div>
                  )}

                  {report.key_findings?.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">أهم النتائج</CardTitle></CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5 list-disc pr-5 text-sm">
                          {report.key_findings.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {report.sections?.map((s, i) => (
                    <Card key={i}>
                      <CardHeader><CardTitle className="text-base">{s.heading}</CardTitle></CardHeader>
                      <CardContent><p className="text-sm leading-relaxed whitespace-pre-wrap">{s.content}</p></CardContent>
                    </Card>
                  ))}

                  {report.charts?.primary && <MermaidChart title="المخطط الرئيسي" chart={report.charts.primary} />}
                  {report.charts?.trend && <MermaidChart title="الاتجاه" chart={report.charts.trend} />}
                  {report.charts?.flow && <MermaidChart title="التدفق" chart={report.charts.flow} />}

                  {report.recommendations?.length > 0 && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader><CardTitle className="text-base">التوصيات</CardTitle></CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5 list-disc pr-5 text-sm">
                          {report.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {history.length === 0 ? (
                <EmptyState icon={BarChart3} title="لا توجد تقارير محفوظة" description="أنشئ تقريراً واحفظه ليظهر هنا." />
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {history.map(h => (
                    <Card key={h.id} className="p-4 cursor-pointer hover:bg-accent/50" onClick={() => { setReport(h.payload); setTitle(h.title); setTab('view'); }}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm truncate">{h.title}</h4>
                        <Badge variant="secondary" className="text-[10px]">{TYPES.find(t=>t.value===h.type)?.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {SOURCES.find(s=>s.value===h.source)?.label} · {new Date(h.created_at).toLocaleDateString('ar-EG')}
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

export default SmartReports;

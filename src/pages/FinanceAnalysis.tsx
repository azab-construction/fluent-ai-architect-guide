import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Wallet, Sparkles, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { FinanceUploader } from '@/components/finance/FinanceUploader';
import { FinancialStatements, FinanceReport } from '@/components/finance/FinancialStatements';
import { MermaidChart } from '@/components/charts/MermaidChart';
import { ParsedFinanceFile } from '@/lib/finance-parser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const FinanceAnalysis = () => {
  const [files, setFiles] = useState<ParsedFinanceFile[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [rawResponse, setRawResponse] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [tab, setTab] = useState('upload');
  const { toast } = useToast();

  const runAnalysis = async () => {
    if (!files.length) {
      toast({ title: 'الرجاء رفع ملف واحد على الأقل', variant: 'destructive' });
      return;
    }
    setLoading(true); setError(''); setReport(null); setRawResponse('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('finance-analyze', {
        body: {
          files: files.map(f => ({ name: f.name, type: f.type, content: f.content })),
          notes: notes.trim() || undefined,
        },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      if (data?.report) {
        setReport(data.report);
        setTab('report');
        toast({ title: 'تم إنشاء التقرير المالي' });
      } else {
        setRawResponse(data?.raw || JSON.stringify(data, null, 2));
        setError('تعذر تحليل استجابة النموذج كـ JSON صالح');
      }
    } catch (e: any) {
      setError(e.message || 'فشل التحليل');
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `financial-report-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const totalChars = files.reduce((s, f) => s + f.content.length, 0);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ai-primary to-ai-accent flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">التحليل المالي الذكي</h1>
                <p className="text-xs text-muted-foreground">
                  ارفع بياناتك المالية (Excel / CSV / PDF / SQL) للحصول على قوائم مالية وتقرير تحليلي ومخططات بصرية
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {report && (
                <Button variant="outline" size="sm" onClick={downloadJSON}>
                  <Download className="w-4 h-4 ml-2" /> تنزيل JSON
                </Button>
              )}
              <Button onClick={runAnalysis} disabled={loading || !files.length} size="sm">
                {loading ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Sparkles className="w-4 h-4 ml-2" />}
                {loading ? 'جاري التحليل...' : 'تحليل البيانات'}
              </Button>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">1. الملفات والتعليمات</TabsTrigger>
              <TabsTrigger value="report" disabled={!report}>2. القوائم المالية</TabsTrigger>
              <TabsTrigger value="charts" disabled={!report?.charts}>3. المخططات البصرية</TabsTrigger>
            </TabsList>

            {/* Upload */}
            <TabsContent value="upload" className="space-y-4 mt-4">
              <FinanceUploader files={files} onChange={setFiles} disabled={loading} />
              <Card>
                <CardHeader><CardTitle className="text-base">ملاحظات للمحلل (اختياري)</CardTitle></CardHeader>
                <CardContent>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="مثال: ركّز على تحليل المصروفات التشغيلية، الفترة المطلوبة Q1 2025، العملة بالجنيه المصري..."
                    rows={4}
                    disabled={loading}
                  />
                  {files.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {files.length} ملف · {totalChars.toLocaleString()} حرف سيتم إرسالها للنموذج
                    </p>
                  )}
                </CardContent>
              </Card>

              {error && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">{error}</p>
                        {rawResponse && (
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer">عرض الاستجابة الخام</summary>
                            <pre className="text-[10px] mt-2 p-2 bg-muted rounded overflow-auto max-h-64" dir="ltr">{rawResponse}</pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Report */}
            <TabsContent value="report" className="mt-4">
              {report && <FinancialStatements report={report} />}
            </TabsContent>

            {/* Charts */}
            <TabsContent value="charts" className="mt-4 space-y-4">
              {report?.charts?.expenses_pie && (
                <MermaidChart title="توزيع المصاريف" chart={report.charts.expenses_pie} />
              )}
              {report?.charts?.revenue_bar && (
                <MermaidChart title="الإيرادات" chart={report.charts.revenue_bar} />
              )}
              {report?.charts?.flow && (
                <MermaidChart title="دورة الأموال" chart={report.charts.flow} />
              )}
              {!report?.charts?.expenses_pie && !report?.charts?.revenue_bar && !report?.charts?.flow && (
                <Card className="p-8 text-center text-muted-foreground text-sm">لا توجد مخططات في هذا التقرير</Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default FinanceAnalysis;

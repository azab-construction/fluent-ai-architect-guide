import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AZURE_CONTEXTS,
  getContextById,
  getContextFallbackRecords,
  type AzureContextKind,
  type AzureIntegrationRecord,
} from '@/lib/azure-foundry-inventory';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Cloud,
  Cpu,
  Database,
  Loader2,
  MessageSquare,
  Mic,
  RefreshCw,
  Send,
  Settings2,
  XCircle,
} from 'lucide-react';

interface AzureContextPageProps {
  contextId: AzureContextKind;
}

function findPrimaryRecord(records: AzureIntegrationRecord[], primaryKey: string): AzureIntegrationRecord | undefined {
  return records.find(record => record.integration_key === primaryKey) || records.find(record => record.is_chat_completion) || records[0];
}

function detailPairs(record?: AzureIntegrationRecord): Array<[string, string | number | boolean | null | undefined]> {
  if (!record) return [];
  return [
    ['integration_key', record.integration_key],
    ['context_type', record.context_type],
    ['display_name', record.display_name],
    ['azure_project_name', record.azure_project_name],
    ['azure_resource_name', record.azure_resource_name],
    ['foundry_resource_name', record.foundry_resource_name],
    ['region', record.region],
    ['resource_type', record.resource_type],
    ['model_id', record.model_id],
    ['model_version', record.model_version],
    ['deployment_name', record.deployment_name],
    ['agent_id', record.agent_id],
    ['api_version', record.api_version],
    ['endpoint_url', record.endpoint_url],
    ['apim_base_url', record.apim_base_url],
    ['is_chat_completion', record.is_chat_completion],
    ['is_realtime', record.is_realtime],
  ];
}

const AzureContextPage = ({ contextId }: AzureContextPageProps) => {
  const { toast } = useToast();
  const context = getContextById(contextId) || AZURE_CONTEXTS[0];
  const [records, setRecords] = useState<AzureIntegrationRecord[]>(getContextFallbackRecords(context));
  const [source, setSource] = useState<'database' | 'fallback'>('fallback');
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState(context.defaultPrompt);
  const [answer, setAnswer] = useState('');
  const [running, setRunning] = useState(false);
  const [runtimeResult, setRuntimeResult] = useState<{ ok?: boolean; msg?: string; latency?: number }>({});

  const primary = useMemo(() => findPrimaryRecord(records, context.primaryIntegrationKey), [records, context.primaryIntegrationKey]);
  const isVoice = context.runtimeMode === 'voice' || primary?.is_realtime;
  const canRunChat = context.runtimeMode === 'chat' && Boolean(primary?.is_chat_completion && primary?.model_id && primary?.deployment_name);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('azure_ai_integrations')
        .select('*')
        .in('integration_key', context.relatedIntegrationKeys);
      if (error) throw error;
      const rows = (data || []) as AzureIntegrationRecord[];
      setRecords(rows.length ? rows : getContextFallbackRecords(context));
      setSource(rows.length ? 'database' : 'fallback');
    } catch (e: any) {
      setRecords(getContextFallbackRecords(context));
      setSource('fallback');
      toast({ title: 'تم استخدام fallback', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPrompt(context.defaultPrompt);
    setAnswer('');
    setRuntimeResult({});
    loadRecords();
  }, [context.id]);

  const runContext = async () => {
    if (!primary) return;
    if (!canRunChat) {
      toast({ title: 'هذا السياق غير قابل للتشغيل عبر Chat', description: 'راجع نوع النموذج أو deployment.', variant: 'destructive' });
      return;
    }
    setRunning(true);
    setAnswer('');
    setRuntimeResult({});
    const started = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('azure-ai-chat', {
        body: {
          task: `context:${context.id}`,
          model: primary.model_id,
          deployment: primary.deployment_name,
          api_version: primary.api_version,
          temperature: primary.default_temperature ?? 0.3,
          max_tokens: primary.max_tokens ?? 1200,
          messages: [
            { role: 'system', content: `أنت تعمل داخل سياق ${context.title}. التزم بالغرض التشغيلي لهذا السياق ولا تخرج عنه.` },
            { role: 'user', content: prompt.trim() },
          ],
        },
      });
      if (error) throw error;
      setAnswer(data?.content || 'لا توجد استجابة');
      setRuntimeResult({ ok: true, latency: Date.now() - started, msg: `${data?.deployment || primary.deployment_name}` });
    } catch (e: any) {
      setRuntimeResult({ ok: false, latency: Date.now() - started, msg: e.message });
      setAnswer(`خطأ: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center text-[10px] font-bold" dir="ltr">
                {context.iconLabel}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to="/azure/settings" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> إعدادات Azure
                  </Link>
                  <Badge variant="outline" dir="ltr">{context.id}</Badge>
                </div>
                <h1 className="text-2xl font-bold">{context.title}</h1>
                <p className="text-xs text-muted-foreground max-w-3xl">{context.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={source === 'database' ? 'default' : 'secondary'} className="gap-1">
                <Database className="w-3 h-3" />{source === 'database' ? 'Supabase' : 'Fallback'}
              </Badge>
              <Button onClick={loadRecords} disabled={loading} variant="outline" size="sm">
                {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-2" />}
                تحديث
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {isVoice ? <Mic className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                        تشغيل السياق
                      </CardTitle>
                      <CardDescription>
                        {isVoice
                          ? 'هذا سياق صوت مباشر ويحتاج مسار Realtime مستقل. تعرض الصفحة بيانات الربط فقط حالياً.'
                          : 'اختبار مباشر عبر azure-ai-chat باستخدام deployment المخزن في جدول azure_ai_integrations.'}
                      </CardDescription>
                    </div>
                    {runtimeResult.ok === true && <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" />ناجح</Badge>}
                    {runtimeResult.ok === false && <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />فشل</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={5}
                    disabled={isVoice}
                    placeholder="اكتب اختبار السياق هنا..."
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Model</Label>
                      <Input dir="ltr" readOnly value={primary?.model_id || '—'} />
                    </div>
                    <div className="space-y-1">
                      <Label>Deployment</Label>
                      <Input dir="ltr" readOnly value={primary?.deployment_name || '—'} />
                    </div>
                    <div className="space-y-1">
                      <Label>API Version</Label>
                      <Input dir="ltr" readOnly value={primary?.api_version || 'default'} />
                    </div>
                  </div>
                  <Button onClick={runContext} disabled={running || !canRunChat} className="w-full">
                    {running ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
                    تشغيل الاختبار
                  </Button>
                  {runtimeResult.msg && (
                    <p className="text-xs p-2 rounded bg-muted" dir="ltr">
                      {runtimeResult.msg} {runtimeResult.latency ? `· ${runtimeResult.latency}ms` : ''}
                    </p>
                  )}
                  {answer && (
                    <div className="p-4 rounded-md border bg-background whitespace-pre-wrap text-sm leading-relaxed max-h-[420px] overflow-auto">
                      {answer}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">السجلات المرتبطة بهذا السياق</CardTitle>
                  <CardDescription>البيانات مقروءة من جدول Supabase أو fallback عند تعذر القراءة.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {records.map(record => (
                    <div key={record.integration_key} className="p-3 rounded-md border space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-sm">{record.display_name}</p>
                          <p className="text-[11px] text-muted-foreground" dir="ltr">{record.integration_key}</p>
                        </div>
                        <Badge variant="outline">{record.context_type}</Badge>
                      </div>
                      <div className="grid gap-2 md:grid-cols-3">
                        {detailPairs(record).slice(3).filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => (
                          <div key={label} className="p-2 rounded bg-muted/40">
                            <p className="text-[10px] text-muted-foreground">{label}</p>
                            <p className="font-mono text-[11px] break-all" dir="ltr">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Cloud className="w-5 h-5" />الغرض التشغيلي</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {context.notes.map(note => (
                    <div key={note} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Cpu className="w-5 h-5" />Primary Binding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {primary ? detailPairs(primary).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 border-b py-1.5 last:border-0">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono text-xs text-left break-all" dir="ltr">{value === null || value === undefined || value === '' ? '—' : String(value)}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">لا يوجد سجل أساسي.</p>
                  )}
                </CardContent>
              </Card>

              {isVoice && (
                <Card className="border-amber-500/40">
                  <CardContent className="p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      هذا النموذج صوتي. صفحة السياق لا تشغله عبر azure-ai-chat. المرحلة التالية له هي بناء Edge Function خاصة بالصوت المباشر.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Bot className="w-5 h-5" />الصفحات الأخرى</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {AZURE_CONTEXTS.filter(item => item.id !== context.id).map(item => (
                    <Link key={item.id} to={item.route} className="block p-2 rounded-md border hover:bg-muted/60">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end">
            <Link to="/azure/settings">
              <Button variant="outline"><Settings2 className="w-4 h-4 ml-2" />إدارة بيانات الاتصال</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AzureContextPage;

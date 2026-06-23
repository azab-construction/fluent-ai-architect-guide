import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Cloud, CheckCircle2, XCircle, Loader2, RefreshCw, Activity, Cpu, Bot,
  Wallet, FileText, ListChecks, BarChart3, Send, Settings as SettingsIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AZURE_MODELS, AZURE_AGENTS, AZURE_HEALTH_LABELS,
  type AzureAgentConfig, type AzureModelConfig,
} from '@/lib/azure-agents-config';

interface HealthCheck {
  service: string;
  configured: boolean;
  ok: boolean;
  status?: number;
  latency_ms?: number;
  message?: string;
}

interface HealthResponse {
  checks: HealthCheck[];
  summary: { total: number; ok: number; configured: number };
  timestamp: string;
}

const agentIcons: Record<AzureAgentConfig['icon'], React.ReactNode> = {
  finance: <Wallet className="w-5 h-5" />,
  contract: <FileText className="w-5 h-5" />,
  project: <ListChecks className="w-5 h-5" />,
  report: <BarChart3 className="w-5 h-5" />,
};

const StatusDot = ({ ok, configured }: { ok: boolean; configured: boolean }) => {
  if (!configured) return <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" />;
  return (
    <span className={`w-2.5 h-2.5 rounded-full inline-block ${ok ? 'bg-green-500 animate-pulse' : 'bg-destructive'}`} />
  );
};

const AzureSettings = () => {
  const { toast } = useToast();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [modelTests, setModelTests] = useState<Record<string, { loading: boolean; ok?: boolean; latency?: number; msg?: string }>>({});
  const [activeAgent, setActiveAgent] = useState<AzureAgentConfig>(AZURE_AGENTS[0]);
  const [agentPrompt, setAgentPrompt] = useState(AZURE_AGENTS[0].sampleTask);
  const [agentResponse, setAgentResponse] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);

  const runHealth = async () => {
    setHealthLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('azure-health', { body: {} });
      if (error) throw error;
      setHealth(data as HealthResponse);
    } catch (e: any) {
      toast({ title: 'فشل فحص الاتصال', description: e.message, variant: 'destructive' });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => { runHealth(); }, []);

  const testModel = async (model: AzureModelConfig) => {
    setModelTests(prev => ({ ...prev, [model.id]: { loading: true } }));
    const started = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('azure-openai-direct', {
        body: {
          task: `model-test:${model.id}`,
          temperature: 0,
          max_tokens: 32,
          messages: [
            { role: 'system', content: 'أجب بكلمة واحدة فقط: pong' },
            { role: 'user', content: 'ping' },
          ],
        },
      });
      if (error) throw error;
      const latency = Date.now() - started;
      const content = (data?.content as string) || '';
      setModelTests(prev => ({
        ...prev,
        [model.id]: { loading: false, ok: true, latency, msg: content.slice(0, 80) || 'OK' },
      }));
    } catch (e: any) {
      setModelTests(prev => ({
        ...prev,
        [model.id]: { loading: false, ok: false, latency: Date.now() - started, msg: e.message },
      }));
    }
  };

  const selectAgent = (agent: AzureAgentConfig) => {
    setActiveAgent(agent);
    setAgentPrompt(agent.sampleTask);
    setAgentResponse('');
  };

  const runAgent = async () => {
    if (!agentPrompt.trim()) {
      toast({ title: 'اكتب مهمة للوكيل أولاً', variant: 'destructive' });
      return;
    }
    setAgentLoading(true); setAgentResponse('');
    try {
      const model = AZURE_MODELS.find(m => m.id === activeAgent.modelId) || AZURE_MODELS[0];
      const { data, error } = await supabase.functions.invoke('azure-openai-direct', {
        body: {
          task: `agent:${activeAgent.id}`,
          temperature: model.defaultTemperature,
          max_tokens: model.maxTokens,
          messages: [
            { role: 'system', content: activeAgent.systemPrompt },
            { role: 'user', content: agentPrompt.trim() },
          ],
        },
      });
      if (error) throw error;
      setAgentResponse((data?.content as string) || 'لا توجد استجابة');
    } catch (e: any) {
      toast({ title: 'فشل تشغيل الوكيل', description: e.message, variant: 'destructive' });
      setAgentResponse(`خطأ: ${e.message}`);
    } finally {
      setAgentLoading(false);
    }
  };

  const overallOk = health ? health.summary.ok === health.summary.total : false;

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">إعدادات Azure AI · النماذج والوكلاء</h1>
                <p className="text-xs text-muted-foreground">
                  مراقبة صحة الاتصال · {AZURE_MODELS.length} نماذج · {AZURE_AGENTS.length} وكلاء جاهزون
                </p>
              </div>
            </div>
            <Button onClick={runHealth} disabled={healthLoading} size="sm" variant="outline">
              {healthLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-2" />}
              فحص الاتصال
            </Button>
          </div>

          {/* Overall banner */}
          <Card className={`border-r-4 ${overallOk ? 'border-r-green-500 bg-green-500/5' : 'border-r-amber-500 bg-amber-500/5'}`}>
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {overallOk ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Activity className="w-6 h-6 text-amber-500" />}
                <div>
                  <p className="font-semibold">
                    {health
                      ? `${health.summary.ok} / ${health.summary.total} خدمات متصلة`
                      : 'جاري فحص الاتصال...'}
                  </p>
                  {health && (
                    <p className="text-xs text-muted-foreground">
                      آخر فحص: {new Date(health.timestamp).toLocaleTimeString('ar-EG')}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={overallOk ? 'default' : 'secondary'} className="gap-1">
                {overallOk ? 'النظام جاهز للإنتاج' : 'يلزم مراجعة'}
              </Badge>
            </CardContent>
          </Card>

          <Tabs defaultValue="health" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full md:w-auto">
              <TabsTrigger value="health" className="gap-2"><Activity className="w-4 h-4" /> الاتصال</TabsTrigger>
              <TabsTrigger value="models" className="gap-2"><Cpu className="w-4 h-4" /> النماذج ({AZURE_MODELS.length})</TabsTrigger>
              <TabsTrigger value="agents" className="gap-2"><Bot className="w-4 h-4" /> الوكلاء ({AZURE_AGENTS.length})</TabsTrigger>
            </TabsList>

            {/* HEALTH */}
            <TabsContent value="health" className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {(health?.checks || []).map(c => (
                  <Card key={c.service}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <StatusDot ok={c.ok} configured={c.configured} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{AZURE_HEALTH_LABELS[c.service] || c.service}</p>
                          {c.latency_ms != null && (
                            <Badge variant="outline" className="text-[10px]">{c.latency_ms}ms</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate" title={c.message}>
                          {!c.configured ? 'غير مهيأ' : c.ok ? c.message || 'متصل' : `فشل: ${c.message}`}
                        </p>
                        {c.status != null && (
                          <p className="text-[10px] text-muted-foreground mt-0.5" dir="ltr">HTTP {c.status}</p>
                        )}
                      </div>
                      {c.configured ? (
                        c.ok
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      ) : (
                        <SettingsIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </CardContent>
                  </Card>
                ))}
                {!health && (
                  <Card className="md:col-span-2 p-8 text-center text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    جاري الاتصال بخدمات Azure...
                  </Card>
                )}
              </div>
              <Card className="bg-muted/30">
                <CardContent className="p-4 text-xs space-y-1 text-muted-foreground">
                  <p>💡 يتم الفحص مباشرة عبر edge function <code dir="ltr">azure-health</code>.</p>
                  <p>المتغيرات المطلوبة: <code dir="ltr">AZURE_OPENAI_API_KEY</code>, <code dir="ltr">AZURE_OPENAI_ENDPOINT</code>, <code dir="ltr">AZURE_OPENAI_DEPLOYMENT</code>, <code dir="ltr">ALAZAB_AI_PROD_KEY</code>.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* MODELS */}
            <TabsContent value="models" className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                {AZURE_MODELS.map(m => {
                  const t = modelTests[m.id];
                  return (
                    <Card key={m.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                            <Cpu className="w-4 h-4 text-blue-500" />
                          </div>
                          {t && (
                            <Badge variant={t.ok ? 'default' : 'destructive'} className="gap-1 text-[10px]">
                              {t.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : t.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {t.latency ? `${t.latency}ms` : ''}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base">{m.label}</CardTitle>
                        <CardDescription className="text-xs leading-relaxed">{m.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col gap-3">
                        <div className="flex flex-wrap gap-1">
                          {m.capabilities.map(cap => (
                            <Badge key={cap} variant="secondary" className="text-[10px]">{cap}</Badge>
                          ))}
                        </div>
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          <p>درجة حرارة افتراضية: {m.defaultTemperature}</p>
                          <p>أقصى توكنز: {m.maxTokens.toLocaleString()}</p>
                        </div>
                        {t?.msg && (
                          <p className="text-[10px] p-2 rounded bg-muted truncate" dir="ltr" title={t.msg}>{t.msg}</p>
                        )}
                        <Button size="sm" variant="outline" onClick={() => testModel(m)} disabled={t?.loading}>
                          {t?.loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
                          اختبار النموذج
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* AGENTS */}
            <TabsContent value="agents" className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                {AZURE_AGENTS.map(a => {
                  const active = activeAgent.id === a.id;
                  return (
                    <Card
                      key={a.id}
                      className={`cursor-pointer transition-all ${active ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/50'}`}
                      onClick={() => selectAgent(a)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${active ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {agentIcons[a.icon]}
                          </div>
                          {active && <Badge variant="default" className="text-[10px]">نشط</Badge>}
                        </div>
                        <p className="font-semibold text-sm">{a.label}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{a.description}</p>
                        <Badge variant="outline" className="text-[10px]" dir="ltr">{a.modelId}</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {agentIcons[activeAgent.icon]} {activeAgent.label}
                  </CardTitle>
                  <CardDescription className="text-xs">{activeAgent.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs p-3 bg-muted/50 rounded-md">
                    <p className="font-semibold mb-1">برومبت النظام (System Prompt):</p>
                    <p className="text-muted-foreground leading-relaxed">{activeAgent.systemPrompt}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-xs font-semibold mb-1 block">المهمة:</label>
                    <Textarea
                      value={agentPrompt}
                      onChange={e => setAgentPrompt(e.target.value)}
                      rows={3}
                      placeholder="اكتب المهمة المطلوبة من الوكيل..."
                    />
                  </div>
                  <Button onClick={runAgent} disabled={agentLoading} className="w-full">
                    {agentLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Bot className="w-4 h-4 ml-2" />}
                    {agentLoading ? 'الوكيل يفكر...' : 'تشغيل الوكيل'}
                  </Button>
                  {agentResponse && (
                    <div className="p-3 bg-background border rounded-md text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-auto">
                      {agentResponse}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AzureSettings;

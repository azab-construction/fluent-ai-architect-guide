import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cloud, Activity, Cpu, Bot, CheckCircle2, XCircle, Loader2, RefreshCw, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AZURE_AGENTS, AZURE_HEALTH_LABELS, AZURE_MODELS, type AzureAgentConfig, type AzureModelConfig } from '@/lib/azure-agents-config';

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

const secretNames = [
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_DEFAULT_DEPLOYMENT',
  'AZURE_OPENAI_DEPLOYMENTS_JSON',
  'AZURE_OPENAI_API_VERSION',
  'AZURE_APIM_BASE_URL',
  'AZURE_APIM_SUBSCRIPTION_KEY',
  'ALAZAB_AI_PROD_KEY',
];

function statusBadge(ok?: boolean, loading?: boolean) {
  if (loading) return <Badge variant="outline"><Loader2 className="w-3 h-3 ml-1 animate-spin" />جاري</Badge>;
  if (ok === true) return <Badge><CheckCircle2 className="w-3 h-3 ml-1" />ناجح</Badge>;
  if (ok === false) return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />فشل</Badge>;
  return null;
}

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

  const callModel = async (model: AzureModelConfig, messages: Array<{ role: 'system' | 'user'; content: string }>, task: string) => {
    const { data, error } = await supabase.functions.invoke('azure-ai-chat', {
      body: {
        task,
        model: model.id,
        deployment: model.deployment,
        api_version: model.apiVersion,
        temperature: model.defaultTemperature,
        max_tokens: model.maxTokens,
        messages,
      },
    });
    if (error) throw error;
    return data;
  };

  const testModel = async (model: AzureModelConfig) => {
    setModelTests(prev => ({ ...prev, [model.id]: { loading: true } }));
    const started = Date.now();
    try {
      const data = await callModel(model, [
        { role: 'system', content: 'أجب بكلمة واحدة فقط: pong' },
        { role: 'user', content: 'ping' },
      ], `model-test:${model.id}`);
      const resolved = data?.deployment ? ` · ${data.deployment}` : '';
      setModelTests(prev => ({
        ...prev,
        [model.id]: { loading: false, ok: true, latency: Date.now() - started, msg: `${data?.content || 'OK'}${resolved}` },
      }));
    } catch (e: any) {
      setModelTests(prev => ({ ...prev, [model.id]: { loading: false, ok: false, latency: Date.now() - started, msg: e.message } }));
    }
  };

  const selectAgent = (agent: AzureAgentConfig) => {
    setActiveAgent(agent);
    setAgentPrompt(agent.sampleTask);
    setAgentResponse('');
  };

  const runAgent = async () => {
    if (!agentPrompt.trim()) return toast({ title: 'اكتب مهمة للوكيل أولاً', variant: 'destructive' });
    setAgentLoading(true);
    setAgentResponse('');
    try {
      const model = AZURE_MODELS.find(m => m.id === activeAgent.modelId) || AZURE_MODELS[0];
      const data = await callModel(model, [
        { role: 'system', content: activeAgent.systemPrompt },
        { role: 'user', content: agentPrompt.trim() },
      ], `agent:${activeAgent.id}`);
      setAgentResponse(data?.content || 'لا توجد استجابة');
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary/15 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">إعدادات Azure AI</h1>
                <p className="text-xs text-muted-foreground">فحص الاتصال · اختبار الموديلات · تشغيل الوكلاء</p>
              </div>
            </div>
            <Button onClick={runHealth} disabled={healthLoading} variant="outline" size="sm">
              {healthLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-2" />}
              فحص الاتصال
            </Button>
          </div>

          <Card className={overallOk ? 'border-green-500/40' : 'border-amber-500/40'}>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                <span className="font-semibold">
                  {health ? `${health.summary.ok} / ${health.summary.total} خدمات متصلة` : 'لم يتم الفحص بعد'}
                </span>
              </div>
              <Badge variant={overallOk ? 'default' : 'secondary'}>{overallOk ? 'جاهز' : 'يلزم مراجعة'}</Badge>
            </CardContent>
          </Card>

          <Tabs defaultValue="health" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="health">الاتصال</TabsTrigger>
              <TabsTrigger value="models">النماذج</TabsTrigger>
              <TabsTrigger value="agents">الوكلاء</TabsTrigger>
              <TabsTrigger value="secrets">الأسرار</TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="grid gap-3 md:grid-cols-2">
              {(health?.checks || []).map(c => (
                <Card key={c.service}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">{AZURE_HEALTH_LABELS[c.service] || c.service}</p>
                      {statusBadge(c.ok)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate" title={c.message}>{c.configured ? c.message || 'متصل' : 'غير مهيأ'}</p>
                    <div className="flex gap-2 text-[10px] text-muted-foreground" dir="ltr">
                      {c.status != null && <span>HTTP {c.status}</span>}
                      {c.latency_ms != null && <span>{c.latency_ms}ms</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="models" className="grid gap-3 md:grid-cols-3">
              {AZURE_MODELS.map(model => {
                const test = modelTests[model.id];
                return (
                  <Card key={model.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <Cpu className="w-5 h-5" />
                        {statusBadge(test?.ok, test?.loading)}
                      </div>
                      <CardTitle className="text-base">{model.label}</CardTitle>
                      <CardDescription>{model.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {model.capabilities.map(cap => <Badge key={cap} variant="secondary" className="text-[10px]">{cap}</Badge>)}
                      </div>
                      <div className="text-[10px] text-muted-foreground" dir="ltr">
                        <p>id: {model.id}</p>
                        {model.apiVersion && <p>api: {model.apiVersion}</p>}
                        <p>max_tokens: {model.maxTokens}</p>
                      </div>
                      {test?.msg && <p className="text-[10px] p-2 rounded bg-muted truncate" dir="ltr" title={test.msg}>{test.msg}</p>}
                      <Button onClick={() => testModel(model)} disabled={test?.loading} size="sm" variant="outline" className="w-full">
                        <Send className="w-4 h-4 ml-2" />اختبار
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="agents" className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                {AZURE_AGENTS.map(agent => (
                  <Card key={agent.id} onClick={() => selectAgent(agent)} className={activeAgent.id === agent.id ? 'border-primary cursor-pointer' : 'cursor-pointer'}>
                    <CardContent className="p-4 space-y-2">
                      <Bot className="w-5 h-5" />
                      <p className="font-semibold text-sm">{agent.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                      <Badge variant="outline" dir="ltr">{agent.modelId}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{activeAgent.label}</CardTitle>
                  <CardDescription>{activeAgent.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea value={agentPrompt} onChange={e => setAgentPrompt(e.target.value)} rows={3} />
                  <Button onClick={runAgent} disabled={agentLoading} className="w-full">
                    {agentLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Bot className="w-4 h-4 ml-2" />}
                    تشغيل الوكيل
                  </Button>
                  {agentResponse && <div className="p-3 border rounded-md text-sm whitespace-pre-wrap max-h-96 overflow-auto">{agentResponse}</div>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="secrets" className="grid gap-3 md:grid-cols-2">
              {secretNames.map(name => (
                <Card key={name}>
                  <CardContent className="p-4">
                    <code className="text-xs" dir="ltr">{name}</code>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AzureSettings;

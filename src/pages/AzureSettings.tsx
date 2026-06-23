import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cloud,
  Copy,
  Cpu,
  Database,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Settings2,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AZURE_CONTEXTS,
  AZURE_INTEGRATION_FALLBACKS,
  type AzureIntegrationRecord,
  toDeploymentMap,
} from '@/lib/azure-foundry-inventory';

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

type EditableForm = AzureIntegrationRecord & {
  secret_refs_text: string;
  connection_config_text: string;
  capabilities_text: string;
};

const contextTypeOrder: Record<string, number> = {
  foundry_project: 1,
  foundry_resource: 2,
  gateway: 3,
  model: 4,
  speech_model: 5,
  agent: 6,
};

const textFields: Array<{ key: keyof EditableForm; label: string; placeholder?: string }> = [
  { key: 'display_name', label: 'اسم العرض' },
  { key: 'integration_key', label: 'Integration Key' },
  { key: 'azure_project_name', label: 'Azure Project' },
  { key: 'azure_resource_name', label: 'Azure Resource' },
  { key: 'foundry_resource_name', label: 'Foundry Resource' },
  { key: 'region', label: 'Region' },
  { key: 'resource_type', label: 'Resource Type' },
  { key: 'model_id', label: 'Model ID' },
  { key: 'model_version', label: 'Model Version' },
  { key: 'deployment_name', label: 'Deployment Name' },
  { key: 'agent_id', label: 'Agent ID' },
  { key: 'agent_name', label: 'Agent Name' },
  { key: 'endpoint_url', label: 'Endpoint URL', placeholder: 'https://...' },
  { key: 'api_path', label: 'API Path' },
  { key: 'api_version', label: 'API Version' },
  { key: 'apim_base_url', label: 'APIM Base URL', placeholder: 'https://azabai.azure-api.net' },
  { key: 'apim_route', label: 'APIM Route' },
  { key: 'auth_type', label: 'Auth Type' },
];

function toForm(record: AzureIntegrationRecord): EditableForm {
  return {
    ...record,
    secret_refs_text: JSON.stringify(record.secret_refs || {}, null, 2),
    connection_config_text: JSON.stringify(record.connection_config || {}, null, 2),
    capabilities_text: (record.capabilities || []).join(', '),
  };
}

function parseJsonField(value: string, label: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} يجب أن يكون JSON object`);
  }
  return parsed as Record<string, unknown>;
}

function statusBadge(ok?: boolean, loading?: boolean) {
  if (loading) return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />جاري</Badge>;
  if (ok === true) return <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" />ناجح</Badge>;
  if (ok === false) return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />فشل</Badge>;
  return null;
}

const AzureSettings = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<AzureIntegrationRecord[]>([]);
  const [selectedKey, setSelectedKey] = useState('model.gpt-5.5.az-vision');
  const [form, setForm] = useState<EditableForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<'database' | 'fallback'>('fallback');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [test, setTest] = useState<{ loading: boolean; ok?: boolean; msg?: string; latency?: number }>({ loading: false });

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const orderA = contextTypeOrder[a.context_type] || 99;
      const orderB = contextTypeOrder[b.context_type] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.display_name.localeCompare(b.display_name);
    });
  }, [records]);

  const selected = useMemo(
    () => records.find(record => record.integration_key === selectedKey) || records[0],
    [records, selectedKey],
  );

  const deploymentMap = useMemo(() => toDeploymentMap(records), [records]);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('azure_ai_integrations')
        .select('*')
        .order('display_name', { ascending: true });

      if (error) throw error;
      const rows = (data || []) as AzureIntegrationRecord[];
      setRecords(rows.length ? rows : AZURE_INTEGRATION_FALLBACKS);
      setSource(rows.length ? 'database' : 'fallback');
      if (rows.length && !rows.some(row => row.integration_key === selectedKey)) {
        setSelectedKey(rows[0].integration_key);
      }
    } catch (e: any) {
      setRecords(AZURE_INTEGRATION_FALLBACKS);
      setSource('fallback');
      toast({ title: 'تم استخدام الجرد الثابت', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => { loadIntegrations(); }, []);
  useEffect(() => { if (selected) setForm(toForm(selected)); }, [selected?.integration_key]);

  const updateForm = (key: keyof EditableForm, value: string | boolean | number | null) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const saveForm = async () => {
    if (!form) return;
    if (source !== 'database') {
      toast({ title: 'الحفظ متوقف', description: 'الصفحة تعمل على fallback لأن الجدول غير قابل للقراءة حالياً.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const secretRefs = parseJsonField(form.secret_refs_text, 'Secret refs');
      const connectionConfig = parseJsonField(form.connection_config_text, 'Connection config');
      const capabilities = form.capabilities_text.split(',').map(item => item.trim()).filter(Boolean);

      const payload = {
        display_name: form.display_name,
        description: form.description || null,
        context_type: form.context_type,
        azure_project_name: form.azure_project_name || null,
        azure_resource_name: form.azure_resource_name || null,
        foundry_resource_name: form.foundry_resource_name || null,
        region: form.region || null,
        resource_type: form.resource_type || null,
        model_id: form.model_id || null,
        model_version: form.model_version || null,
        deployment_name: form.deployment_name || null,
        agent_id: form.agent_id || null,
        agent_name: form.agent_name || null,
        endpoint_url: form.endpoint_url || null,
        api_path: form.api_path || null,
        api_version: form.api_version || null,
        apim_base_url: form.apim_base_url || null,
        apim_route: form.apim_route || null,
        auth_type: form.auth_type || 'server_secret',
        secret_refs: secretRefs,
        connection_config: connectionConfig,
        capabilities,
        default_temperature: form.default_temperature ?? null,
        max_tokens: form.max_tokens ?? null,
        is_chat_completion: Boolean(form.is_chat_completion),
        is_realtime: Boolean(form.is_realtime),
        is_enabled: Boolean(form.is_enabled),
        is_production: Boolean(form.is_production),
      };

      const { error } = await (supabase as any)
        .from('azure_ai_integrations')
        .update(payload)
        .eq('integration_key', form.integration_key);

      if (error) throw error;
      toast({ title: 'تم الحفظ', description: form.integration_key });
      await loadIntegrations();
    } catch (e: any) {
      toast({ title: 'فشل الحفظ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const testSelected = async () => {
    if (!form) return;
    if (!form.is_chat_completion) {
      toast({ title: 'ليس Chat Completions', description: 'هذا السياق يحتاج مسار خاص وليس azure-ai-chat.', variant: 'destructive' });
      return;
    }
    setTest({ loading: true });
    const started = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('azure-ai-chat', {
        body: {
          task: `integration-test:${form.integration_key}`,
          model: form.model_id,
          deployment: form.deployment_name,
          api_version: form.api_version,
          temperature: form.default_temperature ?? 0,
          max_tokens: 64,
          messages: [
            { role: 'system', content: 'أجب بكلمة واحدة فقط: ok' },
            { role: 'user', content: 'ping' },
          ],
        },
      });
      if (error) throw error;
      setTest({ loading: false, ok: true, latency: Date.now() - started, msg: `${data?.content || 'ok'} · ${data?.deployment || form.deployment_name || ''}` });
    } catch (e: any) {
      setTest({ loading: false, ok: false, latency: Date.now() - started, msg: e.message });
    }
  };

  const copyDeploymentMap = async () => {
    const value = JSON.stringify(deploymentMap, null, 2);
    await navigator.clipboard.writeText(value);
    toast({ title: 'تم نسخ خريطة الموديلات', description: 'الصقها في AZURE_OPENAI_DEPLOYMENTS_JSON عند الحاجة.' });
  };

  const overallOk = health ? health.summary.ok === health.summary.total : false;

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary/15 flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">إعدادات نماذج ووكلاء Azure</h1>
                <p className="text-xs text-muted-foreground">إدارة المعرفات · نقاط النهاية · deployment · secret refs · خريطة Foundry الفعلية</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={source === 'database' ? 'default' : 'secondary'} className="gap-1">
                <Database className="w-3 h-3" />{source === 'database' ? 'Supabase' : 'Fallback'}
              </Badge>
              <Button onClick={loadIntegrations} disabled={loading} variant="outline" size="sm">
                {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-2" />}
                تحديث
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Chat Models / Agents</p>
                <p className="text-2xl font-bold">{records.filter(r => r.is_chat_completion).length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Realtime / Voice</p>
                <p className="text-2xl font-bold">{records.filter(r => r.is_realtime).length}</p>
              </CardContent>
            </Card>
            <Card className={overallOk ? 'border-green-500/40' : 'border-amber-500/40'}>
              <CardContent className="p-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Health</p>
                  <p className="font-bold">{health ? `${health.summary.ok}/${health.summary.total}` : 'لم يتم الفحص'}</p>
                </div>
                <Button onClick={runHealth} disabled={healthLoading} variant="outline" size="sm">
                  {healthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="registry" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="registry">السجلات</TabsTrigger>
              <TabsTrigger value="editor">الإدخال والتعديل</TabsTrigger>
              <TabsTrigger value="contexts">السياقات</TabsTrigger>
              <TabsTrigger value="runtime">Runtime Map</TabsTrigger>
            </TabsList>

            <TabsContent value="registry" className="grid gap-4 md:grid-cols-[360px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">خريطة Foundry</CardTitle>
                  <CardDescription>اختر أي سجل لتعديل بيانات الاتصال الخاصة به.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[640px] overflow-auto">
                  {sortedRecords.map(record => (
                    <button
                      key={record.integration_key}
                      onClick={() => setSelectedKey(record.integration_key)}
                      className={`w-full text-right p-3 rounded-md border transition ${selectedKey === record.integration_key ? 'border-primary bg-primary/5' : 'hover:bg-muted/60'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{record.display_name}</span>
                        <Badge variant="outline" className="text-[10px]">{record.context_type}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{record.integration_key}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {record.model_id && <Badge variant="secondary" className="text-[10px]" dir="ltr">{record.model_id}</Badge>}
                        {record.agent_id && <Badge variant="secondary" className="text-[10px]" dir="ltr">{record.agent_id}</Badge>}
                        {record.region && <Badge variant="secondary" className="text-[10px]" dir="ltr">{record.region}</Badge>}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">تفاصيل السجل المختار</CardTitle>
                  <CardDescription dir="ltr">{selected?.integration_key}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
                  {selected && [
                    ['Display', selected.display_name],
                    ['Type', selected.context_type],
                    ['Project', selected.azure_project_name],
                    ['Resource', selected.azure_resource_name],
                    ['Foundry', selected.foundry_resource_name],
                    ['Region', selected.region],
                    ['Model', selected.model_id],
                    ['Deployment', selected.deployment_name],
                    ['Agent', selected.agent_id],
                    ['Endpoint', selected.endpoint_url],
                    ['APIM', selected.apim_base_url],
                    ['API Version', selected.api_version],
                  ].map(([label, value]) => (
                    <div key={label as string} className="p-3 rounded-md bg-muted/40">
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="font-mono text-xs break-all" dir="ltr">{value || '—'}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="editor">
              {form && (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="text-base">لوحة إدخال بيانات الاتصال</CardTitle>
                        <CardDescription>لا تكتب المفاتيح الخام هنا؛ استخدم أسماء الأسرار فقط داخل Secret refs.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(test.ok, test.loading)}
                        <Button onClick={testSelected} disabled={test.loading || !form.is_chat_completion} variant="outline" size="sm">
                          <Send className="w-4 h-4 ml-2" />اختبار
                        </Button>
                        <Button onClick={saveForm} disabled={saving || source !== 'database'} size="sm">
                          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                          حفظ
                        </Button>
                      </div>
                    </div>
                    {test.msg && <p className="text-xs p-2 rounded bg-muted" dir="ltr">{test.msg}</p>}
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-3">
                      {textFields.map(field => (
                        <div key={field.key as string} className="space-y-1">
                          <Label>{field.label}</Label>
                          <Input
                            dir="ltr"
                            value={(form[field.key] as string | null | undefined) || ''}
                            placeholder={field.placeholder}
                            disabled={field.key === 'integration_key'}
                            onChange={e => updateForm(field.key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Default Temperature</Label>
                        <Input dir="ltr" type="number" step="0.1" value={form.default_temperature ?? ''} onChange={e => updateForm('default_temperature', e.target.value === '' ? null : Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Max Tokens</Label>
                        <Input dir="ltr" type="number" value={form.max_tokens ?? ''} onChange={e => updateForm('max_tokens', e.target.value === '' ? null : Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Capabilities</Label>
                        <Input dir="ltr" value={form.capabilities_text} onChange={e => updateForm('capabilities_text', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      {[
                        ['is_enabled', 'Enabled'],
                        ['is_production', 'Production'],
                        ['is_chat_completion', 'Chat Completions'],
                        ['is_realtime', 'Realtime'],
                      ].map(([key, label]) => (
                        <Button
                          key={key}
                          type="button"
                          variant={(form[key as keyof EditableForm] as boolean) ? 'default' : 'outline'}
                          onClick={() => updateForm(key as keyof EditableForm, !form[key as keyof EditableForm])}
                        >
                          {(form[key as keyof EditableForm] as boolean) ? <CheckCircle2 className="w-4 h-4 ml-2" /> : <XCircle className="w-4 h-4 ml-2" />}
                          {label}
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Textarea value={form.description || ''} onChange={e => updateForm('description', e.target.value)} rows={3} />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Secret refs JSON</Label>
                        <Textarea dir="ltr" className="font-mono text-xs" value={form.secret_refs_text} onChange={e => updateForm('secret_refs_text', e.target.value)} rows={8} />
                      </div>
                      <div className="space-y-1">
                        <Label>Connection config JSON</Label>
                        <Textarea dir="ltr" className="font-mono text-xs" value={form.connection_config_text} onChange={e => updateForm('connection_config_text', e.target.value)} rows={8} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="contexts" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {AZURE_CONTEXTS.map(context => (
                <Card key={context.id}>
                  <CardHeader>
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold" dir="ltr">{context.iconLabel}</div>
                    <CardTitle className="text-base">{context.title}</CardTitle>
                    <CardDescription>{context.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge variant="outline" dir="ltr">{context.route}</Badge>
                    <p className="text-xs text-muted-foreground">{context.notes[0]}</p>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.assign(context.route)}>
                      فتح الصفحة
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="runtime" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">AZURE_OPENAI_DEPLOYMENTS_JSON</CardTitle>
                      <CardDescription>خريطة مولدة من جدول Supabase للسجلات التي تعمل كـ Chat Completions.</CardDescription>
                    </div>
                    <Button onClick={copyDeploymentMap} variant="outline" size="sm"><Copy className="w-4 h-4 ml-2" />نسخ</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 rounded-md bg-muted overflow-auto text-xs" dir="ltr">{JSON.stringify(deploymentMap, null, 2)}</pre>
                </CardContent>
              </Card>

              <Card className="border-amber-500/40">
                <CardContent className="p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    القيم هنا معرفات وروابط وأسماء أسرار فقط. لا تحفظ مفاتيح Azure الخام داخل الجدول. المفاتيح تظل داخل Supabase Secrets / Edge Runtime.
                  </p>
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

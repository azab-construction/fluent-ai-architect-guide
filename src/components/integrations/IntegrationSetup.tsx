import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Github,
  HardDrive,
  Users,
  Key,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { integrationStorage } from '@/lib/integration-storage';

interface IntegrationConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  description: string;
  setupInstructions: string[];
  settings: Record<string, any>;
  secretRefs: Record<string, string>;
  publicMetadata: Record<string, string>;
}

const DEFAULT_INTEGRATIONS: Omit<IntegrationConfig, 'status' | 'settings' | 'secretRefs' | 'publicMetadata'>[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: <Github className="w-5 h-5" />,
    description: 'اربط مستودعات GitHub عبر أسرار محفوظة على الخادم فقط',
    setupInstructions: [
      'لا تضع Personal Access Token داخل المتصفح.',
      'ضع قيمة السر داخل Supabase Secrets أو مزود أسرار الخادم.',
      'اكتب هنا اسم السر فقط مثل GITHUB_PAT.',
      'أي اختبار اتصال يجب أن يتم من Edge Function وليس من الواجهة.',
    ],
  },
  {
    id: 'drive',
    name: 'Google Drive',
    icon: <HardDrive className="w-5 h-5" />,
    description: 'ربط Google Drive عبر OAuth/Secrets من الخادم',
    setupInstructions: [
      'فعّل Google Drive API من Google Cloud.',
      'خزّن Client Secret في الخادم فقط.',
      'اكتب أسماء الأسرار فقط داخل secret_refs.',
      'استخدم Redirect/OAuth flow آمن من Backend عند التنفيذ.',
    ],
  },
  {
    id: 'company',
    name: 'خادم الشركة',
    icon: <Users className="w-5 h-5" />,
    description: 'ربط API الشركة بدون حفظ مفاتيح خام داخل المتصفح',
    setupInstructions: [
      'اكتب endpoint عام غير حساس إن احتجت.',
      'خزّن مفاتيح الوصول في Supabase Secrets.',
      'اكتب اسم السر فقط مثل COMPANY_API_KEY.',
      'نفّذ الاتصال من Edge Function مع سجل تدقيق.',
    ],
  },
];

const DEFAULT_SETTINGS: Record<string, Record<string, any>> = {
  github: { autoSync: true, maxRepos: 50, includePrivate: false },
  drive: { autoSync: true, maxFiles: 1000 },
  company: { timeout: 30, retryAttempts: 3, enableCaching: true },
};

const DEFAULT_SECRET_REFS: Record<string, Record<string, string>> = {
  github: { token: 'GITHUB_PAT' },
  drive: { clientSecret: 'GOOGLE_DRIVE_CLIENT_SECRET' },
  company: { apiKey: 'COMPANY_API_KEY' },
};

const DEFAULT_PUBLIC_METADATA: Record<string, Record<string, string>> = {
  github: { owner: 'AlazabDev' },
  drive: { clientId: '' },
  company: { endpoint: '' },
};

function parseKeyValueDraft(value: string): Record<string, string> {
  return Object.fromEntries(
    value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim()];
      })
      .filter(([key, val]) => key && val),
  );
}

function toKeyValueDraft(value: Record<string, string>): string {
  return Object.entries(value || {}).map(([key, val]) => `${key}=${val}`).join('\n');
}

export const IntegrationSetup = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('github');
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [metadataDrafts, setMetadataDrafts] = useState<Record<string, string>>({});

  const activeIntegration = useMemo(
    () => integrations.find(item => item.id === activeTab),
    [activeTab, integrations],
  );

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = () => {
    const configs = DEFAULT_INTEGRATIONS.map(def => {
      const saved = integrationStorage.load(def.id);
      return {
        ...def,
        status: saved?.status || 'disconnected' as const,
        settings: saved?.settings || DEFAULT_SETTINGS[def.id] || {},
        secretRefs: saved?.secretRefs || DEFAULT_SECRET_REFS[def.id] || {},
        publicMetadata: saved?.publicMetadata || DEFAULT_PUBLIC_METADATA[def.id] || {},
      };
    });
    setIntegrations(configs);
    setSecretDrafts(Object.fromEntries(configs.map(item => [item.id, toKeyValueDraft(item.secretRefs)])));
    setMetadataDrafts(Object.fromEntries(configs.map(item => [item.id, toKeyValueDraft(item.publicMetadata)])));
  };

  const saveIntegration = (integrationId: string, status: 'connected' | 'disconnected' | 'error' = 'connected') => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    const secretRefs = parseKeyValueDraft(secretDrafts[integrationId] || '');
    const publicMetadata = parseKeyValueDraft(metadataDrafts[integrationId] || '');
    integrationStorage.save({
      id: integrationId,
      status,
      settings: integration.settings || {},
      secretRefs,
      publicMetadata,
      connectedAt: status === 'connected' ? new Date().toISOString() : undefined,
    });
    loadIntegrations();
    window.dispatchEvent(new Event('integrations-updated'));
    toast({ title: status === 'connected' ? 'تم حفظ مرجع التكامل' : 'تم تحديث التكامل', description: 'تم حفظ أسماء الأسرار فقط بدون أي قيم حساسة.' });
  };

  const handleDisconnect = (integrationId: string) => {
    integrationStorage.remove(integrationId);
    loadIntegrations();
    window.dispatchEvent(new Event('integrations-updated'));
    toast({ title: 'تم قطع الاتصال', description: 'تم حذف حالة التكامل من المتصفح.' });
  };

  const handleSettingChange = (integrationId: string, setting: string, value: any) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;
    const newSettings = { ...integration.settings, [setting]: value };
    integrationStorage.save({
      id: integrationId,
      status: integration.status,
      settings: newSettings,
      secretRefs: integration.secretRefs,
      publicMetadata: integration.publicMetadata,
      connectedAt: integration.status === 'connected' ? new Date().toISOString() : undefined,
    });
    loadIntegrations();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />محفوظ</Badge>;
      case 'error':
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="w-3 h-3 mr-1" />خطأ</Badge>;
      default:
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">غير متصل</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">إعداد التكاملات</h1>
        <p className="text-muted-foreground">إدارة آمنة للتكاملات بدون حفظ مفاتيح خام داخل المتصفح</p>
      </div>

      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3 text-sm">
          <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-semibold">سياسة الإنتاج</p>
            <p className="text-muted-foreground">هذه الصفحة تحفظ أسماء الأسرار فقط. القيم الفعلية يجب أن تكون في Supabase Secrets أو Azure Key Vault أو Backend آمن.</p>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {integrations.map((integration) => (
            <TabsTrigger key={integration.id} value={integration.id} className="flex items-center gap-2">
              {integration.icon}
              {integration.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {integrations.map((integration) => (
          <TabsContent key={integration.id} value={integration.id}>
            <Card className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">{integration.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold">{integration.name}</h3>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
                {getStatusBadge(integration.status)}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2"><Settings2 className="w-4 h-4" />خطوات الإعداد</h4>
                  <ol className="space-y-2 text-sm">
                    {integration.setupInstructions.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <Button onClick={() => window.open(integration.id === 'github' ? 'https://github.com/settings/tokens' : integration.id === 'drive' ? 'https://console.cloud.google.com' : '#', '_blank')} variant="outline" size="sm" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />فتح لوحة الخدمة
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2"><Key className="w-4 h-4" />مراجع آمنة</h4>
                  <div className="space-y-2">
                    <Label>secret_refs</Label>
                    <textarea
                      dir="ltr"
                      className="w-full min-h-28 rounded-md border bg-background px-3 py-2 text-sm font-mono"
                      value={secretDrafts[integration.id] || ''}
                      onChange={e => setSecretDrafts(prev => ({ ...prev, [integration.id]: e.target.value }))}
                      placeholder="token=GITHUB_PAT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>public metadata</Label>
                    <textarea
                      dir="ltr"
                      className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm font-mono"
                      value={metadataDrafts[integration.id] || ''}
                      onChange={e => setMetadataDrafts(prev => ({ ...prev, [integration.id]: e.target.value }))}
                      placeholder="endpoint=https://api.example.com"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => saveIntegration(integration.id)} className="flex-1">حفظ مرجع التكامل</Button>
                    <Button onClick={() => handleDisconnect(integration.id)} variant="outline">قطع</Button>
                  </div>
                </div>
              </div>

              {integration.status === 'connected' && activeIntegration?.id === integration.id && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-4">إعدادات التكامل</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(integration.settings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm">
                          {key === 'autoSync' && 'مزامنة تلقائية'}
                          {key === 'includePrivate' && 'تضمين المستودعات الخاصة'}
                          {key === 'enableCaching' && 'تفعيل التخزين المؤقت'}
                          {key === 'maxRepos' && `الحد الأقصى للمستودعات: ${value}`}
                          {key === 'maxFiles' && `الحد الأقصى للملفات: ${value}`}
                          {key === 'timeout' && `مهلة الاتصال: ${value}s`}
                          {key === 'retryAttempts' && `محاولات الإعادة: ${value}`}
                        </Label>
                        {typeof value === 'boolean' && (
                          <Switch checked={value} onCheckedChange={(checked) => handleSettingChange(integration.id, key, checked)} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

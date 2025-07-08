import React, { useState } from 'react';
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
  Settings2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IntegrationConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  apiKey?: string;
  settings: Record<string, any>;
  description: string;
  setupInstructions: string[];
}

export const IntegrationSetup = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('github');
  
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([
    {
      id: 'github',
      name: 'GitHub',
      icon: <Github className="w-5 h-5" />,
      status: 'disconnected',
      description: 'اربط مستودعات GitHub للوصول إلى الأكواد والملفات',
      setupInstructions: [
        'انتقل إلى GitHub Settings → Developer settings → Personal access tokens',
        'أنشئ token جديد مع الصلاحيات: repo, user:email, read:org',
        'انسخ الـ token والصقه أدناه',
        'اختبر الاتصال وفعّل التكامل'
      ],
      settings: {
        autoSync: true,
        maxRepos: 50,
        includePrivate: false
      }
    },
    {
      id: 'drive',
      name: 'Google Drive',
      icon: <HardDrive className="w-5 h-5" />,
      status: 'disconnected',
      description: 'اربط Google Drive للوصول إلى المستندات والملفات',
      setupInstructions: [
        'انتقل إلى Google Cloud Console',
        'أنشئ مشروع جديد أو اختر مشروع موجود',
        'فعّل Google Drive API',
        'أنشئ OAuth 2.0 credentials',
        'أضف redirect URI للتطبيق'
      ],
      settings: {
        autoSync: true,
        maxFiles: 1000,
        allowedFormats: ['pdf', 'docx', 'txt', 'xlsx']
      }
    },
    {
      id: 'company',
      name: 'خادم الشركة',
      icon: <Users className="w-5 h-5" />,
      status: 'error',
      description: 'اربط API الشركة الداخلي للوصول إلى البيانات المخصصة',
      setupInstructions: [
        'احصل على API endpoint من فريق IT',
        'احصل على API key مع الصلاحيات المناسبة',
        'تأكد من إعداد CORS settings',
        'اختبر الاتصال مع البيانات التجريبية'
      ],
      settings: {
        timeout: 30,
        retryAttempts: 3,
        enableCaching: true
      }
    }
  ]);

  const handleConnect = async (integrationId: string) => {
    toast({
      title: "جاري الاتصال...",
      description: "يتم الآن ربط التكامل، يرجى الانتظار"
    });

    // Simulate connection process
    setTimeout(() => {
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, status: 'connected' as const }
            : integration
        )
      );
      
      toast({
        title: "تم الربط بنجاح!",
        description: "تم ربط التكامل وهو جاهز للاستخدام"
      });
    }, 2000);
  };

  const handleDisconnect = (integrationId: string) => {
    setIntegrations(prev => 
      prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, status: 'disconnected' as const }
          : integration
      )
    );
    
    toast({
      title: "تم قطع الاتصال",
      description: "تم قطع اتصال التكامل بنجاح"
    });
  };

  const handleSettingChange = (integrationId: string, setting: string, value: any) => {
    setIntegrations(prev => 
      prev.map(integration => 
        integration.id === integrationId 
          ? { 
              ...integration, 
              settings: { ...integration.settings, [setting]: value }
            }
          : integration
      )
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            متصل
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            غير متصل
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            خطأ في الاتصال
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">إعداد التكاملات</h1>
        <p className="text-muted-foreground">
          اربط منصتك مع الخدمات المختلفة لتحسين تجربة الدردشة الذكية
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {integrations.map((integration) => (
            <TabsTrigger 
              key={integration.id} 
              value={integration.id}
              className="flex items-center gap-2"
            >
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
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    {integration.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{integration.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                  </div>
                </div>
                {getStatusBadge(integration.status)}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Setup Instructions */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    خطوات الإعداد
                  </h4>
                  <ol className="space-y-2 text-sm">
                    {integration.setupInstructions.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Connection Form */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    معلومات الاتصال
                  </h4>
                  
                  {integration.id === 'github' && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="github-token">Personal Access Token</Label>
                        <Input
                          id="github-token"
                          type="password"
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={() => window.open('https://github.com/settings/tokens', '_blank')}
                        variant="outline" 
                        size="sm"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        إنشاء GitHub Token
                      </Button>
                    </div>
                  )}

                  {integration.id === 'drive' && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="drive-client-id">Client ID</Label>
                        <Input
                          id="drive-client-id"
                          placeholder="xxxxxxxxx.apps.googleusercontent.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="drive-client-secret">Client Secret</Label>
                        <Input
                          id="drive-client-secret"
                          type="password"
                          placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={() => window.open('https://console.cloud.google.com', '_blank')}
                        variant="outline" 
                        size="sm"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Google Cloud Console
                      </Button>
                    </div>
                  )}

                  {integration.id === 'company' && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="company-endpoint">API Endpoint</Label>
                        <Input
                          id="company-endpoint"
                          placeholder="https://api.company.com/v1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company-key">API Key</Label>
                        <Input
                          id="company-key"
                          type="password"
                          placeholder="sk-xxxxxxxxxxxxxxxx"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    {integration.status === 'connected' ? (
                      <Button 
                        onClick={() => handleDisconnect(integration.id)}
                        variant="outline" 
                        className="w-full"
                      >
                        قطع الاتصال
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleConnect(integration.id)}
                        className="w-full bg-gradient-to-r from-ai-primary to-ai-accent"
                      >
                        ربط التكامل
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Settings */}
              {integration.status === 'connected' && (
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
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => 
                              handleSettingChange(integration.id, key, checked)
                            }
                          />
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
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Key, CheckCircle, Bot, Zap } from 'lucide-react';
import { aiConfigManager, AIConfig, AIProvider } from '@/lib/ai-providers';
import { useToast } from '@/hooks/use-toast';

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigSaved: () => void;
}

export const ApiKeyModal = ({ open, onOpenChange, onConfigSaved }: ApiKeyModalProps) => {
  const { toast } = useToast();
  const [provider, setProvider] = useState<AIProvider>('deepseek');
  const [openaiConfig, setOpenaiConfig] = useState({
    apiKey: '',
    endpoint: '',
    deployment: '',
    apiVersion: '2024-02-15-preview'
  });
  const [deepseekConfig, setDeepseekConfig] = useState({
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat'
  });

  useEffect(() => {
    const savedConfig = aiConfigManager.load();
    if (savedConfig) {
      setProvider(savedConfig.provider);
      if (savedConfig.provider === 'openai') {
        setOpenaiConfig({
          apiKey: savedConfig.apiKey,
          endpoint: savedConfig.endpoint,
          deployment: savedConfig.deployment,
          apiVersion: savedConfig.apiVersion
        });
      } else if (savedConfig.provider === 'deepseek') {
        setDeepseekConfig({
          apiKey: savedConfig.apiKey,
          baseUrl: savedConfig.baseUrl || 'https://api.deepseek.com',
          model: savedConfig.model
        });
      }
    }
  }, []);

  const handleSave = () => {
    let config: AIConfig;
    
    if (provider === 'openai') {
      if (!openaiConfig.apiKey || !openaiConfig.endpoint || !openaiConfig.deployment) {
        toast({
          title: "خطأ في البيانات",
          description: "يرجى ملء جميع الحقول المطلوبة لـ OpenAI",
          variant: "destructive"
        });
        return;
      }
      config = {
        provider: 'openai',
        ...openaiConfig
      };
    } else {
      if (!deepseekConfig.apiKey || !deepseekConfig.model) {
        toast({
          title: "خطأ في البيانات",
          description: "يرجى ملء جميع الحقول المطلوبة لـ DeepSeek",
          variant: "destructive"
        });
        return;
      }
      config = {
        provider: 'deepseek',
        ...deepseekConfig
      };
    }

    try {
      aiConfigManager.save(config);
      toast({
        title: "تم الحفظ بنجاح",
        description: `تم حفظ إعدادات ${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} بنجاح`
      });
      onConfigSaved();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            إعدادات الذكاء الاصطناعي
          </DialogTitle>
        </DialogHeader>

        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-muted-foreground mt-1" />
            <div className="flex-1 text-sm">
              <p className="font-medium">حماية البيانات</p>
              <p className="text-muted-foreground mt-1">
                جميع المفاتيح تُحفظ محلياً في متصفحك ولا تُرسل لأي خادم آخر
              </p>
            </div>
          </div>
        </Card>

        <Tabs value={provider} onValueChange={(value) => setProvider(value as AIProvider)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deepseek" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              DeepSeek
            </TabsTrigger>
            <TabsTrigger value="openai" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              OpenAI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deepseek" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="deepseek-api-key">مفتاح API *</Label>
              <Input
                id="deepseek-api-key"
                type="password"
                value={deepseekConfig.apiKey}
                onChange={(e) => setDeepseekConfig({ ...deepseekConfig, apiKey: e.target.value })}
                placeholder="sk-..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                احصل على مفتاحك من <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.deepseek.com</a>
              </p>
            </div>

            <div>
              <Label htmlFor="deepseek-model">النموذج *</Label>
              <Input
                id="deepseek-model"
                value={deepseekConfig.model}
                onChange={(e) => setDeepseekConfig({ ...deepseekConfig, model: e.target.value })}
                placeholder="deepseek-chat"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="deepseek-base-url">رابط API</Label>
              <Input
                id="deepseek-base-url"
                value={deepseekConfig.baseUrl}
                onChange={(e) => setDeepseekConfig({ ...deepseekConfig, baseUrl: e.target.value })}
                placeholder="https://api.deepseek.com"
                className="mt-1"
              />
            </div>
          </TabsContent>

          <TabsContent value="openai" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="openai-api-key">مفتاح API *</Label>
              <Input
                id="openai-api-key"
                type="password"
                value={openaiConfig.apiKey}
                onChange={(e) => setOpenaiConfig({ ...openaiConfig, apiKey: e.target.value })}
                placeholder="مفتاح Azure OpenAI"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="openai-endpoint">نقطة النهاية *</Label>
              <Input
                id="openai-endpoint"
                value={openaiConfig.endpoint}
                onChange={(e) => setOpenaiConfig({ ...openaiConfig, endpoint: e.target.value })}
                placeholder="https://your-resource.openai.azure.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="openai-deployment">اسم النشر *</Label>
              <Input
                id="openai-deployment"
                value={openaiConfig.deployment}
                onChange={(e) => setOpenaiConfig({ ...openaiConfig, deployment: e.target.value })}
                placeholder="gpt-4o"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="openai-version">إصدار API</Label>
              <Input
                id="openai-version"
                value={openaiConfig.apiVersion}
                onChange={(e) => setOpenaiConfig({ ...openaiConfig, apiVersion: e.target.value })}
                className="mt-1"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-ai-primary to-ai-accent"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            حفظ الإعدادات
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
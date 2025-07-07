import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Settings, Key, CheckCircle } from 'lucide-react';
import { configManager } from '@/lib/azure-openai';
import { useToast } from '@/hooks/use-toast';

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigSaved: () => void;
}

export const ApiKeyModal = ({ open, onOpenChange, onConfigSaved }: ApiKeyModalProps) => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    apiKey: '',
    endpoint: '',
    deployment: '',
    apiVersion: '2024-02-15-preview'
  });

  useEffect(() => {
    const savedConfig = configManager.load();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

  const handleSave = () => {
    if (!config.apiKey || !config.endpoint || !config.deployment) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    try {
      configManager.save(config);
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ إعدادات Azure OpenAI بنجاح"
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            إعدادات Azure OpenAI
          </DialogTitle>
        </DialogHeader>

        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-muted-foreground mt-1" />
            <div className="flex-1 text-sm">
              <p className="font-medium">معلومة مهمة</p>
              <p className="text-muted-foreground mt-1">
                ستُحفظ هذه البيانات محلياً في متصفحك فقط ولن تُرسل لأي خادم آخر
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <div>
            <Label htmlFor="apiKey">API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="مفتاح API الخاص بك"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="endpoint">Endpoint *</Label>
            <Input
              id="endpoint"
              value={config.endpoint}
              onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
              placeholder="https://your-resource.openai.azure.com/"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="deployment">Deployment Name *</Label>
            <Input
              id="deployment"
              value={config.deployment}
              onChange={(e) => setConfig({ ...config, deployment: e.target.value })}
              placeholder="gpt-4o"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="apiVersion">API Version</Label>
            <Input
              id="apiVersion"
              value={config.apiVersion}
              onChange={(e) => setConfig({ ...config, apiVersion: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

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
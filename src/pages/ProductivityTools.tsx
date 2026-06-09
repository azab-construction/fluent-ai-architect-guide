import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, FileText, Languages, Mail, PenLine, ListChecks, Sparkles } from 'lucide-react';
import { runTool, ToolKey } from '@/lib/azure-direct';
import { useToast } from '@/hooks/use-toast';

const TOOLS: { key: ToolKey; label: string; icon: any; desc: string }[] = [
  { key: 'summarize', label: 'تلخيص نص', icon: FileText, desc: 'لخّص أي نص طويل في نقاط واضحة.' },
  { key: 'translate', label: 'ترجمة', icon: Languages, desc: 'ترجم بين العربية والإنجليزية وغيرها.' },
  { key: 'rewrite', label: 'إعادة صياغة', icon: PenLine, desc: 'حسّن الصياغة، النبرة، والوضوح.' },
  { key: 'email', label: 'كاتب البريد', icon: Mail, desc: 'اكتب رسائل بريد احترافية بسرعة.' },
  { key: 'extract', label: 'استخراج النقاط', icon: ListChecks, desc: 'استخرج المهام، التواريخ والقرارات.' },
  { key: 'brainstorm', label: 'عصف ذهني', icon: Sparkles, desc: 'احصل على أفكار وحلول إبداعية.' },
];

// Prompt logic now lives in src/lib/azure-direct.ts (TOOL_TEMPLATES)


const ProductivityTools = () => {
  const { toast } = useToast();
  const [active, setActive] = useState<ToolKey>('summarize');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [opt, setOpt] = useState<Record<string, string>>({});

  const run = async () => {
    if (!input.trim()) {
      toast({ title: 'أدخل نصاً أولاً', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setOutput('');
    try {
      const messages = buildPrompt(active, input, opt);
      const res = await callAzureOpenAI({ messages, temperature: 0.5, maxTokens: 1500, task: active });
      setOutput(res);
    } catch (e) {
      toast({ title: 'فشل الاستدعاء', description: e instanceof Error ? e.message : 'خطأ غير معروف', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    toast({ title: 'تم النسخ' });
  };

  const renderOptions = () => {
    switch (active) {
      case 'summarize':
        return (
          <div>
            <Label className="text-xs">أسلوب التلخيص</Label>
            <Select value={opt.style || 'نقاط موجزة'} onValueChange={(v) => setOpt({ ...opt, style: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="نقاط موجزة">نقاط موجزة</SelectItem>
                <SelectItem value="فقرة قصيرة">فقرة قصيرة</SelectItem>
                <SelectItem value="ملخص تنفيذي">ملخص تنفيذي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'translate':
        return (
          <div>
            <Label className="text-xs">اللغة الهدف</Label>
            <Select value={opt.lang || 'الإنجليزية'} onValueChange={(v) => setOpt({ ...opt, lang: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="الإنجليزية">الإنجليزية</SelectItem>
                <SelectItem value="العربية">العربية</SelectItem>
                <SelectItem value="الفرنسية">الفرنسية</SelectItem>
                <SelectItem value="الألمانية">الألمانية</SelectItem>
                <SelectItem value="التركية">التركية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'rewrite':
      case 'email':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">النبرة</Label>
              <Select value={opt.tone || 'احترافية'} onValueChange={(v) => setOpt({ ...opt, tone: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="احترافية">احترافية</SelectItem>
                  <SelectItem value="ودية">ودية</SelectItem>
                  <SelectItem value="مختصرة">مختصرة</SelectItem>
                  <SelectItem value="رسمية">رسمية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {active === 'email' && (
              <div>
                <Label className="text-xs">اللغة</Label>
                <Select value={opt.lang || 'العربية'} onValueChange={(v) => setOpt({ ...opt, lang: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="العربية">العربية</SelectItem>
                    <SelectItem value="الإنجليزية">الإنجليزية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      case 'brainstorm':
        return (
          <div>
            <Label className="text-xs">عدد الأفكار</Label>
            <Input type="number" min={3} max={20} value={opt.count || '8'}
              onChange={(e) => setOpt({ ...opt, count: e.target.value })} className="h-9" />
          </div>
        );
      default: return null;
    }
  };

  const currentTool = TOOLS.find(t => t.key === active)!;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6" dir="rtl">
          <header>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              أدوات الإنتاجية
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              مدعومة بـ Azure OpenAI مباشرة عبر مفاتيحك الآمنة على الخادم.
            </p>
          </header>

          <Tabs value={active} onValueChange={(v) => { setActive(v as ToolKey); setOutput(''); setOpt({}); }}>
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto">
              {TOOLS.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="flex flex-col gap-1 py-2 text-xs">
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {TOOLS.map(t => (
              <TabsContent key={t.key} value={t.key} className="mt-4">
                <Card className="p-5 space-y-4">
                  <div>
                    <h2 className="font-semibold flex items-center gap-2">
                      <t.icon className="w-4 h-4 text-primary" /> {t.label}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                  </div>

                  {renderOptions()}

                  <div>
                    <Label className="text-xs">المدخل</Label>
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="الصق النص هنا..."
                      className="min-h-[160px] mt-1"
                    />
                  </div>

                  <Button onClick={run} disabled={loading} className="w-full bg-gradient-to-r from-ai-primary to-ai-accent">
                    {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Sparkles className="w-4 h-4 ml-2" />}
                    {loading ? 'جارٍ المعالجة...' : `تشغيل ${currentTool.label}`}
                  </Button>

                  {output && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">النتيجة</Label>
                        <Button size="sm" variant="ghost" onClick={copy}>
                          <Copy className="w-3.5 h-3.5 ml-1" /> نسخ
                        </Button>
                      </div>
                      <div className="rounded-md border bg-muted/30 p-4 whitespace-pre-wrap text-sm leading-relaxed">
                        {output}
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ProductivityTools;

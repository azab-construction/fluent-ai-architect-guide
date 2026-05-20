import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Wand2, Scissors, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const callChat = async (system: string, user: string) => {
  const { data, error } = await supabase.functions.invoke('azure-ai-chat', {
    body: { model: 'gpt-5', messages: [{ role: 'system', content: system }, { role: 'user', content: user }] },
  });
  if (error) throw error;
  return data?.content || '';
};

const AIProcessing = () => {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [catalog, setCatalog] = useState('SKU-001: تركيب باب خشبي\nSKU-002: صيانة مكيف\nSKU-003: دهان جدران');
  const [chunkSize, setChunkSize] = useState(500);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (op: 'clean' | 'split' | 'match') => {
    if (!input.trim()) return toast({ title: 'أدخل نصاً', variant: 'destructive' });
    setLoading(op); setOutput('');
    try {
      if (op === 'clean') {
        const txt = await callChat(
          'نظّف النص: احذف الرموز الزائدة، صحّح الإملاء، وحّد الصياغة العربية. أعد النص النظيف فقط.',
          input,
        );
        setOutput(txt);
      } else if (op === 'split') {
        const chunks: string[] = [];
        const sents = input.split(/(?<=[.!؟\n])\s+/);
        let cur = '';
        for (const s of sents) {
          if ((cur + s).length > chunkSize) { if (cur) chunks.push(cur.trim()); cur = s; }
          else cur += ' ' + s;
        }
        if (cur.trim()) chunks.push(cur.trim());
        setOutput(chunks.map((c, i) => `--- جزء ${i + 1} (${c.length} حرف) ---\n${c}`).join('\n\n'));
      } else {
        const txt = await callChat(
          `أنت مصنّف منتجات. كتالوج:\n${catalog}\n\nاقرأ النص واستخرج كل بند مع SKU الأنسب. أعد JSON: {"matches":[{"text":"","sku":"","confidence":0.0}]}.`,
          input,
        );
        setOutput(txt);
      }
    } catch (e: any) { toast({ title: 'فشل', description: e.message, variant: 'destructive' }); }
    finally { setLoading(null); }
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">AI Processing Layer</h1>
            <p className="text-sm text-muted-foreground">تنظيف النصوص، تقسيمها لأجزاء، وربطها بأكواد المنتجات/الخدمات</p>
          </div>

          <Card className="p-4 space-y-3">
            <Label>النص المُدخل</Label>
            <Textarea value={input} onChange={e => setInput(e.target.value)} className="min-h-[180px]" placeholder="ألصق النص هنا..." />
          </Card>

          <Tabs defaultValue="clean">
            <TabsList>
              <TabsTrigger value="clean" className="gap-2"><Wand2 className="w-4 h-4" />تنظيف</TabsTrigger>
              <TabsTrigger value="split" className="gap-2"><Scissors className="w-4 h-4" />تقسيم</TabsTrigger>
              <TabsTrigger value="match" className="gap-2"><LinkIcon className="w-4 h-4" />ربط SKU</TabsTrigger>
            </TabsList>

            <TabsContent value="clean">
              <Card className="p-4">
                <Button onClick={() => run('clean')} disabled={loading === 'clean'} className="gap-2">
                  {loading === 'clean' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  تنظيف بـAI
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="split">
              <Card className="p-4 space-y-3">
                <Label>حجم الجزء (أحرف)</Label>
                <Input type="number" value={chunkSize} onChange={e => setChunkSize(Number(e.target.value))} className="w-32" />
                <Button onClick={() => run('split')} className="gap-2">
                  <Scissors className="w-4 h-4" />تقسيم
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="match">
              <Card className="p-4 space-y-3">
                <Label>كتالوج المنتجات/الخدمات (SKU: الوصف)</Label>
                <Textarea value={catalog} onChange={e => setCatalog(e.target.value)} className="min-h-[120px] font-mono text-xs" />
                <Button onClick={() => run('match')} disabled={loading === 'match'} className="gap-2">
                  {loading === 'match' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                  ربط بـAI
                </Button>
              </Card>
            </TabsContent>
          </Tabs>

          {output && (
            <Card className="p-4">
              <Label>النتيجة</Label>
              <Textarea value={output} readOnly className="min-h-[300px] font-mono text-xs" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIProcessing;

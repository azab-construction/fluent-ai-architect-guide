import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bot, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Msg { role: 'user' | 'assistant'; content: string; sources?: any[] }

const QAAgent = () => {
  const { toast } = useToast();
  const [index, setIndex] = useState(localStorage.getItem('alazab_search_index') || '');
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!input.trim() || !index) return toast({ title: 'أدخل الفهرس والسؤال', variant: 'destructive' });
    localStorage.setItem('alazab_search_index', index);
    const question = input.trim();
    setInput(''); setLoading(true);
    const next: Msg[] = [...msgs, { role: 'user', content: question }];
    setMsgs(next);
    try {
      // 1) Retrieve from Azure Search
      const { data: sr, error: sErr } = await supabase.functions.invoke('azure-search', {
        body: { index, query: question, top: 5 },
      });
      if (sErr) throw sErr;
      const sources = sr?.results || [];
      const context = sources.map((r: any, i: number) =>
        `[المصدر ${i + 1}]\n${JSON.stringify(r, null, 2).slice(0, 1500)}`
      ).join('\n\n');

      // 2) Ask Azure OpenAI with context
      const sys = `أنت مساعد العزب. أجب فقط بناءً على المصادر المرفقة. اذكر رقم المصدر [م١] بين قوسين. إن لم تجد إجابة قل "لا توجد بيانات كافية".\n\nالمصادر:\n${context}`;
      const history = next.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const { data: cr, error: cErr } = await supabase.functions.invoke('azure-ai-chat', {
        body: { model: 'gpt-5', messages: [{ role: 'system', content: sys }, ...history] },
      });
      if (cErr) throw cErr;

      setMsgs([...next, { role: 'assistant', content: cr?.content || '', sources }]);
    } catch (e: any) {
      toast({ title: 'فشل', description: e.message, variant: 'destructive' });
      setMsgs(next);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-hidden flex flex-col p-6">
        <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col gap-4 overflow-hidden">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="w-6 h-6" />مساعد الاستفسارات (RAG)</h1>
            <p className="text-sm text-muted-foreground">مثال: "ما تاريخ آخر صيانة لفرع المعادي؟"</p>
          </div>

          <Card className="p-3">
            <Label className="text-xs">اسم فهرس البحث</Label>
            <Input value={index} onChange={e => setIndex(e.target.value)} placeholder="maintenance-requests" dir="ltr" />
          </Card>

          <Card className="flex-1 p-4 overflow-y-auto space-y-3">
            {msgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">ابدأ بطرح سؤالك...</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${m.role === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-current/20 flex flex-wrap gap-1">
                      {m.sources.map((_, si) => <Badge key={si} variant="secondary" className="text-[10px]">م{si + 1}</Badge>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Card>

          <div className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="اكتب سؤالك..." onKeyDown={e => e.key === 'Enter' && !loading && ask()} />
            <Button onClick={ask} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              إرسال
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QAAgent;

import React, { useRef, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, FileText, Mic, MicOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const fileToBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result as string);
  r.onerror = rej;
  r.readAsDataURL(f);
});

const VisionOCR = () => {
  const { toast } = useToast();
  // image
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgRes, setImgRes] = useState<any>(null);
  const [imgLoad, setImgLoad] = useState(false);
  // pdf
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfRes, setPdfRes] = useState<any>(null);
  const [pdfLoad, setPdfLoad] = useState(false);
  // speech (browser)
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recogRef = useRef<any>(null);

  const runImage = async () => {
    if (!imgFile) return toast({ title: 'اختر صورة', variant: 'destructive' });
    setImgLoad(true); setImgRes(null);
    try {
      const imageBase64 = await fileToBase64(imgFile);
      const { data, error } = await supabase.functions.invoke('azure-vision', {
        body: { imageBase64, features: 'read,caption,tags' },
      });
      if (error) throw error;
      setImgRes(data);
    } catch (e: any) { toast({ title: 'فشل', description: e.message, variant: 'destructive' }); }
    finally { setImgLoad(false); }
  };

  const runPdf = async () => {
    if (!pdfFile) return toast({ title: 'اختر ملف', variant: 'destructive' });
    setPdfLoad(true); setPdfRes(null);
    try {
      const fileBase64 = await fileToBase64(pdfFile);
      const { data, error } = await supabase.functions.invoke('azure-docint', {
        body: { fileBase64, model: 'prebuilt-read' },
      });
      if (error) throw error;
      setPdfRes(data);
    } catch (e: any) { toast({ title: 'فشل', description: e.message, variant: 'destructive' }); }
    finally { setPdfLoad(false); }
  };

  const toggleSpeech = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast({ title: 'المتصفح لا يدعم التعرف الصوتي', variant: 'destructive' });
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const recog = new SR();
    recog.lang = 'ar-EG'; recog.continuous = true; recog.interimResults = true;
    recog.onresult = (e: any) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript + ' ';
      setTranscript(txt);
    };
    recog.onend = () => setListening(false);
    recog.onerror = (e: any) => toast({ title: 'خطأ صوتي', description: e.error, variant: 'destructive' });
    recog.start(); recogRef.current = recog; setListening(true);
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Vision / OCR / Speech</h1>
            <p className="text-sm text-muted-foreground">تحليل صور الأعطال، استخراج نصوص PDF، تفريغ ملفات صوتية من واتساب</p>
          </div>

          <Tabs defaultValue="image">
            <TabsList>
              <TabsTrigger value="image" className="gap-2"><Eye className="w-4 h-4" />صورة عطل</TabsTrigger>
              <TabsTrigger value="pdf" className="gap-2"><FileText className="w-4 h-4" />PDF</TabsTrigger>
              <TabsTrigger value="speech" className="gap-2"><Mic className="w-4 h-4" />صوت</TabsTrigger>
            </TabsList>

            <TabsContent value="image">
              <Card className="p-4 space-y-4">
                <Label>صورة (JPG/PNG)</Label>
                <Input type="file" accept="image/*" onChange={e => setImgFile(e.target.files?.[0] || null)} />
                <Button onClick={runImage} disabled={imgLoad} className="gap-2">
                  {imgLoad ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  تحليل
                </Button>
                {imgRes && (
                  <div className="space-y-3">
                    {imgRes.caption && <p className="text-sm"><strong>الوصف:</strong> {imgRes.caption}</p>}
                    {imgRes.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {imgRes.tags.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
                      </div>
                    )}
                    <Textarea value={imgRes.text || ''} readOnly className="min-h-[200px] font-mono text-xs" />
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="pdf">
              <Card className="p-4 space-y-4">
                <Label>PDF / Image / Docx</Label>
                <Input type="file" accept=".pdf,.png,.jpg,.docx" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                <Button onClick={runPdf} disabled={pdfLoad} className="gap-2">
                  {pdfLoad ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  استخراج النص
                </Button>
                {pdfRes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{pdfRes.pages} صفحة</p>
                    <Textarea value={pdfRes.content || ''} readOnly className="min-h-[300px] font-mono text-xs" />
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="speech">
              <Card className="p-4 space-y-4">
                <p className="text-xs text-muted-foreground">تفريغ صوت فوري من الميكروفون (Web Speech API — للملفات الصوتية المخزنة سيتم إضافة Azure Speech قريباً).</p>
                <Button onClick={toggleSpeech} variant={listening ? 'destructive' : 'default'} className="gap-2">
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {listening ? 'إيقاف' : 'بدء التسجيل'}
                </Button>
                <Textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="النص المُفرَّغ..." className="min-h-[250px]" />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default VisionOCR;

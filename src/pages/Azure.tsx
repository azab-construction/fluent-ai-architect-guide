import React, { useState, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScanText, FileSearch, Search as SearchIcon, Eye, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const Azure = () => {
  const { toast } = useToast();

  // Vision
  const [visionFile, setVisionFile] = useState<File | null>(null);
  const [visionUrl, setVisionUrl] = useState('');
  const [visionResult, setVisionResult] = useState<any>(null);
  const [visionLoading, setVisionLoading] = useState(false);

  // DocInt
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState('');
  const [docModel, setDocModel] = useState<'prebuilt-read' | 'prebuilt-layout' | 'prebuilt-document'>('prebuilt-read');
  const [docResult, setDocResult] = useState<any>(null);
  const [docLoading, setDocLoading] = useState(false);

  // Search
  const [searchIndex, setSearchIndex] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTop, setSearchTop] = useState(5);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const runVision = async () => {
    if (!visionFile && !visionUrl) {
      toast({ title: 'أدخل صورة أو رابط', variant: 'destructive' });
      return;
    }
    setVisionLoading(true); setVisionResult(null);
    try {
      const body: any = { features: 'read,caption,tags' };
      if (visionFile) body.imageBase64 = await fileToBase64(visionFile);
      else body.imageUrl = visionUrl;
      const { data, error } = await supabase.functions.invoke('azure-vision', { body });
      if (error) throw error;
      setVisionResult(data);
    } catch (e: any) {
      toast({ title: 'فشل تحليل الصورة', description: e.message, variant: 'destructive' });
    } finally { setVisionLoading(false); }
  };

  const runDocInt = async () => {
    if (!docFile && !docUrl) {
      toast({ title: 'أدخل ملف أو رابط', variant: 'destructive' });
      return;
    }
    setDocLoading(true); setDocResult(null);
    try {
      const body: any = { model: docModel };
      if (docFile) body.fileBase64 = await fileToBase64(docFile);
      else body.fileUrl = docUrl;
      const { data, error } = await supabase.functions.invoke('azure-docint', { body });
      if (error) throw error;
      setDocResult(data);
    } catch (e: any) {
      toast({ title: 'فشل استخراج المستند', description: e.message, variant: 'destructive' });
    } finally { setDocLoading(false); }
  };

  const runSearch = async () => {
    if (!searchIndex || !searchQuery) {
      toast({ title: 'أدخل اسم الفهرس والاستعلام', variant: 'destructive' });
      return;
    }
    setSearchLoading(true); setSearchResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('azure-search', {
        body: { index: searchIndex, query: searchQuery, top: searchTop },
      });
      if (error) throw error;
      setSearchResult(data);
    } catch (e: any) {
      toast({ title: 'فشل البحث', description: e.message, variant: 'destructive' });
    } finally { setSearchLoading(false); }
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">أدوات Azure AI</h1>
            <p className="text-sm text-muted-foreground">Vision OCR · Document Intelligence · Cognitive Search — عبر APIM</p>
          </div>

          <Tabs defaultValue="vision">
            <TabsList>
              <TabsTrigger value="vision" className="gap-2"><Eye className="w-4 h-4" />Vision</TabsTrigger>
              <TabsTrigger value="docint" className="gap-2"><FileSearch className="w-4 h-4" />Document Intelligence</TabsTrigger>
              <TabsTrigger value="search" className="gap-2"><SearchIcon className="w-4 h-4" />Cognitive Search</TabsTrigger>
            </TabsList>

            <TabsContent value="vision">
              <Card className="p-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>صورة من جهازك</Label>
                    <Input type="file" accept="image/*" onChange={e => setVisionFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label>أو رابط صورة (URL)</Label>
                    <Input value={visionUrl} onChange={e => setVisionUrl(e.target.value)} placeholder="https://..." dir="ltr" />
                  </div>
                </div>
                <Button onClick={runVision} disabled={visionLoading} className="gap-2">
                  {visionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
                  تحليل
                </Button>
                {visionResult && (
                  <div className="space-y-3">
                    {visionResult.caption && (
                      <div><Label>الوصف</Label><p className="text-sm">{visionResult.caption}</p></div>
                    )}
                    {visionResult.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {visionResult.tags.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
                      </div>
                    )}
                    <div>
                      <Label>النص المستخرج</Label>
                      <Textarea value={visionResult.text || ''} readOnly className="min-h-[200px] font-mono text-xs" />
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="docint">
              <Card className="p-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <Label>ملف (PDF/Image/Docx)</Label>
                    <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.docx" onChange={e => setDocFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label>أو رابط الملف</Label>
                    <Input value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="https://..." dir="ltr" />
                  </div>
                  <div>
                    <Label>النموذج</Label>
                    <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={docModel} onChange={e => setDocModel(e.target.value as any)}>
                      <option value="prebuilt-read">prebuilt-read (نص فقط)</option>
                      <option value="prebuilt-layout">prebuilt-layout (تخطيط + جداول)</option>
                      <option value="prebuilt-document">prebuilt-document (عام)</option>
                    </select>
                  </div>
                </div>
                <Button onClick={runDocInt} disabled={docLoading} className="gap-2">
                  {docLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  استخراج
                </Button>
                {docResult && (
                  <div>
                    <Label>المحتوى ({docResult.pages} صفحة)</Label>
                    <Textarea value={docResult.content || ''} readOnly className="min-h-[300px] font-mono text-xs" />
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="search">
              <Card className="p-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <Label>اسم الفهرس (Index)</Label>
                    <Input value={searchIndex} onChange={e => setSearchIndex(e.target.value)} placeholder="index-name" dir="ltr" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>الاستعلام</Label>
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث عن..." />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-sm">عدد النتائج</Label>
                  <Input type="number" min={1} max={50} value={searchTop} onChange={e => setSearchTop(Number(e.target.value))} className="w-24" />
                  <Button onClick={runSearch} disabled={searchLoading} className="gap-2">
                    {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
                    بحث
                  </Button>
                </div>
                {searchResult && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">عدد النتائج: {searchResult.results?.length || 0}</p>
                    {searchResult.results?.map((r: any, i: number) => (
                      <Card key={i} className="p-3 text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">#{i + 1}</Badge>
                          {r['@search.score'] && <span className="text-xs text-muted-foreground">score: {r['@search.score'].toFixed(3)}</span>}
                        </div>
                        <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(r, null, 2)}</pre>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Azure;

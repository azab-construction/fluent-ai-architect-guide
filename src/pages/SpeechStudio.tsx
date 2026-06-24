import { useState, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Mic, Volume2, Upload, Download, Trash2, FileAudio, Play, Pause, Copy, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface STTJob {
  id: string;
  file: File;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  text?: string;
  error?: string;
  durationMs?: number;
}

const VOICES = [
  { id: 'alloy', label: 'Alloy — متوازن' },
  { id: 'echo', label: 'Echo — رجالي عميق' },
  { id: 'fable', label: 'Fable — حكواتي' },
  { id: 'onyx', label: 'Onyx — رجالي قوي' },
  { id: 'nova', label: 'Nova — نسائي حيوي' },
  { id: 'shimmer', label: 'Shimmer — نسائي ناعم' },
];

const STT_MODELS = [
  { id: 'openai/gpt-4o-mini-transcribe', label: 'GPT-4o mini (سريع وموفّر)' },
  { id: 'openai/gpt-4o-transcribe', label: 'GPT-4o (أعلى دقة)' },
];

const MAX_PARALLEL = 3;
const MAX_SIZE = 25 * 1024 * 1024;

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

const chunkText = (text: string, max = 3500): string[] => {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?؟।])\s+/);
  let cur = '';
  for (const s of sentences) {
    if ((cur + ' ' + s).length > max) {
      if (cur) chunks.push(cur);
      cur = s;
    } else {
      cur = cur ? cur + ' ' + s : s;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
};

const SpeechStudio = () => {
  const { toast } = useToast();

  // ============ STT State ============
  const [jobs, setJobs] = useState<STTJob[]>([]);
  const [sttModel, setSttModel] = useState(STT_MODELS[0].id);
  const [sttLang, setSttLang] = useState<string>('auto');
  const [recording, setRecording] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============ TTS State ============
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('alloy');
  const [ttsModel, setTtsModel] = useState('openai/tts-1');
  const [ttsFormat, setTtsFormat] = useState<'mp3' | 'wav' | 'opus' | 'aac' | 'flac'>('mp3');
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0);
  const [ttsAudio, setTtsAudio] = useState<{ url: string; blob: Blob } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  // ============ STT Logic ============
  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid: STTJob[] = [];
    for (const f of arr) {
      if (f.size > MAX_SIZE) {
        toast({ title: `${f.name} يتجاوز 25MB`, variant: 'destructive' });
        continue;
      }
      valid.push({
        id: crypto.randomUUID(),
        file: f,
        status: 'queued',
        progress: 0,
      });
    }
    if (valid.length) {
      setJobs(prev => [...prev, ...valid]);
      // kick processing
      setTimeout(processQueue, 100);
    }
  };

  const processQueue = async () => {
    setJobs(prev => {
      const active = prev.filter(j => j.status === 'processing').length;
      const slots = MAX_PARALLEL - active;
      if (slots <= 0) return prev;
      const next = prev.filter(j => j.status === 'queued').slice(0, slots);
      next.forEach(j => runJob(j.id));
      return prev.map(j => next.find(n => n.id === j.id) ? { ...j, status: 'processing' as const, progress: 10 } : j);
    });
  };

  const runJob = async (id: string) => {
    const job = await new Promise<STTJob | undefined>(resolve => {
      setJobs(prev => { resolve(prev.find(j => j.id === id)); return prev; });
    });
    if (!job) return;

    const t0 = Date.now();
    try {
      const fd = new FormData();
      fd.append('file', job.file);
      fd.append('model', sttModel);
      if (sttLang && sttLang !== 'auto') fd.append('language', sttLang);

      setJobs(prev => prev.map(j => j.id === id ? { ...j, progress: 40 } : j));

      const { data, error } = await supabase.functions.invoke('speech-to-text', { body: fd });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.details || data.error);

      const text = data?.text || '';
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'done', progress: 100, text, durationMs: Date.now() - t0 } : j));
    } catch (e: any) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'error', error: e.message || 'فشل التحويل' } : j));
    } finally {
      setTimeout(processQueue, 200);
    }
  };

  const removeJob = (id: string) => setJobs(prev => prev.filter(j => j.id !== id));
  const clearDone = () => setJobs(prev => prev.filter(j => j.status !== 'done'));

  const downloadAllText = () => {
    const done = jobs.filter(j => j.status === 'done');
    if (!done.length) return;
    const body = done.map(j => `===== ${j.file.name} =====\n${j.text}\n`).join('\n');
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `transcripts-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // Recording
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = e => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 1024) {
          toast({ title: 'التسجيل قصير جداً', variant: 'destructive' });
          return;
        }
        const ext = mime.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: mime });
        addFiles([file]);
      };
      rec.start();
      mediaRecRef.current = rec;
      setRecording(true);
    } catch (e) {
      toast({ title: 'تعذر الوصول للميكروفون', variant: 'destructive' });
    }
  };
  const stopRec = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
  };

  // ============ TTS Logic ============
  const generateTTS = async () => {
    if (!ttsText.trim()) {
      toast({ title: 'أدخل نصاً', variant: 'destructive' });
      return;
    }
    setTtsLoading(true);
    setTtsProgress(0);
    setTtsAudio(null);

    try {
      const chunks = chunkText(ttsText.trim(), 3500);
      const buffers: ArrayBuffer[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { text: chunks[i], voice: ttsVoice, model: ttsModel, format: ttsFormat },
        });
        if (error) throw new Error(error.message);
        // data is binary; supabase wrapper returns Blob
        const buf = data instanceof Blob ? await data.arrayBuffer() : data;
        buffers.push(buf);
        setTtsProgress(Math.round(((i + 1) / chunks.length) * 100));
      }

      const mimeMap: Record<string, string> = {
        mp3: 'audio/mpeg', wav: 'audio/wav', opus: 'audio/ogg', aac: 'audio/aac', flac: 'audio/flac',
      };
      const blob = new Blob(buffers, { type: mimeMap[ttsFormat] });
      const url = URL.createObjectURL(blob);
      setTtsAudio({ url, blob });
    } catch (e: any) {
      toast({ title: 'فشل التحويل', description: e.message, variant: 'destructive' });
    } finally {
      setTtsLoading(false);
    }
  };

  const downloadTTS = () => {
    if (!ttsAudio) return;
    const a = document.createElement('a');
    a.href = ttsAudio.url;
    a.download = `tts-${Date.now()}.${ttsFormat}`;
    a.click();
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'تم النسخ' });
  };

  const totalDone = jobs.filter(j => j.status === 'done').length;
  const totalJobs = jobs.length;
  const overallPct = totalJobs > 0 ? Math.round((totalDone / totalJobs) * 100) : 0;

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <header>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Volume2 className="w-6 h-6 text-primary" />
              استوديو الصوت
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              تحويل الصوت إلى نص ومن النص إلى صوت بمعالجة متوازية للملفات الكبيرة.
            </p>
          </header>

          <Tabs defaultValue="stt">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="stt" className="gap-2"><Mic className="w-4 h-4" /> صوت إلى نص</TabsTrigger>
              <TabsTrigger value="tts" className="gap-2"><Volume2 className="w-4 h-4" /> نص إلى صوت</TabsTrigger>
            </TabsList>

            {/* ============ STT TAB ============ */}
            <TabsContent value="stt" className="mt-4 space-y-4">
              <Card className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">النموذج</Label>
                    <Select value={sttModel} onValueChange={setSttModel}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STT_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">اللغة</Label>
                    <Select value={sttLang} onValueChange={setSttLang}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">كشف تلقائي</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="tr">Türkçe</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Badge variant="outline" className="text-[11px]">
                      معالجة متوازية: حتى {MAX_PARALLEL} ملفات
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac,.mp4"
                    multiple
                    hidden
                    onChange={e => e.target.files && addFiles(e.target.files)}
                  />
                  <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Upload className="w-4 h-4" /> رفع ملفات صوتية
                  </Button>
                  <Button
                    onClick={recording ? stopRec : startRec}
                    variant={recording ? 'destructive' : 'secondary'}
                    className="gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    {recording ? 'إيقاف التسجيل' : 'تسجيل من الميكروفون'}
                  </Button>
                  {totalDone > 0 && (
                    <>
                      <Button onClick={downloadAllText} variant="outline" className="gap-2">
                        <Download className="w-4 h-4" /> تنزيل الكل (TXT)
                      </Button>
                      <Button onClick={clearDone} variant="ghost" className="gap-2">
                        <Trash2 className="w-4 h-4" /> مسح المكتمل
                      </Button>
                    </>
                  )}
                </div>

                {totalJobs > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>التقدم الكلي</span>
                      <span>{totalDone} / {totalJobs}</span>
                    </div>
                    <Progress value={overallPct} className="h-2" />
                  </div>
                )}
              </Card>

              {/* Jobs list */}
              {jobs.length === 0 ? (
                <Card className="p-10 text-center border-dashed">
                  <FileAudio className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    ارفع ملفات صوتية أو سجّل من الميكروفون لبدء التحويل
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {jobs.map(j => (
                    <Card key={j.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {j.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                          {j.status === 'error' && <AlertCircle className="w-5 h-5 text-destructive" />}
                          {j.status === 'processing' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                          {j.status === 'queued' && <FileAudio className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium truncate" dir="ltr">{j.file.name}</span>
                              <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                                {formatBytes(j.file.size)}
                              </Badge>
                              {j.durationMs && (
                                <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                  {(j.durationMs / 1000).toFixed(1)}s
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {j.text && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyText(j.text!)}>
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeJob(j.id)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {(j.status === 'processing' || j.status === 'queued') && (
                            <Progress value={j.progress} className="h-1 mt-2" />
                          )}

                          {j.status === 'error' && (
                            <p className="text-xs text-destructive mt-1">{j.error}</p>
                          )}

                          {j.text && (
                            <Textarea
                              value={j.text}
                              readOnly
                              className="mt-2 text-xs min-h-[100px] font-mono"
                              dir="auto"
                            />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ============ TTS TAB ============ */}
            <TabsContent value="tts" className="mt-4 space-y-4">
              <Card className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">الصوت</Label>
                    <Select value={ttsVoice} onValueChange={setTtsVoice}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VOICES.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">النموذج</Label>
                    <Select value={ttsModel} onValueChange={setTtsModel}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai/tts-1">TTS-1 (سريع)</SelectItem>
                        <SelectItem value="openai/tts-1-hd">TTS-1-HD (جودة عالية)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">الصيغة</Label>
                    <Select value={ttsFormat} onValueChange={(v) => setTtsFormat(v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp3">MP3</SelectItem>
                        <SelectItem value="wav">WAV</SelectItem>
                        <SelectItem value="opus">OPUS</SelectItem>
                        <SelectItem value="aac">AAC</SelectItem>
                        <SelectItem value="flac">FLAC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">النص (يقسَّم تلقائياً للنصوص الطويلة)</Label>
                    <span className="text-[10px] text-muted-foreground">{ttsText.length} حرف</span>
                  </div>
                  <Textarea
                    value={ttsText}
                    onChange={e => setTtsText(e.target.value)}
                    placeholder="اكتب أو الصق النص هنا..."
                    className="min-h-[200px]"
                    dir="auto"
                  />
                </div>

                <Button
                  onClick={generateTTS}
                  disabled={ttsLoading || !ttsText.trim()}
                  className="w-full gap-2"
                >
                  {ttsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                  {ttsLoading ? `جارٍ التوليد... ${ttsProgress}%` : 'توليد الصوت'}
                </Button>

                {ttsLoading && <Progress value={ttsProgress} className="h-2" />}

                {ttsAudio && (
                  <Card className="p-4 bg-muted/30 space-y-3">
                    <div className="flex items-center gap-3">
                      <Button size="icon" onClick={togglePlay} className="rounded-full">
                        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <audio
                        ref={audioRef}
                        src={ttsAudio.url}
                        onEnded={() => setPlaying(false)}
                        controls
                        className="flex-1"
                      />
                      <Button onClick={downloadTTS} variant="outline" className="gap-2">
                        <Download className="w-4 h-4" /> تنزيل
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      الحجم: {formatBytes(ttsAudio.blob.size)} — الصيغة: {ttsFormat.toUpperCase()}
                    </p>
                  </Card>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default SpeechStudio;

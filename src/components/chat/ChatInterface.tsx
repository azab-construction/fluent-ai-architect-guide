import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, FileText, Github, HardDrive, Settings, AlertCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AIService, aiConfigManager } from '@/lib/ai-providers';
import { ApiKeyModal } from '@/components/chat/ApiKeyModal';
import { FileUploadButton } from '@/components/chat/FileUploadButton';
import { GitHubBrowser } from '@/components/chat/GitHubBrowser';
import { WoodUnitDesigner } from '@/components/chat/WoodUnitDesigner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { analyticsStorage } from '@/lib/integration-storage';
import { githubAPI } from '@/lib/github-api';
import { ParsedFile } from '@/lib/file-parser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { parseWoodRequest, specToArabicSummary, WoodUnitSpec } from '@/lib/wood-unit-parser';
import { useChatSession } from '@/lib/chat-session-store';

const WOOD_INTENT_RE = /(صمم|تصميم|اعمل|ابغى|اريد|design|build|make)\s*(لي|me)?\s*(دولاب|خزانة|خزانه|كبتة|كبت|رف|أرفف|مكتبة|طاولة|ترابيزة|مكتب|سرير|باب|wardrobe|cabinet|shelf|table|desk|bed|door|closet)/i;

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  fileName?: string;
  sources?: Array<{ type: 'github' | 'drive' | 'document'; name: string; url?: string }>;
}

function getUserPreferences() {
  try {
    const saved = localStorage.getItem('user-preferences');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { temperature: 0.7, maxTokens: 1000, language: 'ar' };
}

const WELCOME: Message = {
  id: 'welcome',
  content: 'مرحباً! أنا مساعدك الذكي. يمكنني مساعدتك في تحليل ملفاتك (PDF, TXT, DOCX) وأكوادك من GitHub. كيف يمكنني مساعدتك اليوم؟',
  role: 'assistant',
  timestamp: new Date(),
  sources: []
};

export const ChatInterface = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showGitHubBrowser, setShowGitHubBrowser] = useState(false);
  const [aiService, setAIService] = useState<AIService | null>(null);
  const [attachedFile, setAttachedFile] = useState<ParsedFile | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const { sessionId, setSession, bumpRefresh } = useChatSession();
  const [woodSpec, setWoodSpec] = useState<WoodUnitSpec | null>(null);
  const [showDesigner, setShowDesigner] = useState(false);

  useEffect(() => {
    checkConfiguration();
    setGithubConnected(githubAPI.isConnected());
    const handleIntUpdate = () => setGithubConnected(githubAPI.isConnected());
    window.addEventListener('integrations-updated', handleIntUpdate);
    return () => window.removeEventListener('integrations-updated', handleIntUpdate);
  }, []);

  // Load messages whenever session changes
  useEffect(() => {
    const load = async () => {
      if (!sessionId) {
        setMessages([WELCOME]);
        return;
      }
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at, metadata')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (error) {
        toast({ title: 'خطأ في تحميل المحادثة', description: error.message, variant: 'destructive' });
        return;
      }
      const loaded: Message[] = (data ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
        fileName: m.metadata?.fileName,
        sources: m.metadata?.sources ?? [],
      }));
      setMessages(loaded.length ? loaded : [WELCOME]);
    };
    load();
  }, [sessionId]);

  const checkConfiguration = () => {
    const configured = aiConfigManager.isConfigured();
    setIsConfigured(configured);
    if (configured) {
      const config = aiConfigManager.load();
      if (config) setAIService(new AIService(config));
    }
  };

  const handleGitHubFileSelected = (content: string, fileName: string, repoName: string) => {
    const truncated = content.length > 15000 ? content.slice(0, 15000) + '\n\n... [تم اقتطاع المحتوى]' : content;
    setAttachedFile({ name: `${repoName}/${fileName}`, type: fileName.split('.').pop() || 'txt', content: truncated, size: content.length });
  };

  const ensureSession = async (firstUserContent: string): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!user) return null;
    const title = firstUserContent.slice(0, 50) || 'محادثة جديدة';
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title })
      .select('id')
      .single();
    if (error || !data) {
      toast({ title: 'تعذّر إنشاء الجلسة', description: error?.message, variant: 'destructive' });
      return null;
    }
    setSession(data.id);
    bumpRefresh();
    return data.id;
  };

  const persistMessage = async (sid: string, msg: Message) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({
      session_id: sid,
      user_id: user.id,
      role: msg.role,
      content: msg.content,
      metadata: { fileName: msg.fileName, sources: msg.sources ?? [] },
    });
    await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sid);
  };

  const handleSendMessage = async () => {
    const trimmed = newMessage.trim();
    if (trimmed.startsWith('/')) {
      const cmd = trimmed.split(/\s+/)[0].toLowerCase();
      const map: Record<string, string> = {
        '/ocr': '/services/vision', '/docint': '/services/docint', '/search': '/services/search',
        '/calc': '/services/arch-erp', '/quote': '/engineering', '/3d': '/engineering',
        '/dxf': '/engineering', '/agent': '/services/agent',
      };
      if (map[cmd]) { setNewMessage(''); navigate(map[cmd]); return; }
      if (cmd === '/design' || cmd === '/wood') {
        const rest = trimmed.replace(/^\S+\s*/, '');
        const spec = parseWoodRequest(rest || 'دولاب');
        setWoodSpec(spec); setShowDesigner(true); setNewMessage('');
        return;
      }
    }

    // Auto-detect wood design intent
    if (trimmed && WOOD_INTENT_RE.test(trimmed)) {
      const spec = parseWoodRequest(trimmed);
      setWoodSpec(spec);
      setShowDesigner(true);
    }

    if (!trimmed && !attachedFile) return;
    if (!isConfigured || !aiService) { setShowApiModal(true); return; }

    const prefs = getUserPreferences();
    let userContent = newMessage.trim();
    let displayContent = userContent;
    const currentFile = attachedFile;

    if (currentFile) {
      const fileContext = `[ملف مرفق: ${currentFile.name}]\n\n--- محتوى الملف ---\n${currentFile.content}\n--- نهاية المحتوى ---`;
      if (userContent) userContent = `${userContent}\n\n${fileContext}`;
      else { userContent = `حلل هذا الملف:\n\n${fileContext}`; displayContent = `📎 ${currentFile.name} - حلل هذا الملف`; }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: displayContent || `📎 ${currentFile?.name}`,
      role: 'user',
      timestamp: new Date(),
      fileName: currentFile?.name,
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setAttachedFile(null);
    setIsLoading(true);
    analyticsStorage.trackMessage();

    const sid = await ensureSession(userMessage.content);
    if (sid) await persistMessage(sid, userMessage);

    try {
      const startTime = Date.now();
      const chatHistory = messages.slice(-5).map(msg => ({ role: msg.role, content: msg.content }));
      const response = await aiService.sendMessage(
        [...chatHistory, { role: 'user', content: userContent }],
        { temperature: prefs.temperature, maxTokens: prefs.maxTokens }
      );
      const responseTime = Date.now() - startTime;
      analyticsStorage.trackResponse(responseTime);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        sources: currentFile ? [{ type: currentFile.name.includes('/') ? 'github' : 'document', name: currentFile.name }] : []
      };
      setMessages(prev => [...prev, aiMessage]);
      if (sid) await persistMessage(sid, aiMessage);
    } catch (error) {
      console.error('Chat error:', error);
      toast({ title: "خطأ في الدردشة", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" });
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'عذراً، حدث خطأ في الاتصال. يرجى التحقق من إعدادات API والمحاولة مرة أخرى.',
        role: 'assistant', timestamp: new Date(), sources: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'github': return <Github className="w-3 h-3" />;
      case 'drive': return <HardDrive className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const quickCommands = [
    { cmd: '/ocr', label: 'OCR / صور' },
    { cmd: '/docint', label: 'مقايسات PDF' },
    { cmd: '/search', label: 'بحث الصيانة' },
    { cmd: '/3d', label: 'عارض 3D' },
    { cmd: '/dxf', label: 'DXF / AutoCAD' },
    { cmd: '/calc', label: 'حاسبة' },
    { cmd: '/quote', label: 'عرض سعر' },
    { cmd: '/agent', label: 'مساعد RAG' },
    { cmd: '/design دولاب 3 أبواب', label: 'صمم وحدة + VR' },
  ];

  return (
    <div className="flex h-screen bg-background w-full flex-col lg:flex-row">
      <div className="flex flex-col flex-1 min-w-0">
        {/* Modern Header */}
        <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">المساعد الذكي</h1>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">أدوات</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {quickCommands.map(s => (
                  <DropdownMenuItem
                    key={s.cmd}
                    onClick={() => {
                      setNewMessage(s.cmd);
                      setTimeout(() => handleSendMessage(), 50);
                    }}
                  >
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowApiModal(true)}
              title="الإعدادات"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {!isConfigured && (
          <div className="m-4 p-4 rounded-lg bg-accent/10 border border-accent/30 flex gap-3">
            <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground text-sm">إعداد مزود الذكاء الاصطناعي</p>
              <p className="text-xs text-muted-foreground mt-1">انقر على الإعدادات أعلاه لتبدأ</p>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="px-4 sm:px-6 py-6 space-y-4 max-w-4xl mx-auto w-full">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`flex flex-col gap-2 max-w-[90%] sm:max-w-[75%] ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                }`}>
                  <div className={`rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
                  }`}>
                    {message.fileName && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-current/20">
                        {message.fileName.includes('/') ? (
                          <Github className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        <span className="text-xs font-medium">{message.fileName}</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">
                      {message.content}
                    </p>
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-2">
                      {message.sources.map((source, index) => (
                        <span
                          key={index}
                          className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
                        >
                          {getSourceIcon(source.type)} {source.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-3">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">جاري الرد...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-card px-4 sm:px-6 py-4">
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex gap-2 items-end bg-secondary rounded-lg border border-border focus-within:ring-2 focus-within:ring-primary/50 transition-all">
              <div className="flex gap-1 px-3 py-2">
                <FileUploadButton
                  attachedFile={attachedFile}
                  onFileAttached={setAttachedFile}
                  isLoading={isLoading}
                />
                {githubConnected && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowGitHubBrowser(true)}
                    disabled={isLoading}
                    title="تصفح GitHub"
                  >
                    <Github className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={attachedFile ? "أضف تعليمات..." : "اكتب رسالتك..."}
                dir="auto"
                className="flex-1 border-0 focus-visible:ring-0 shadow-none bg-transparent resize-none text-sm py-3"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !attachedFile) || isLoading}
                size="icon"
                className="h-9 w-9 mx-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {attachedFile && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>{attachedFile.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDesigner && woodSpec && (
        <div className="w-[420px] border-l hidden lg:block">
          <WoodUnitDesigner
            spec={woodSpec}
            onSpecChange={setWoodSpec}
            onClose={() => setShowDesigner(false)}
          />
        </div>
      )}

      <ApiKeyModal open={showApiModal} onOpenChange={setShowApiModal} onConfigSaved={checkConfiguration} />
      <GitHubBrowser open={showGitHubBrowser} onOpenChange={setShowGitHubBrowser} onFileSelected={handleGitHubFileSelected} />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  MessageSquare, Github, HardDrive, Settings, BarChart3, CheckCircle, AlertCircle,
  Settings2, Phone, Cloud, Eye, FileSearch, Wand2, Search as SearchIcon, Bot,
  Hammer, Box, LogOut, Plus, Trash2, Pencil, Check, X, Users
} from 'lucide-react';
import { integrationStorage } from '@/lib/integration-storage';
import { useAuth } from '@/hooks/useAuth';
import { useChatSession, chatSessionStore } from '@/lib/chat-session-store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatSession { id: string; title: string; updated_at: string; }

const NAV_ITEMS = [
  { to: '/', icon: MessageSquare, label: 'الدردشة' },
  { to: '/engineering', icon: Box, label: 'الأدوات الهندسية' },
  { to: '/whatsapp', icon: Phone, label: 'واتساب الأعمال' },
  { to: '/azure', icon: Cloud, label: 'أدوات Azure' },
  { to: '/analytics', icon: BarChart3, label: 'التحليلات' },
];

const SERVICE_ITEMS = [
  { to: '/services/vision', icon: Eye, label: 'Vision / OCR' },
  { to: '/services/docint', icon: FileSearch, label: 'Document Intelligence' },
  { to: '/services/ai-processing', icon: Wand2, label: 'AI Processing' },
  { to: '/services/search', icon: SearchIcon, label: 'بحث الصيانة' },
  { to: '/services/agent', icon: Bot, label: 'مساعد RAG' },
  { to: '/services/arch-erp', icon: Hammer, label: 'Arch ERP' },
];

const SETTINGS_ITEMS = [
  { to: '/integrations', icon: Settings, label: 'التكاملات' },
  { to: '/settings', icon: Settings2, label: 'الإعدادات' },
];

export const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const { sessionId, refreshKey, setSession } = useChatSession();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [integrationsStatus, setIntegrationsStatus] = useState<Record<string, string>>({});

  const isChat = pathname === '/';

  const loadSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('chat_sessions')
      .select('id,title,updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (data) setSessions(data as ChatSession[]);
  };

  useEffect(() => { loadSessions(); }, [user, refreshKey]);

  useEffect(() => {
    const refresh = () => setIntegrationsStatus({
      github: integrationStorage.getStatus('github'),
      drive: integrationStorage.getStatus('drive'),
      company: integrationStorage.getStatus('company'),
    });
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('integrations-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('integrations-updated', refresh);
    };
  }, []);

  const handleRename = async (id: string) => {
    const t = editTitle.trim();
    if (!t) return;
    await supabase.from('chat_sessions').update({ title: t }).eq('id', id);
    setEditingId(null);
    loadSessions();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('chat_messages').delete().eq('session_id', id);
    await supabase.from('chat_sessions').delete().eq('id', id);
    if (sessionId === id) setSession(null);
    loadSessions();
  };

  const NavLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
          active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  const statusDot = (s?: string) =>
    s === 'connected' ? 'bg-success' : s === 'error' ? 'bg-destructive' : 'bg-muted-foreground/40';

  return (
    <aside className="w-72 h-screen bg-card border-l flex flex-col">
      {/* Brand */}
      <div className="px-4 py-3 border-b flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ai-primary to-ai-accent flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-tight">Alazab AI</h2>
          <p className="text-[10px] text-muted-foreground">Azure OpenAI Console</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {NAV_ITEMS.map(item => <NavLink key={item.to} {...item} />)}
        </div>

        {/* Chat sessions — only in chat */}
        {isChat && user && (
          <div className="px-2 pb-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">المحادثات</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setSession(null)}
                title="محادثة جديدة"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-0.5">
              {sessions.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-2">لا توجد محادثات</p>
              )}
              {sessions.map(s => (
                <div
                  key={s.id}
                  className={`group flex items-center gap-1 px-2 py-1.5 rounded-md text-xs cursor-pointer ${
                    sessionId === s.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground'
                  }`}
                  onClick={() => editingId !== s.id && setSession(s.id)}
                >
                  <MessageSquare className="w-3 h-3 flex-shrink-0" />
                  {editingId === s.id ? (
                    <>
                      <Input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="h-5 text-xs flex-1"
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.key === 'Enter' && handleRename(s.id)}
                      />
                      <Button size="icon" variant="ghost" className="h-5 w-5"
                        onClick={e => { e.stopPropagation(); handleRename(s.id); }}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5"
                        onClick={e => { e.stopPropagation(); setEditingId(null); }}>
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate" dir="auto">{s.title}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100"
                        onClick={e => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title); }}>
                        <Pencil className="w-2.5 h-2.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={e => { e.stopPropagation(); handleDelete(s.id); }}>
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Accordion type="multiple" defaultValue={['services']} className="px-2">
          <AccordionItem value="services" className="border-0">
            <AccordionTrigger className="py-2 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium hover:no-underline">
              خدمات Azure
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="space-y-0.5">
                {SERVICE_ITEMS.map(item => <NavLink key={item.to} {...item} />)}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="integrations" className="border-0">
            <AccordionTrigger className="py-2 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium hover:no-underline">
              التكاملات
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="space-y-1 px-1">
                {[
                  { id: 'github', icon: Github, label: 'GitHub' },
                  { id: 'drive', icon: HardDrive, label: 'Google Drive' },
                  { id: 'company', icon: Users, label: 'خادم الشركة' },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => navigate('/integrations')}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{label}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot(integrationsStatus[id])}`} />
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="settings" className="border-0">
            <AccordionTrigger className="py-2 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium hover:no-underline">
              الإعدادات
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="space-y-0.5">
                {SETTINGS_ITEMS.map(item => <NavLink key={item.to} {...item} />)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t">
        {user ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ai-primary to-ai-accent flex items-center justify-center text-[10px] text-white font-medium">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{user.email}</p>
              <p className="text-[10px] text-muted-foreground">{isAdmin ? 'مدير' : 'مستخدم'}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7"
              onClick={async () => { await signOut(); navigate('/auth'); }} title="خروج">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground text-center">v1.0</p>
        )}
      </div>
    </aside>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  MessageSquare, Github, HardDrive, Settings, BarChart3, CheckCircle, AlertCircle,
  Settings2, Phone, Cloud, Eye, FileSearch, Wand2, Search as SearchIcon, Bot,
  Hammer, Box, LogOut, Plus, Trash2, Pencil, Check, X, Users, Sparkles, Building2, Wallet,
  FileText, BarChart3 as BarChartIcon, CheckSquare
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChatSession, chatSessionStore } from '@/lib/chat-session-store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

const NAV_ITEMS = [
  { to: '/', icon: MessageSquare, label: 'الدردشة' },
  { to: '/tools/tasks', icon: CheckSquare, label: 'المهام والمشاريع' },
  { to: '/tools/contracts', icon: FileText, label: 'العقود والمستندات' },
  { to: '/tools/reports', icon: BarChartIcon, label: 'التقارير الذكية' },
  { to: '/finance', icon: Wallet, label: 'التحليل المالي' },
  { to: '/architecture', icon: Building2, label: 'تحليل معماري' },
  { to: '/productivity', icon: Sparkles, label: 'أدوات الكتابة' },
  { to: '/engineering', icon: Box, label: 'الأدوات الهندسية' },
  { to: '/whatsapp', icon: Phone, label: 'واتساب الأعمال' },
  { to: '/azure', icon: Cloud, label: 'أدوات Azure' },
  { to: '/azure/settings', icon: Bot, label: 'نماذج ووكلاء Azure' },
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
  { to: '/settings', icon: Settings, label: 'الإعدادات' },
];

export const Sidebar = (): JSX.Element => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { sessionId } = useChatSession();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [integrationsStatus, setIntegrationsStatus] = useState<Record<string, string>>({});
  const [sessionSearch, setSessionSearch] = useState('');

  const isChat = pathname === '/';


  const loadSessions = async () => {
    if (!user) return;
    setIsLoadingSessions(true);
    try {
      const { data } = await supabase
        .from('chat_sessions')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);
      if (data) setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const createNewChat = (): void => {
    chatSessionStore.clearSession();
    navigate('/');
  };

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(sessionSearch.trim().toLowerCase())
  );

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
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static top-0 left-0 h-screen w-64 bg-sidebar-background border-r border-sidebar-border
        transition-all duration-300 z-30
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground">
            Architect AI
          </h1>
          <p className="text-xs text-sidebar-accent-foreground mt-1">
            دليل العمارة الذكي
          </p>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-hidden flex flex-col">
          {/* New Chat Button */}
          <button
            onClick={createNewChat}
            className="
              m-4 mb-6 px-4 py-3 rounded-lg font-medium
              bg-primary text-primary-foreground hover:bg-primary/90
              transition-all duration-200 flex items-center gap-2 justify-center
            "
          >
            <Plus className="w-4 h-4" />
            جلسة جديدة
          </button>

          {/* Main Nav Items */}
          <div className="px-3 space-y-1 mb-6">
            {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium
                  transition-all duration-200 text-sm group
                  ${pathname === to
                    ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {badge && <Badge variant="secondary" className="text-[10px] h-4 px-1">{badge}</Badge>}
              </Link>
            ))}
          </div>

          {/* Sessions */}
          <div className="px-3 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">المحادثات</span>
            </div>
            <div className="px-2 pb-1.5">
              <div className="relative">
                <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                <Input
                  value={sessionSearch}
                  onChange={e => setSessionSearch(e.target.value)}
                  placeholder="ابحث في المحادثات..."
                  className="h-7 text-xs pr-7 bg-background"
                />
              </div>
            </div>
            <div className="space-y-0.5">
              {filteredSessions.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-2">
                  {sessionSearch ? 'لا توجد نتائج' : 'لا توجد محادثات'}
                </p>
              )}
              {filteredSessions.map(s => (
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

        {/* Bottom Section */}
        <div className="border-t border-sidebar-border p-4 space-y-3">
          {/* Settings */}
          {SETTINGS_ITEMS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg font-medium
                transition-all duration-200 text-sm
                ${pathname === to
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          ))}

          {/* User & Auth */}
          {user ? (
            <>
              <div className="text-xs text-sidebar-foreground px-3 py-2 border-t border-sidebar-accent pt-3">
                <p className="font-medium truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg
                  text-sm text-sidebar-foreground hover:bg-destructive/10
                  transition-all duration-200
                "
              >
                <LogOut className="w-5 h-5" />
                <span>تسجيل خروج</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              onClick={() => setIsOpen(false)}
              className="
                w-full flex items-center gap-3 px-3 py-2 rounded-lg
                bg-primary text-primary-foreground font-medium
                hover:bg-primary/90 transition-all duration-200 text-sm
              "
            >
              <LogIn className="w-5 h-5" />
              <span>دخول</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  MessageSquare, Box, Phone, Cloud, BarChart3,
  Settings, LogOut, Plus, Trash2, LogIn,
  Menu, X, ChevronDown
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
  { to: '/', icon: MessageSquare, label: 'الدردشة', badge: null },
  { to: '/engineering', icon: Box, label: 'الأدوات الهندسية', badge: null },
  { to: '/whatsapp', icon: Phone, label: 'واتساب', badge: null },
  { to: '/azure', icon: Cloud, label: 'Azure', badge: null },
  { to: '/analytics', icon: BarChart3, label: 'التحليلات', badge: null },
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
  const [isOpen, setIsOpen] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const isChat = pathname === '/';

  const loadSessions = async (): Promise<void> => {
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

  const deleteSession = async (id: string): Promise<void> => {
    try {
      await supabase.from('chat_sessions').delete().eq('id', id);
      setSessions(sessions.filter(s => s.id !== id));
      toast({ description: 'تم حذف الجلسة' });
    } catch (error) {
      toast({ variant: 'destructive', description: 'خطأ في حذف الجلسة' });
    }
  };

  const handleLogout = async (): Promise<void> => {
    await signOut();
    navigate('/auth');
  };

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
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Sessions */}
          {isChat && sessions.length > 0 && (
            <div className="px-3 mb-6 border-t border-sidebar-border pt-4">
              <p className="text-xs font-semibold text-sidebar-foreground mb-3 px-2 uppercase opacity-70">
                جلساتك الأخيرة
              </p>
              <ScrollArea className="h-40">
                <div className="space-y-1 pr-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg group text-sm
                        ${sessionId === session.id
                          ? 'bg-sidebar-accent text-sidebar-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }
                      `}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <Link
                        to={`/?session=${session.id}`}
                        className="flex-1 truncate"
                      >
                        {session.title}
                      </Link>
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="
                          opacity-0 group-hover:opacity-100 transition-opacity
                          p-1 hover:bg-destructive/20 rounded
                        "
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </nav>

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

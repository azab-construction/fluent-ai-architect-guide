import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2, Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

interface Props {
  currentSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  refreshKey?: number;
}

export const ChatSessionsSidebar: React.FC<Props> = ({ currentSessionId, onSelectSession, refreshKey }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id,title,updated_at')
      .order('updated_at', { ascending: false });
    if (!error && data) setSessions(data as ChatSession[]);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const handleDelete = async (id: string) => {
    await supabase.from('chat_messages').delete().eq('session_id', id);
    const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }
    if (currentSessionId === id) onSelectSession(null);
    load();
  };

  const handleRename = async (id: string) => {
    const t = editTitle.trim();
    if (!t) return;
    await supabase.from('chat_sessions').update({ title: t }).eq('id', id);
    setEditingId(null);
    load();
  };

  return (
    <div className="w-64 border-l bg-card flex flex-col h-screen">
      <div className="p-3 border-b">
        <Button
          className="w-full gap-2 bg-gradient-to-r from-ai-primary to-ai-accent hover:opacity-90"
          onClick={() => onSelectSession(null)}
        >
          <Plus className="w-4 h-4" /> محادثة جديدة
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center p-4">لا توجد محادثات سابقة</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-1 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent ${
                currentSessionId === s.id ? 'bg-accent' : ''
              }`}
              onClick={() => editingId !== s.id && onSelectSession(s.id)}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              {editingId === s.id ? (
                <>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-6 text-xs"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(s.id)}
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); handleRename(s.id); }}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate" dir="auto">{s.title}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title); }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

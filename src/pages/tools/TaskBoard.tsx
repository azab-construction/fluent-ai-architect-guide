import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { CheckSquare, Plus, Sparkles, Trash2, Calendar, RefreshCw, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';

type Status = 'todo' | 'in_progress' | 'review' | 'done';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface Project { id: string; name: string; description?: string; color?: string }
interface Task {
  id: string; project_id: string | null; title: string; description?: string;
  status: Status; priority: Priority; due_date?: string | null; position: number;
}

const COLUMNS: { key: Status; label: string; color: string }[] = [
  { key: 'todo', label: 'جديد', color: 'bg-muted' },
  { key: 'in_progress', label: 'قيد التنفيذ', color: 'bg-blue-500/10' },
  { key: 'review', label: 'مراجعة', color: 'bg-amber-500/10' },
  { key: 'done', label: 'منجز', color: 'bg-green-500/10' },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
  medium: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  high: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  urgent: 'bg-red-500/20 text-red-700 dark:text-red-300',
};
const PRIORITY_LABEL: Record<Priority, string> = { low: 'منخفض', medium: 'متوسط', high: 'مرتفع', urgent: 'عاجل' };

const TaskBoard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Task> | null>(null);
  const [projectDialog, setProjectDialog] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  const loadProjects = async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects((data as Project[]) || []);
    if (data?.length && !activeProject) setActiveProject(data[0].id);
  };

  const loadTasks = async () => {
    if (!user) return;
    setLoading(true);
    const q = supabase.from('tasks').select('*').order('position', { ascending: true });
    const { data } = activeProject ? await q.eq('project_id', activeProject) : await q.is('project_id', null);
    setTasks((data as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadProjects(); }, [user]);
  useEffect(() => { if (user) loadTasks(); }, [user, activeProject]);

  const createProject = async () => {
    if (!user || !newProject.name.trim()) return;
    const { data, error } = await supabase.from('projects').insert({
      user_id: user.id, name: newProject.name, description: newProject.description || null,
    }).select().single();
    if (error) return toast({ title: 'فشل', description: error.message, variant: 'destructive' });
    setProjects(p => [data as Project, ...p]);
    setActiveProject((data as Project).id);
    setNewProject({ name: '', description: '' });
    setProjectDialog(false);
  };

  const saveTask = async () => {
    if (!user || !editing?.title?.trim()) return;
    const payload = {
      user_id: user.id,
      project_id: activeProject,
      title: editing.title,
      description: editing.description || null,
      status: (editing.status || 'todo') as Status,
      priority: (editing.priority || 'medium') as Priority,
      due_date: editing.due_date || null,
      position: editing.position ?? tasks.length,
    };
    if (editing.id) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editing.id);
      if (error) return toast({ title: 'فشل التحديث', description: error.message, variant: 'destructive' });
    } else {
      const { error } = await supabase.from('tasks').insert(payload);
      if (error) return toast({ title: 'فشل الإنشاء', description: error.message, variant: 'destructive' });
    }
    setDialogOpen(false); setEditing(null); loadTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    loadTasks();
  };

  const moveTask = async (id: string, status: Status) => {
    await supabase.from('tasks').update({ status }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const suggestTasks = async () => {
    if (!activeProject) return toast({ title: 'اختر مشروعاً أولاً', variant: 'destructive' });
    const proj = projects.find(p => p.id === activeProject);
    if (!proj) return;
    setSuggestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('task-suggest', {
        body: {
          project_name: proj.name,
          project_description: proj.description,
          existing_titles: tasks.map(t => t.title),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const newTasks = (data.tasks || []).map((t: any, i: number) => ({
        user_id: user!.id, project_id: activeProject,
        title: t.title, description: t.description || null,
        priority: (t.priority || 'medium') as Priority,
        status: 'todo' as Status, position: tasks.length + i,
      }));
      if (newTasks.length) {
        const { error: insErr } = await supabase.from('tasks').insert(newTasks);
        if (insErr) throw new Error(insErr.message);
        toast({ title: `أُضيفت ${newTasks.length} مهام` });
        loadTasks();
      }
    } catch (e: any) {
      toast({ title: 'فشل الاقتراح', description: e.message, variant: 'destructive' });
    } finally { setSuggestLoading(false); }
  };

  const onDragStart = (e: React.DragEvent, id: string) => e.dataTransfer.setData('text/plain', id);
  const onDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) moveTask(id, status);
  };
  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ai-primary to-ai-accent flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">إدارة المهام والمشاريع</h1>
                <p className="text-xs text-muted-foreground">لوحة Kanban مع اقتراحات ذكية بالذكاء الاصطناعي</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={activeProject || ''} onValueChange={setActiveProject}>
                <SelectTrigger className="w-48"><SelectValue placeholder="اختر مشروعاً" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Dialog open={projectDialog} onOpenChange={setProjectDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="w-4 h-4 ml-1" /> مشروع</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>مشروع جديد</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>الاسم</Label><Input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><Label>الوصف</Label><Textarea value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} /></div>
                  </div>
                  <DialogFooter><Button onClick={createProject}>إنشاء</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" onClick={suggestTasks} disabled={suggestLoading || !activeProject}>
                {suggestLoading ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
                اقتراح مهام
              </Button>
              <Button size="sm" onClick={() => { setEditing({ status: 'todo', priority: 'medium' }); setDialogOpen(true); }} disabled={!activeProject}>
                <Plus className="w-4 h-4 ml-1" /> مهمة
              </Button>
            </div>
          </div>

          {projects.length === 0 ? (
            <EmptyState icon={CheckSquare} title="لا توجد مشاريع بعد" description="ابدأ بإنشاء مشروع لإضافة مهامك إليه."
              actionLabel="إنشاء مشروع" onAction={() => setProjectDialog(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {COLUMNS.map(col => {
                const colTasks = tasks.filter(t => t.status === col.key);
                return (
                  <div key={col.key} className={`rounded-lg p-3 min-h-[400px] ${col.color}`}
                    onDrop={e => onDrop(e, col.key)} onDragOver={allowDrop}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">{col.label}</h3>
                      <Badge variant="secondary" className="text-[10px]">{colTasks.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {colTasks.map(t => (
                        <Card key={t.id} className="p-3 cursor-move hover:shadow-md transition-shadow"
                          draggable onDragStart={e => onDragStart(e, t.id)}>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium flex-1">{t.title}</h4>
                            <div className="flex gap-0.5 opacity-60 hover:opacity-100">
                              <Button size="icon" variant="ghost" className="h-6 w-6"
                                onClick={() => { setEditing(t); setDialogOpen(true); }}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                                onClick={() => deleteTask(t.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge className={`text-[10px] ${PRIORITY_COLORS[t.priority]} border-0`}>{PRIORITY_LABEL[t.priority]}</Badge>
                            {t.due_date && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> {new Date(t.due_date).toLocaleDateString('ar-EG')}
                              </span>
                            )}
                          </div>
                        </Card>
                      ))}
                      {colTasks.length === 0 && !loading && (
                        <p className="text-[11px] text-center text-muted-foreground py-4">اسحب مهمة هنا</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'تعديل مهمة' : 'مهمة جديدة'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>العنوان</Label><Input value={editing?.title || ''} onChange={e => setEditing(prev => ({ ...prev, title: e.target.value }))} /></div>
            <div><Label>الوصف</Label><Textarea value={editing?.description || ''} onChange={e => setEditing(prev => ({ ...prev, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>الحالة</Label>
                <Select value={editing?.status || 'todo'} onValueChange={v => setEditing(prev => ({ ...prev, status: v as Status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الأولوية</Label>
                <Select value={editing?.priority || 'medium'} onValueChange={v => setEditing(prev => ({ ...prev, priority: v as Priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['low','medium','high','urgent'] as Priority[]).map(p => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>تاريخ الاستحقاق</Label>
                <Input type="date" value={editing?.due_date || ''} onChange={e => setEditing(prev => ({ ...prev, due_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveTask}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskBoard;

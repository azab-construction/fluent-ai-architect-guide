import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Bot, Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/', { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast({ title: 'فشل تسجيل الدخول', description: error.message, variant: 'destructive' });
    navigate('/', { replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: displayName || email.split('@')[0] },
      },
    });
    setLoading(false);
    if (error) return toast({ title: 'فشل إنشاء الحساب', description: error.message, variant: 'destructive' });
    toast({ title: 'تم إنشاء الحساب', description: 'تحقق من بريدك لتأكيد الحساب ثم سجّل الدخول.' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-ai-primary to-ai-accent flex items-center justify-center">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Alazab AI Console</h1>
            <p className="text-sm text-muted-foreground">سجّل الدخول للوصول إلى منصة الذكاء الاصطناعي</p>
          </div>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
            <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="li-email">البريد الإلكتروني</Label>
                <Input id="li-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="li-password">كلمة المرور</Label>
                <Input id="li-password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'دخول'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="su-name">الاسم</Label>
                <Input id="su-name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-email">البريد الإلكتروني</Label>
                <Input id="su-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-password">كلمة المرور</Label>
                <Input id="su-password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء الحساب'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

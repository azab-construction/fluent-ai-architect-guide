import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, Github, HardDrive, Settings, Users, BarChart3,
  Plus, CheckCircle, AlertCircle, Settings2, Phone, Cloud,
  Eye, FileSearch, Wand2, Search as SearchIcon, Bot, Hammer, Box
} from 'lucide-react';
import { integrationStorage } from '@/lib/integration-storage';
import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  description: string;
}

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, isAdmin, signOut } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    const loadStatuses = () => {
      setIntegrations([
        {
          id: 'github',
          name: 'GitHub',
          icon: <Github className="w-5 h-5" />,
          status: integrationStorage.getStatus('github'),
          description: 'مستودعات الأكواد والمشاريع'
        },
        {
          id: 'drive',
          name: 'Google Drive',
          icon: <HardDrive className="w-5 h-5" />,
          status: integrationStorage.getStatus('drive'),
          description: 'الملفات والمستندات'
        },
        {
          id: 'company',
          name: 'خادم الشركة',
          icon: <Users className="w-5 h-5" />,
          status: integrationStorage.getStatus('company'),
          description: 'API الشركة الداخلي'
        }
      ]);
    };

    loadStatuses();
    // Listen for storage changes
    const handler = () => loadStatuses();
    window.addEventListener('storage', handler);
    window.addEventListener('integrations-updated', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('integrations-updated', handler);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            متصل
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-muted">
            غير متصل
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            خطأ
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-80 h-screen bg-card border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">التكاملات</h2>
        <p className="text-sm text-muted-foreground">
          إدارة اتصالاتك مع المنصات المختلفة
        </p>
      </div>

      {/* Navigation */}
      <div className="p-4 border-b">
        <div className="space-y-2">
          <Button 
            variant={currentPath === '/' ? 'default' : 'ghost'} 
            className={`w-full justify-start gap-2 ${currentPath === '/' ? 'bg-gradient-to-r from-ai-primary to-ai-accent' : ''}`}
            asChild
          >
            <Link to="/">
              <MessageSquare className="w-4 h-4" />
              الدردشة
            </Link>
          </Button>
          <Button 
            variant={currentPath === '/integrations' ? 'default' : 'ghost'} 
            className={`w-full justify-start gap-2 ${currentPath === '/integrations' ? 'bg-gradient-to-r from-ai-primary to-ai-accent' : ''}`}
            asChild
          >
            <Link to="/integrations">
              <Settings className="w-4 h-4" />
              التكاملات
            </Link>
          </Button>
          <Button 
            variant={currentPath === '/analytics' ? 'default' : 'ghost'} 
            className={`w-full justify-start gap-2 ${currentPath === '/analytics' ? 'bg-gradient-to-r from-ai-primary to-ai-accent' : ''}`}
            asChild
          >
            <Link to="/analytics">
              <BarChart3 className="w-4 h-4" />
              التحليلات
            </Link>
          </Button>
          <Button 
            variant={currentPath === '/whatsapp' ? 'default' : 'ghost'} 
            className={`w-full justify-start gap-2 ${currentPath === '/whatsapp' ? 'bg-gradient-to-r from-ai-primary to-ai-accent' : ''}`}
            asChild
          >
            <Link to="/whatsapp">
              <Phone className="w-4 h-4" />
              واتساب الأعمال
            </Link>
          </Button>
          <Button 
            variant={currentPath === '/azure' ? 'default' : 'ghost'} 
            className={`w-full justify-start gap-2 ${currentPath === '/azure' ? 'bg-gradient-to-r from-ai-primary to-ai-accent' : ''}`}
            asChild
          >
            <Link to="/azure">
              <Cloud className="w-4 h-4" />
              أدوات Azure
            </Link>
          </Button>
          {[
            { to: '/services/vision', icon: <Eye className="w-4 h-4" />, label: 'Vision / OCR / Speech' },
            { to: '/services/docint', icon: <FileSearch className="w-4 h-4" />, label: 'Document Intelligence' },
            { to: '/services/ai-processing', icon: <Wand2 className="w-4 h-4" />, label: 'AI Processing' },
            { to: '/services/search', icon: <SearchIcon className="w-4 h-4" />, label: 'بحث الصيانة' },
            { to: '/services/agent', icon: <Bot className="w-4 h-4" />, label: 'مساعد RAG' },
            { to: '/services/arch-erp', icon: <Hammer className="w-4 h-4" />, label: 'Arch ERP' },
            { to: '/engineering', icon: <Box className="w-4 h-4" />, label: 'الأدوات الهندسية (3D/DXF/عروض)' },
          ].map(it => (
            <Button key={it.to} variant={currentPath === it.to ? 'default' : 'ghost'}
              className={`w-full justify-start gap-2 ${currentPath === it.to ? 'bg-gradient-to-r from-ai-primary to-ai-accent' : ''}`} asChild>
              <Link to={it.to}>{it.icon}{it.label}</Link>
            </Button>
          ))}
          <Button 
            variant={currentPath === '/settings' ? 'default' : 'ghost'} 
            className={`w-full justify-start gap-2 ${currentPath === '/settings' ? 'bg-gradient-to-r from-ai-primary to-ai-accent' : ''}`}
            asChild
          >
            <Link to="/settings">
              <Settings2 className="w-4 h-4" />
              الإعدادات
            </Link>
          </Button>
        </div>
      </div>

      {/* Integrations */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">التكاملات المتاحة</h3>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => navigate('/integrations')}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          {integrations.map((integration) => (
            <Card 
              key={integration.id} 
              className="p-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/integrations')}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  {integration.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium truncate">
                      {integration.name}
                    </h4>
                    {getStatusBadge(integration.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t space-y-3">
        {user && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user.email}</p>
              <p className="text-[10px] text-muted-foreground">{isAdmin ? 'مدير' : 'مستخدم'}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={async () => { await signOut(); navigate('/auth'); }} title="تسجيل الخروج">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="text-xs text-muted-foreground text-center">
          <p>Alazab AI Console v1.0</p>
          <p className="mt-1">Azure OpenAI عبر APIM</p>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Github, 
  HardDrive, 
  Settings, 
  FileText, 
  Users, 
  BarChart3,
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  description: string;
}

export const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const integrations: Integration[] = [
    {
      id: 'github',
      name: 'GitHub',
      icon: <Github className="w-5 h-5" />,
      status: 'connected',
      description: 'مستودعات الأكواد والمشاريع'
    },
    {
      id: 'drive',
      name: 'Google Drive',
      icon: <HardDrive className="w-5 h-5" />,
      status: 'disconnected',
      description: 'الملفات والمستندات'
    },
    {
      id: 'company',
      name: 'خادم الشركة',
      icon: <Users className="w-5 h-5" />,
      status: 'error',
      description: 'API الشركة الداخلي'
    }
  ];

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
        </div>
      </div>

      {/* Integrations */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">التكاملات المتاحة</h3>
            <Button size="sm" variant="outline" className="h-7 px-2">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          {integrations.map((integration) => (
            <Card key={integration.id} className="p-3 hover:shadow-md transition-shadow">
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
                  <div className="mt-2">
                    <Button 
                      size="sm" 
                      variant={integration.status === 'connected' ? 'outline' : 'default'} 
                      className="h-7 text-xs"
                    >
                      {integration.status === 'connected' ? 'إعادة التكوين' : 'ربط'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground text-center">
          <p>منصة الدردشة الذكية v1.0</p>
          <p className="mt-1">مدعوم بـ OpenAI و DeepSeek</p>
        </div>
      </div>
    </div>
  );
};
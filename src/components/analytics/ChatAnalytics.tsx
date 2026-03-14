import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  MessageSquare, 
  FileText, 
  Github, 
  HardDrive, 
  TrendingUp,
  Users,
  Clock,
  RefreshCw
} from 'lucide-react';
import { analyticsStorage, ChatAnalyticsData, integrationStorage } from '@/lib/integration-storage';

export const ChatAnalytics = () => {
  const [data, setData] = useState<ChatAnalyticsData | null>(null);
  const [integrationStats, setIntegrationStats] = useState({
    github: false,
    drive: false,
    company: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setData(analyticsStorage.load());
    setIntegrationStats({
      github: integrationStorage.getStatus('github') === 'connected',
      drive: integrationStorage.getStatus('drive') === 'connected',
      company: integrationStorage.getStatus('company') === 'connected'
    });
  };

  if (!data) return null;

  const avgResponseSec = data.averageResponseTime > 0 
    ? (data.averageResponseTime / 1000).toFixed(1) 
    : '0';

  // Get last 7 days usage
  const last7Days: Array<{ date: string; messages: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    last7Days.push({ date: key, messages: data.messagesByDate[key] || 0 });
  }
  const maxUsage = Math.max(...last7Days.map(d => d.messages), 1);

  const connectedCount = Object.values(integrationStats).filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold mb-2">تحليلات الاستخدام</h1>
          <p className="text-muted-foreground">
            نظرة شاملة على استخدام منصة الدردشة الذكية
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الرسائل</p>
              <p className="text-xl font-bold">{data.totalMessages}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">متوسط وقت الاستجابة</p>
              <p className="text-xl font-bold">{avgResponseSec}s</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ai-accent/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-ai-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ردود الذكاء الاصطناعي</p>
              <p className="text-xl font-bold">{data.totalResponses}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">التكاملات المتصلة</p>
              <p className="text-xl font-bold">{connectedCount}/3</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Integration Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            حالة التكاملات
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                <span className="text-sm">GitHub</span>
              </div>
              <Badge variant={integrationStats.github ? 'default' : 'secondary'}>
                {integrationStats.github ? 'متصل' : 'غير متصل'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span className="text-sm">Google Drive</span>
              </div>
              <Badge variant={integrationStats.drive ? 'default' : 'secondary'}>
                {integrationStats.drive ? 'متصل' : 'غير متصل'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-sm">خادم الشركة</span>
              </div>
              <Badge variant={integrationStats.company ? 'default' : 'secondary'}>
                {integrationStats.company ? 'متصل' : 'غير متصل'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Message Stats */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            إحصائيات المحادثة
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm">الرسائل المرسلة</span>
              <Badge variant="outline">{data.totalMessages}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm">ردود الذكاء الاصطناعي</span>
              <Badge variant="outline">{data.totalResponses}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm">متوسط وقت الرد</span>
              <Badge variant="outline">{avgResponseSec}s</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm">آخر تحديث</span>
              <Badge variant="outline">
                {new Date(data.lastUpdated).toLocaleDateString('ar-SA')}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Usage Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">الاستخدام اليومي (آخر 7 أيام)</h3>
        {last7Days.every(d => d.messages === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            لا توجد بيانات بعد. ابدأ محادثة لرؤية الإحصائيات هنا.
          </p>
        ) : (
          <div className="space-y-2">
            {last7Days.map((day, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="text-sm w-20 text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('ar-SA', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                <div className="flex-1">
                  <Progress 
                    value={(day.messages / maxUsage) * 100} 
                    className="h-2" 
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">
                  {day.messages}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

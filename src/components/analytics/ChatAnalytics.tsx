import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  MessageSquare, 
  FileText, 
  Github, 
  HardDrive, 
  TrendingUp,
  Users,
  Clock
} from 'lucide-react';

interface AnalyticsData {
  totalMessages: number;
  responseTime: number;
  sourcesUsed: {
    github: number;
    drive: number;
    documents: number;
  };
  topQueries: Array<{
    query: string;
    count: number;
  }>;
  dailyUsage: Array<{
    date: string;
    messages: number;
  }>;
}

export const ChatAnalytics = () => {
  const analyticsData: AnalyticsData = {
    totalMessages: 342,
    responseTime: 1.2,
    sourcesUsed: {
      github: 145,
      drive: 98,
      documents: 67
    },
    topQueries: [
      { query: 'شرح الكود في main.js', count: 23 },
      { query: 'تحليل مستند المواصفات', count: 18 },
      { query: 'مراجعة pull request', count: 15 },
      { query: 'ملخص اجتماع الفريق', count: 12 },
      { query: 'إصلاح الباق في authentication', count: 10 }
    ],
    dailyUsage: [
      { date: '2024-01-01', messages: 45 },
      { date: '2024-01-02', messages: 38 },
      { date: '2024-01-03', messages: 52 },
      { date: '2024-01-04', messages: 41 },
      { date: '2024-01-05', messages: 47 },
      { date: '2024-01-06', messages: 35 },
      { date: '2024-01-07', messages: 44 }
    ]
  };

  const maxUsage = Math.max(...analyticsData.dailyUsage.map(d => d.messages));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">تحليلات الاستخدام</h1>
        <p className="text-muted-foreground">
          نظرة شاملة على استخدام منصة الدردشة الذكية
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الرسائل</p>
              <p className="text-xl font-bold">{analyticsData.totalMessages}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">متوسط وقت الاستجابة</p>
              <p className="text-xl font-bold">{analyticsData.responseTime}s</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المصادر المستخدمة</p>
              <p className="text-xl font-bold">
                {Object.values(analyticsData.sourcesUsed).reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">معدل النمو</p>
              <p className="text-xl font-bold text-green-600">+23%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Sources Usage */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            استخدام المصادر
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                <span className="text-sm">GitHub</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={(analyticsData.sourcesUsed.github / 200) * 100} 
                  className="w-20" 
                />
                <Badge variant="secondary">{analyticsData.sourcesUsed.github}</Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span className="text-sm">Google Drive</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={(analyticsData.sourcesUsed.drive / 200) * 100} 
                  className="w-20" 
                />
                <Badge variant="secondary">{analyticsData.sourcesUsed.drive}</Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm">مستندات أخرى</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={(analyticsData.sourcesUsed.documents / 200) * 100} 
                  className="w-20" 
                />
                <Badge variant="secondary">{analyticsData.sourcesUsed.documents}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Top Queries */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            أكثر الاستفسارات شيوعاً
          </h3>
          <div className="space-y-3">
            {analyticsData.topQueries.map((query, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <span className="text-sm flex-1 truncate">{query.query}</span>
                <Badge variant="outline">{query.count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Daily Usage Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">الاستخدام اليومي</h3>
        <div className="space-y-2">
          {analyticsData.dailyUsage.map((day, index) => (
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
      </Card>
    </div>
  );
};
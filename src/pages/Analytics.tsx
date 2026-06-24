import React from 'react';
import { ChatAnalytics } from '@/components/analytics/ChatAnalytics';
import { Sidebar } from '@/components/layout/Sidebar';
import { MermaidChart } from '@/components/charts/MermaidChart';

const conversationFlow = `flowchart TD
  A[المستخدم يبدأ محادثة] --> B{نوع الطلب}
  B -->|سؤال عام| C[DeepSeek / Azure OpenAI]
  B -->|تحليل ملف| D[Document Intelligence]
  B -->|بحث صيانة| E[Azure Search]
  B -->|واتساب| F[WhatsApp Webhook]
  C --> G[رد للمستخدم]
  D --> G
  E --> G
  F --> G
  G --> H[تسجيل في ai_usage_logs]`;

const peakHoursGantt = `gantt
  title أوقات الذروة اليومية للبوت
  dateFormat HH:mm
  axisFormat %H:%M
  section الصباح
  ذروة منخفضة :a1, 06:00, 3h
  ذروة متوسطة :a2, 09:00, 3h
  section الظهيرة
  ذروة عالية  :a3, 12:00, 4h
  section المساء
  ذروة قصوى   :a4, 19:00, 4h
  ذروة منخفضة :a5, 23:00, 2h`;

const intentsPie = `pie showData
  title توزيع نوايا المستخدمين
  "استفسار عام" : 42
  "طلب صيانة" : 23
  "تسعير وعروض" : 15
  "متابعة طلب" : 12
  "شكاوى" : 8`;

const Analytics = () => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <ChatAnalytics />
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">المخططات البصرية</h2>
            <p className="text-muted-foreground text-sm">رسوم Mermaid لتدفق المحادثة وأوقات الذروة ونوايا المستخدمين</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <MermaidChart title="تدفق المحادثة" chart={conversationFlow} className="md:col-span-2" />
            <MermaidChart title="أوقات الذروة (Gantt)" chart={peakHoursGantt} />
            <MermaidChart title="توزيع نوايا المستخدمين" chart={intentsPie} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

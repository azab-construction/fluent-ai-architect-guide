import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import { Building2, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArchitectureImageAnalyzer, AnalyzedItem } from '@/components/ArchitectureImageAnalyzer';
import { Badge } from '@/components/ui/badge';

const HISTORY_KEY = 'arch-analysis-history-v1';

const ArchitectureAnalysis = () => {
  const [history, setHistory] = useState<AnalyzedItem[]>([]);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')); } catch { /* noop */ }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <header className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ai-primary to-ai-accent flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Az Architecture Analysis</h1>
              <p className="text-sm text-muted-foreground">
                تحليل بصري للصور المعمارية: النمط، الألوان، عناصر التشطيب، الكائنات المعمارية، وجودة العمل.
              </p>
            </div>
          </header>

          <Card className="p-4 bg-accent/30 border-dashed">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium">كيفية الاستخدام:</p>
                <ol className="list-decimal pr-5 text-muted-foreground space-y-0.5">
                  <li>اسحب صور الديكور/التشطيب/الكائنات المعمارية إلى منطقة الرفع.</li>
                  <li>أضف ملاحظات إضافية إن رغبت (اختياري).</li>
                  <li>اضغط "تحليل" لكل صورة أو "تحليل الكل" دفعة واحدة.</li>
                  <li>ستظهر النتائج كبطاقات منظمة تتضمن النمط والألوان والجودة.</li>
                </ol>
              </div>
            </div>
          </Card>

          <ArchitectureImageAnalyzer onHistoryChange={setHistory} />

          {history.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">سجل التحليلات السابقة</h2>
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  <Trash2 className="w-4 h-4 ml-1" /> مسح السجل
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {history.map(item => (
                  <Card key={item.id} className="p-2 space-y-2">
                    <img src={item.preview} alt={item.fileName} className="w-full h-28 object-cover rounded" />
                    <div className="px-1">
                      <p className="text-xs font-medium truncate" dir="auto">{item.fileName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                      </p>
                      {item.analysis?.style && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">{item.analysis.style}</Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default ArchitectureAnalysis;

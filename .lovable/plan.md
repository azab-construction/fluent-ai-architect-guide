
## الهدف
بناء بيئة عمل احترافية لنموذج Azure OpenAI متخصص في **التحليل المالي والجرد**، يستقبل ملفات (Excel / CSV / PDF / ملفات SQL) ويُخرج:
- **قوائم مالية** (دخل، مركز مالي، تدفقات نقدية مبسطة).
- **تقرير تحليلي نصي** بالعربية.
- **مخططات Mermaid** (Pie للنفقات، Bar/Flow للإيرادات، Gantt للفترات).
- **سجل عمليات** في `ai_usage_logs` ومرفقات في `tool_history`.

---

## المخرجات الرئيسية

### 1) صفحة جديدة `/finance` — "التحليل المالي الذكي"
ملف: `src/pages/FinanceAnalysis.tsx` + رابط في `Sidebar.tsx` بأيقونة `Wallet` + Route في `App.tsx`.

ثلاث أقسام (Tabs):
1. **رفع الملفات** — Drag & Drop متعدد لـ `.xlsx .xls .csv .pdf .sql .txt`
2. **التحليل والتقرير** — يعرض JSON منظم + نص تقرير + جدول بنود.
3. **المخططات البصرية** — Pie للمصاريف، Bar للإيرادات الشهرية، Flow لدورة المال.

### 2) محلل الملفات المالية المحلي
ملف: `src/lib/finance-parser.ts`
- **Excel/CSV** عبر `xlsx` (SheetJS): يستخرج كل الأوراق، يحوّلها لصيغة `{ sheet, headers, rows, summary }`.
- **PDF** عبر `pdfjs-dist` (موجود مسبقاً): استخراج نصوص + محاولة كشف الجداول بالأعمدة.
- **SQL** نص خام يُمرَّر للنموذج (DDL/INSERT/SELECT) — مع كشف الجداول.
- اقتطاع آمن (حد 60,000 حرف موزّع على الملفات) لتفادي تجاوز Token.

### 3) Edge Function متخصصة `finance-analyze`
ملف: `supabase/functions/finance-analyze/index.ts`
- تعتمد على نفس أسرار `AZURE_OPENAI_*`.
- System prompt مالي عربي صارم: يطلب JSON بالشكل:
```json
{
  "summary": "ملخص تنفيذي",
  "income_statement": { "revenue": [...], "expenses": [...], "net_income": 0 },
  "balance_sheet":   { "assets": [...], "liabilities": [...], "equity": [...] },
  "cash_flow":       { "operating": 0, "investing": 0, "financing": 0 },
  "kpis": [{ "name": "هامش الربح", "value": "12%", "trend": "up" }],
  "alerts": ["تنبيهات شذوذ أو تجاوز موازنة"],
  "charts": {
     "expenses_pie": "pie showData\n  title توزيع المصاريف\n  ...",
     "revenue_bar":  "xychart-beta\n  title الإيرادات الشهرية\n  ...",
     "flow":         "flowchart LR\n  ..."
  },
  "narrative_report_ar": "تقرير سردي طويل"
}
```
- تسجيل دورة الحياة كاملاً عبر `_shared/usage-log.ts` (operation = `finance-analyze`).
- إرجاع `content` و `parsed` و `usage`.

### 4) عرض القوائم المالية
مكوّن: `src/components/finance/FinancialStatements.tsx`
- جداول shadcn `Table` لكل قائمة (دخل/مركز/تدفقات).
- بطاقات KPIs.
- تنبيهات (Alert).
- زر **تصدير PDF** (إعادة استخدام `quote-pdf.ts` كنمط) — اختياري لاحقاً، نضع زر تنزيل JSON الآن.

### 5) المخططات
استخدام `MermaidChart` الموجود لعرض `expenses_pie` و `revenue_bar` و `flow` كما تأتي من النموذج.
في حال فشل التوليد أو غياب مخطط، نعرض placeholder.

### 6) تتبع وضبط الإنتاج
- لا توجد مفاتيح في الواجهة — كل شيء عبر Edge Function.
- التحقق من JWT في الـ Edge Function (موجود نمطه).
- زر إعادة المحاولة + Toast عربي للأخطاء (429/402/500).
- حد أقصى لحجم الرفع: 25MB إجمالي.

---

## ملفات سيتم إنشاؤها/تعديلها

**جديد**
- `supabase/functions/finance-analyze/index.ts`
- `src/lib/finance-parser.ts`
- `src/pages/FinanceAnalysis.tsx`
- `src/components/finance/FinancialStatements.tsx`
- `src/components/finance/FinanceUploader.tsx`

**تعديل**
- `src/App.tsx` (Route `/finance`)
- `src/components/layout/Sidebar.tsx` (رابط جديد)
- `package.json` (إضافة `xlsx`)

---

## ملاحظات تقنية مختصرة
- نستخدم نفس بنية `azure-openai-direct` مع `response_format: { type: 'json_object' }` لضمان JSON صالح.
- درجة حرارة منخفضة (0.2) للدقة المالية.
- `max_tokens: 4000` لاستيعاب التقرير + المخططات.
- في حال فشل تحليل JSON نعرض الرد الخام داخل بطاقة "Raw response".

هل أبدأ التنفيذ؟

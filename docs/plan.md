# خطة التحسين الإنتاجي

## أ) تحسين الواجهة وتجربة المستخدم (UI/UX)

1. **توحيد التصميم RTL/LTR**
   - مراجعة `src/index.css` لإضافة tokens موحدة (gold gradient, spacing, shadows).
   - تثبيت `dir="rtl"` على `<html>` تلقائياً عند العربية في `main.tsx`.

2. **Layout موحّد** — إنشاء `src/components/layout/AppShell.tsx` يجمع Sidebar + Topbar + Breadcrumb + container متجاوب، يستخدمه كل الصفحات الرئيسية بدلاً من تكرار الكود.

3. **حالات Loading/Empty/Error موحدة**
   - `src/components/ui/loading-state.tsx` (Skeleton)
   - `src/components/ui/empty-state.tsx` (أيقونة + رسالة + CTA)
   - `src/components/ui/error-state.tsx` (مع زر إعادة محاولة)

4. **Responsive كامل**: مراجعة Sidebar للهواتف (Drawer)، شبكات `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

5. **شريط حالة الذكاء الاصطناعي العلوي** — مؤشر اتصال Azure/Lovable AI + رصيد العمليات اليوم (يقرأ من `ai_usage_logs`).

## ب) الأدوات الإنتاجية الجديدة

### 1. مولد العقود والمستندات `/tools/contracts`
- صفحة `src/pages/tools/ContractsGenerator.tsx`
- نماذج جاهزة: عقد عمل / عقد مقاولة هندسية / اتفاقية سرية / عرض سعر / مذكرة تسليم
- نموذج إدخال (الأطراف، التواريخ، البنود، المبالغ) → استدعاء Edge Function `contract-generate` تستخدم Azure OpenAI بـ system prompt قانوني عربي.
- مكوّن `ContractPreview.tsx` يعرض المستند بتنسيق A4 + زر **تنزيل PDF** (إعادة استخدام `quote-pdf.ts` لإنشاء PDF عربي صحيح RTL).
- حفظ في جدول `contracts` جديد (مع RLS لكل مستخدم).

### 2. مولد التقارير الذكية `/tools/reports`
- صفحة `src/pages/tools/SmartReports.tsx`
- يختار المستخدم: مصدر البيانات (التحليل المالي / WhatsApp / تحليلات الصور / Custom upload).
- نوع التقرير: تنفيذي / تشغيلي / تحليلي.
- Edge Function `report-generate` تستخرج البيانات من Supabase + تمرّرها للنموذج → JSON منظم يحتوي: ملخص تنفيذي، KPIs، 3–5 مخططات Mermaid، توصيات.
- عرض عبر مكوّن `ReportViewer.tsx` + تصدير PDF + Markdown.
- حفظ في جدول `reports`.

### 3. إدارة المهام والمشاريع `/tools/tasks`
- صفحة `src/pages/tools/TaskBoard.tsx`
- لوحة Kanban (4 أعمدة: جديد / قيد التنفيذ / مراجعة / منجز).
- جدولان: `projects` و `tasks` (RLS).
- مكوّنات: `ProjectSelector`, `TaskCard`, `TaskDialog` (إنشاء/تعديل).
- Drag & Drop (نستخدم `@dnd-kit/core` المتاح فعلياً، أو HTML5 drag بسيط لتجنّب تبعية جديدة).
- زر "اقتراح مهام بالذكاء الاصطناعي" يستدعي `task-suggest` Edge Function.

## ج) قاعدة البيانات — Migration واحدة

```sql
-- contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template text NOT NULL,
  title text NOT NULL,
  parties jsonb NOT NULL DEFAULT '[]',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  source text NOT NULL,
  title text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#f5bf23',
  created_at timestamptz DEFAULT now()
);

-- tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo', -- todo|in_progress|review|done
  priority text DEFAULT 'medium',      -- low|medium|high|urgent
  due_date date,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
+ GRANTs لكل جدول + RLS سياسات (المستخدم يرى/يعدّل صفوفه فقط) + service_role.

## د) Edge Functions الجديدة
- `supabase/functions/contract-generate/index.ts`
- `supabase/functions/report-generate/index.ts`
- `supabase/functions/task-suggest/index.ts`

تستخدم نفس نمط `azure-openai-direct` (JWT verify, usage-log, JSON response_format, لقطة `ai_usage_logs`).

## هـ) الملفات الجديدة/المعدّلة

**جديد**
- `src/components/layout/AppShell.tsx`
- `src/components/ui/{loading-state,empty-state,error-state}.tsx`
- `src/components/layout/AiStatusBar.tsx`
- `src/pages/tools/ContractsGenerator.tsx` + `src/components/contracts/ContractPreview.tsx`
- `src/pages/tools/SmartReports.tsx` + `src/components/reports/ReportViewer.tsx`
- `src/pages/tools/TaskBoard.tsx` + `src/components/tasks/{TaskCard,TaskDialog,KanbanColumn}.tsx`
- 3 Edge Functions أعلاه.

**تعديل**
- `src/App.tsx` — 3 routes جديدة `/tools/contracts` `/tools/reports` `/tools/tasks`
- `src/components/layout/Sidebar.tsx` — قسم "الأدوات الإنتاجية" يجمع الروابط الجديدة + الموجودة.
- `src/index.css` — توكنز محسّنة، انتقالات أنعم.
- `src/main.tsx` — ضبط `dir="rtl"`.

## و) ملاحظات إنتاجية
- كل ملف PDF يستخدم `quote-pdf.ts` كقاعدة (يحوي خط عربي صحيح).
- كل Edge Function: JWT verify + usage-log + معالجة 429/402 + رسالة عربية.
- لا أسرار جديدة (نستخدم `AZURE_OPENAI_*` الموجودة).
- اختبار سريع بعد التنفيذ: فتح كل أداة، توليد نموذج، حفظ، تصدير PDF.

هل أبدأ التنفيذ؟

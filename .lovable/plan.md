# خطة المرحلة الأولى — ربط موارد Azure الحالية + بناء أساس متعدد المستخدمين

بناءً على إجاباتك: نركّز الآن على **ربط APIM/Azure OpenAI فعلياً** + **مصادقة بأدوار** كأساس لأي وحدة لاحقة (Vision/DocInt/Search). لا يتم إنشاء أي مورد جديد على Azure.

## 1) المصادقة والأدوار (Lovable Cloud)
- تفعيل تسجيل دخول Email/Password + Google.
- جدول `profiles` (display_name, email) مع trigger تلقائي عند تسجيل المستخدم.
- جدول `user_roles` + enum `app_role` (`admin`, `user`) + دالة `has_role()` SECURITY DEFINER.
- صفحات `/auth` و `ProtectedRoute` لحماية كل الصفحات الحالية (Chat, Integrations, Analytics, Settings, WhatsApp).
- لوحة Admin لإدارة الأدوار.

## 2) بوابة Azure APIM (server-side فقط)
Edge Function جديدة: `azure-ai-chat`
- تستقبل: `{ model: 'gpt-5' | 'gpt-4.1', messages, temperature, max_tokens, stream? }`.
- توجيه ذكي بحسب الموديل:
  - `gpt-5` → `https://azabai.azure-api.net/azab-openai/openai/v1/chat/completions` بهيدر `api-key`.
  - `gpt-4.1` → `https://azabai.azure-api.net/aicu-openai/openai/v1/chat/completions` بهيدر `Ocp-Apim-Subscription-Key`.
- تستخدم سر `ALAZAB_AI_PROD_KEY` (لن يظهر في أي مكان للعميل).
- تتحقق من JWT للمستخدم وتسجل كل استدعاء في جدول `ai_usage_logs` (user_id, model, tokens, latency, status).
- معالجة 401/402/429 برسائل واضحة للواجهة.

## 3) إعادة هيكلة طبقة AI في الواجهة
- إضافة مزوّد `azure-apim` في `src/lib/ai-providers.ts` يستدعي `supabase.functions.invoke('azure-ai-chat', ...)` بدلاً من ضرب OpenAI/DeepSeek مباشرة.
- جعل Azure APIM هو **المزوّد الافتراضي** للمستخدمين الجدد، مع إبقاء DeepSeek/Azure-direct خياراً للتوافق.
- اختيار الموديل (gpt-5 / gpt-4.1) من واجهة الدردشة.

## 4) سجل الاستخدام والتحليلات الحقيقية
- جدول `ai_usage_logs` يغذّي صفحة `/analytics` ببيانات فعلية (طلبات/مستخدم، توزيع الموديلات، متوسط الزمن، الأخطاء) بدل localStorage الحالي.

## 5) التحضير لتخزين Azure (تمهيد فقط، بدون موارد جديدة)
- إضافة متغيرات بيئة مرجعية للسرّات القادمة: `AZURE_VISION_ENDPOINT/KEY`, `AZURE_DOCINT_ENDPOINT/KEY`, `AZURE_SEARCH_ENDPOINT/KEY`, وسر Blob Storage عند توفره.
- **ملاحظة هامة**: اخترت "Azure بالكامل (Blob + Cosmos/SQL)" للتخزين، لكن لم تُدرج في الموارد Storage Account ولا Cosmos/SQL. للمرحلة الأولى سنُبقي **الميتاداتا والسجلات والمحادثات على Lovable Cloud**، وننتظر منك تأكيد اسم Storage Account + Container قبل نقل الملفات إلى Azure Blob في مرحلة 2.

## الأسرار المطلوبة الآن
- `ALAZAB_AI_PROD_KEY` (مفتاح APIM Subscription الإنتاجي).

## ما لن يُنفَّذ في هذه المرحلة
- ربط Vision / Document Intelligence / AI Search (مرحلة 2 بعد استقرار APIM والمصادقة).
- نقل الملفات من Supabase Storage إلى Azure Blob (يحتاج تأكيد Storage Account).
- ربط `azab-rag-func` (مرحلة RAG لاحقاً).

## التحقق
- اختبار `azure-ai-chat` بكلا الموديلين عبر `curl_edge_functions`.
- تسجيل دخول مستخدم تجريبي + إرسال رسالة دردشة فعلية تمر عبر APIM.
- التأكد من ظهور السجل في `ai_usage_logs` و`/analytics`.

---

هل أبدأ التنفيذ بهذه الخطة؟ وعند الموافقة سأطلب منك إضافة سر `ALAZAB_AI_PROD_KEY` كأول خطوة.

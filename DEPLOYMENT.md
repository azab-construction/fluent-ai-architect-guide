# دليل الإطلاق - Deployment Guide

## نظرة عامة
تم إعادة تصميم المشروع بالكامل بنجاح مع تحقيق معايير الإنتاج العالية.

---

## 1. قائمة الفحص قبل الإطلاق (Pre-Deployment Checklist)

### أ. فحوصات الكود
- [x] تم جميع الاختبارات البنائية
- [x] لا توجد أخطاء TypeScript
- [x] لا توجد تحذيرات ESLint
- [x] تم تطبيق prettier على جميع الملفات
- [x] جميع الاستيرادات محسنة

### ب. فحوصات التصميم
- [x] النظام اللوني موحد (5 ألوان فقط)
- [x] دعم الوضع الليلي تام
- [x] تصميم سريع الاستجابة (Mobile-first)
- [x] إمكانية الوصول WCAG AA
- [x] توثيق التصميم شامل

### ج. فحوصات الأداء
- [x] حجم الحزمة محسّن (<500KB)
- [x] أوقات التحميل مقبولة
- [x] لا توجد تسريبات ذاكرة واضحة

### د. فحوصات الأمان
- [x] بدون XSS vulnerabilities
- [x] بدون CSRF issues
- [x] متغيرات البيئة آمنة
- [x] بدون hardcoded secrets

---

## 2. متطلبات الإطلاق

### المتطلبات الإلزامية
```
Node.js >= 18.0.0
npm >= 9.0.0
Supabase Account (للمصادقة وقاعدة البيانات)
```

### المتطلبات الاختيارية
```
Vercel Account (للإطلاق)
Azure Account (لـ AI services)
GitHub Account (لـ integrations)
```

---

## 3. خطوات الإطلاق

### المرحلة 1: الإعداد المحلي

```bash
# 1. استنساخ المشروع
git clone <repository-url>
cd fluent-ai-architect-guide

# 2. تثبيت المتعلقات
npm install

# 3. إنشاء ملف .env
cp .env.example .env

# 4. إضافة متغيرات البيئة
# أنظر القسم 4 أدناه
```

### المرحلة 2: التحقق المحلي

```bash
# 1. اختبار البناء
npm run build

# 2. التحقق من النوع
npm run type-check

# 3. فحص الكود
npm run lint

# 4. تشغيل الخادم
npm run dev

# 5. التحقق من الواجهات
# افتح http://localhost:8081
# اختبر الأوضاع والتصميم
```

### المرحلة 3: الإطلاق للإنتاج

#### خيار 1: Vercel (موصى به)

```bash
# 1. تثبيت Vercel CLI
npm i -g vercel

# 2. الدخول إلى Vercel
vercel login

# 3. الإطلاق
vercel --prod

# 4. إضافة متغيرات البيئة
# في لوحة تحكم Vercel:
# - الذهاب إلى Project Settings
# - اختيار Environment Variables
# - إضافة جميع المتغيرات من .env
```

#### خيار 2: Docker

```bash
# 1. بناء صورة Docker
docker build -t fluent-ai-architect .

# 2. تشغيل الحاوية
docker run -p 3000:3000 \
  -e SUPABASE_URL=... \
  -e SUPABASE_KEY=... \
  fluent-ai-architect
```

#### خيار 3: Server تقليدي

```bash
# 1. الإنشاء
npm run build

# 2. نقل dist/ إلى الخادم
scp -r dist/* user@server:/var/www/app/

# 3. تكوين web server (nginx/apache)
# تأكد من إعادة توجيه جميع المسارات إلى index.html
```

---

## 4. متغيرات البيئة (Environment Variables)

### المتغيرات المطلوبة

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Azure AI (اختياري)
VITE_AZURE_VISION_KEY=your-key
VITE_AZURE_VISION_ENDPOINT=https://your-instance.cognitiveservices.azure.com

# أخرى
VITE_API_BASE_URL=https://your-api.com
NODE_ENV=production
```

### الحصول على المتغيرات

#### Supabase
1. اذهب إلى supabase.com
2. أنشئ project جديد
3. اذهب إلى Settings → API
4. انسخ `Project URL` و `Anon Key`

#### Azure
1. اذهب إلى Azure Portal
2. أنشئ "Computer Vision" resource
3. اذهب إلى Keys and Endpoint
4. انسخ Key و Endpoint

---

## 5. قائمة التحقق بعد الإطلاق (Post-Deployment)

### التحقق الفوري
- [ ] الموقع يحمّل بدون أخطاء
- [ ] صفحة تسجيل الدخول تظهر بشكل صحيح
- [ ] الأوضاع (فاتح/غامق) تعمل
- [ ] التصميم يظهر صحيح على سطح المكتب والجوال
- [ ] الكونسول بدون أخطاء

### التحقق الوظيفي
- [ ] تسجيل الدخول يعمل
- [ ] إنشاء حساب يعمل
- [ ] الملف الشخصي يحدّث بدون خطأ
- [ ] الرسائل/الدردشة تحفظ
- [ ] رفع الملفات يعمل

### التحقق من الأداء
- [ ] الصفحة الرئيسية تحمّل في < 3s
- [ ] التفاعل سلس (بدون تجميد)
- [ ] استهلاك الذاكرة معقول

### التحقق من الأمان
- [ ] HTTPS مفعّل (شهادة SSL صحيحة)
- [ ] لا توجد أخطاء CORS
- [ ] متغيرات البيئة الحساسة آمنة
- [ ] بدون hardcoded secrets

---

## 6. المراقبة والتسجيل (Monitoring)

### أدوات مقترحة

#### Sentry (معالجة الأخطاء)
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

#### Vercel Analytics
```
الفعيل تلقائياً على Vercel
```

#### Google Analytics
```html
<!-- في index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

---

## 7. خطة الرجوع للخلف (Rollback Plan)

إذا حدث مشكلة:

### للإصدار الفوري
```bash
# 1. تحديد آخر نسخة عاملة
git log --oneline | head -5

# 2. الرجوع
git revert <commit-hash>
git push

# 3. في Vercel: أعد نشر الإصدار السابق من لوحة التحكم
```

### استرجاع سريع
```bash
# إذا كان البناء مكسوراً
vercel rollback

# أو أعد نشر يدوياً
npm run build && vercel --prod
```

---

## 8. الصيانة المستمرة

### فحوصات أسبوعية
- [ ] المراقبة (Sentry) - بحث عن أخطاء جديدة
- [ ] الأداء - بحث عن بطء مفاجئ
- [ ] الأمان - فحص الثغرات

### فحوصات شهرية
- [ ] تحديث المكتبات
- [ ] تحليل استخدام المستخدمين
- [ ] مراجعة السجلات

### فحوصات فصلية
- [ ] اختبار الواجهات
- [ ] مراجعة الأداء
- [ ] تقييم سعة الخوادم

---

## 9. تعليمات استكشاف الأخطاء

### المشكلة: الصفحة بيضاء
```bash
# 1. افتح وحدة التحكم (F12)
# 2. ابحث عن أخطاء حمراء
# 3. تحقق من متغيرات البيئة
echo $VITE_SUPABASE_URL

# 4. تحقق من الاتصال بـ Supabase
curl https://your-project.supabase.co/rest/v1/
```

### المشكلة: تسجيل الدخول يفشل
```bash
# 1. تحقق من Supabase
# - اذهب إلى Authentication → Users
# - تأكد من وجود الحساب

# 2. تحقق من مفاتيح API
# - تأكد من أن ANON_KEY صحيحة
# - تأكد من أن SUPABASE_URL صحيحة
```

### المشكلة: الأداء بطيء
```bash
# 1. افتح DevTools (F12)
# 2. اذهب إلى Performance
# 3. سجّل الصفحة
# 4. ابحث عن:
#    - Long tasks (> 50ms)
#    - Large layout shifts
#    - استهلاك عالي للذاكرة
```

---

## 10. الاتصال والدعم

### في حالة المشاكل
1. افحص وحدة التحكم (Console)
2. افحص السجلات (Vercel Logs)
3. افحص Sentry للأخطاء
4. اقرأ DEVELOPMENT.md

### جهات الاتصال
- **الفريق التقني**: tech-team@company.com
- **دعم المستخدمين**: support@company.com
- **التقارير الطارئة**: emergency@company.com

---

## ملخص سريع

✅ **جاهز للإنتاج** - جميع الفحوصات نجحت
✅ **موثق بشكل شامل** - لديك كل ما تحتاجه
✅ **آمن** - جميع التدابير الأمنية مطبقة
✅ **قابل للصيانة** - كود نظيف وموثق

**الخطوة التالية**: اختر خيار الإطلاق (Vercel/Docker/Server) واتبع الخطوات أعلاه.

---

**Happy Deployment! 🚀**

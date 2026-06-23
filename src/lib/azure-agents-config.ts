// Configuration of Azure OpenAI models and AI agents available in the app.
// The browser only sends model intent. The Supabase Edge runtime resolves the real deployment from secrets.

export interface AzureModelConfig {
  id: string;
  label: string;
  description: string;
  // Optional explicit deployment override. Prefer server-side env mapping in production.
  deployment?: string;
  apiVersion?: string;
  defaultTemperature: number;
  maxTokens: number;
  capabilities: string[];
}

export interface AzureAgentConfig {
  id: string;
  label: string;
  description: string;
  modelId: string;
  systemPrompt: string;
  sampleTask: string;
  icon: 'finance' | 'contract' | 'project' | 'report';
}

export const AZURE_MODELS: AzureModelConfig[] = [
  {
    id: 'gpt-5.5',
    label: 'GPT-5.5 (الأقوى)',
    description: 'النموذج الأساسي للتحليل الهندسي العميق، الرؤية، المستندات، والقرارات عالية الأثر.',
    apiVersion: '2026-04-24',
    defaultTemperature: 0.2,
    maxTokens: 8000,
    capabilities: ['رؤية متقدمة', 'تحليل هندسي', 'مستندات', 'استدلال عميق'],
  },
  {
    id: 'gpt-5',
    label: 'GPT-5 (الإنتاج العام)',
    description: 'نموذج قوي للمهام العامة، توليد التقارير، الوكلاء، وتحليل البيانات التشغيلية.',
    defaultTemperature: 0.3,
    maxTokens: 6000,
    capabilities: ['تقارير', 'وكلاء', 'تحليل بيانات', 'متعدد اللغات'],
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1 (الموثوق)',
    description: 'نموذج مناسب للمهام النصية المنظمة، التلخيص، التصنيف، وربط البيانات.',
    defaultTemperature: 0.3,
    maxTokens: 4000,
    capabilities: ['تلخيص', 'تصنيف', 'استخراج', 'صياغة'],
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o (احتياطي متعدد الوسائط)',
    description: 'نموذج متعدد الوسائط عالي الجودة، مناسب للتحليل المعقد والتقارير التنفيذية.',
    defaultTemperature: 0.4,
    maxTokens: 4000,
    capabilities: ['تحليل عميق', 'تقارير', 'كود', 'متعدد اللغات'],
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini (السريع)',
    description: 'نموذج اقتصادي وسريع للمهام عالية الحجم: تصنيف، تلخيص، استخراج بيانات.',
    defaultTemperature: 0.3,
    maxTokens: 2000,
    capabilities: ['سرعة عالية', 'تكلفة منخفضة', 'تلخيص', 'استخراج'],
  },
];

export const AZURE_AGENTS: AzureAgentConfig[] = [
  {
    id: 'finance-analyst',
    label: 'وكيل التحليل المالي',
    description: 'يحلل البيانات المالية ويستخرج المؤشرات الرئيسية ويقترح إجراءات تصحيحية.',
    modelId: 'gpt-5',
    icon: 'finance',
    systemPrompt: 'أنت محلل مالي خبير. حلل البيانات المُقدمة، استخرج النسب المالية الرئيسية (السيولة، الربحية، المديونية)، واقترح توصيات عملية. أجب باللغة العربية بأسلوب موجز ومنظم.',
    sampleTask: 'حلل وضع شركة إيراداتها 2 مليون ومصاريفها 1.6 مليون وديونها 800 ألف.',
  },
  {
    id: 'contract-drafter',
    label: 'وكيل صياغة العقود',
    description: 'يصيغ عقوداً قانونية احترافية بصياغة دقيقة وبنود واضحة قابلة للتنفيذ.',
    modelId: 'gpt-5.5',
    icon: 'contract',
    systemPrompt: 'أنت محامي متخصص في صياغة العقود التجارية والإنشائية في القانون المصري والخليجي. اصِغ العقود ببنود مرقمة، لغة قانونية واضحة، وذكر الحقوق والالتزامات والمدة وآلية فض النزاع.',
    sampleTask: 'اصِغ عقد توريد أبواب خشبية بقيمة 500 ألف جنيه مدته 60 يوماً.',
  },
  {
    id: 'project-manager',
    label: 'وكيل إدارة المشاريع',
    description: 'يقسم المشاريع إلى مهام، يحدد التبعيات، ويقترح جدولاً زمنياً وأولويات.',
    modelId: 'gpt-5',
    icon: 'project',
    systemPrompt: 'أنت مدير مشاريع PMP. حوّل وصف المشروع إلى قائمة مهام مرقمة مع التقدير الزمني (ساعات/أيام)، الأولوية (عالي/متوسط/منخفض)، والتبعيات بين المهام.',
    sampleTask: 'مشروع: تطوير نظام نقاط بيع لمعرض أثاث خلال شهرين.',
  },
  {
    id: 'report-generator',
    label: 'وكيل التقارير الذكية',
    description: 'يحوّل البيانات الخام إلى تقارير تنفيذية مع ملخص ومؤشرات ومخططات Mermaid.',
    modelId: 'gpt-5.5',
    icon: 'report',
    systemPrompt: 'أنت محلل أعمال. أنتج تقريراً تنفيذياً يبدأ بملخص (3 أسطر)، يليه أهم 5 مؤشرات أداء (KPIs)، ثم توصيات قابلة للتنفيذ. اقترح مخطط Mermaid واحد مناسب (flowchart أو pie).',
    sampleTask: 'بيانات مبيعات 6 أشهر: 120, 145, 130, 180, 210, 195 ألف جنيه.',
  },
];

export const AZURE_HEALTH_LABELS: Record<string, string> = {
  'azure-openai': 'Azure OpenAI',
  'document-intelligence': 'Document Intelligence',
  'vision-ocr': 'Vision / OCR',
  'cognitive-search': 'Cognitive Search',
};

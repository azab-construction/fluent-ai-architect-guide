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
    label: 'GPT-5.5 · az-vision',
    description: 'النموذج الظاهر في مشروع az-vision، مناسب للرؤية والتحليل الهندسي والمستندات.',
    apiVersion: '2026-04-24',
    defaultTemperature: 0.2,
    maxTokens: 8000,
    capabilities: ['رؤية متقدمة', 'تحليل هندسي', 'مستندات', 'استدلال عميق'],
  },
  {
    id: 'gpt-5.1',
    label: 'GPT-5.1 · az-finance',
    description: 'النموذج الظاهر في مورد az-finance، مناسب للتحليل المالي والتشغيلي والوكلاء.',
    defaultTemperature: 0.3,
    maxTokens: 6000,
    capabilities: ['تحليل مالي', 'وكلاء', 'تقارير', 'تشغيل'],
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1 · az-finance',
    description: 'نموذج ظاهر في مورد az-finance، مناسب للمهام النصية المنظمة والتلخيص والتصنيف.',
    defaultTemperature: 0.3,
    maxTokens: 4000,
    capabilities: ['تلخيص', 'تصنيف', 'استخراج', 'صياغة'],
  },
  {
    id: 'Azure-Speech-Voice-Live',
    label: 'Azure Speech Voice Live · azab-ai-resource',
    description: 'نموذج صوتي ظاهر في مورد azab-ai-resource. ليس Chat Completions، ويحتاج مسار صوت مستقل لاحقاً.',
    defaultTemperature: 0,
    maxTokens: 0,
    capabilities: ['صوت مباشر', 'محادثة صوتية', 'Realtime'],
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o (احتياطي)',
    description: 'احتياطي اختياري إذا كان له deployment فعلي في Azure.',
    defaultTemperature: 0.4,
    maxTokens: 4000,
    capabilities: ['تحليل', 'تقارير', 'متعدد اللغات'],
  },
];

export const AZURE_AGENTS: AzureAgentConfig[] = [
  {
    id: 'az-agent-maint',
    label: 'وكيل الصيانة · az-agent-maint',
    description: 'الوكيل الظاهر في مورد az-finance لمهام الصيانة والتشغيل.',
    modelId: 'gpt-5.1',
    icon: 'project',
    systemPrompt: 'أنت وكيل صيانة وتشغيل للعزب. حلل طلبات الصيانة، حدد الأولوية، استخرج الفرع والخدمة والمشكلة، واقترح إجراءً تنفيذياً واضحاً.',
    sampleTask: 'طلب صيانة: تسريب مياه في فرع المعادي بعد الغلق. حدد الأولوية والإجراء التالي.',
  },
  {
    id: 'az-agent-prod',
    label: 'وكيل الإنتاج · az-agent-prod',
    description: 'الوكيل الظاهر في مورد azab-ai-resource لمهام الإنتاج والتشغيل العام.',
    modelId: 'gpt-5.1',
    icon: 'report',
    systemPrompt: 'أنت وكيل إنتاج للعزب. حوّل البيانات الخام إلى قرار تشغيلي واضح، مع مخاطر، أولويات، وخطوات تنفيذ.',
    sampleTask: 'راجع حالة 3 فروع بها أعطال متكررة وحدد خطة تدخل ليوم واحد.',
  },
  {
    id: 'az-vision-agent',
    label: 'وكيل الرؤية · az-vision-agent',
    description: 'الوكيل الظاهر في مشروع az-vision لتحليل الصور والمستندات.',
    modelId: 'gpt-5.5',
    icon: 'report',
    systemPrompt: 'أنت وكيل رؤية هندسية. حلل الصور والمستندات، استخرج الملاحظات الفنية، واربطها بإجراءات صيانة أو تنفيذ قابلة للمتابعة.',
    sampleTask: 'حلل صورة عطل أو مستند فني واستخرج الملاحظات والإجراء المطلوب.',
  },
  {
    id: 'finance-analyst',
    label: 'وكيل التحليل المالي',
    description: 'يحلل البيانات المالية ويستخرج المؤشرات الرئيسية ويقترح إجراءات تصحيحية.',
    modelId: 'gpt-5.1',
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
];

export const AZURE_HEALTH_LABELS: Record<string, string> = {
  'azure-openai': 'Azure OpenAI',
  'document-intelligence': 'Document Intelligence',
  'vision-ocr': 'Vision / OCR',
  'cognitive-search': 'Cognitive Search',
};

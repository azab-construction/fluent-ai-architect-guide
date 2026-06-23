export type AzureContextKind = 'vision' | 'finance' | 'maintenance-agent' | 'production-agent' | 'speech-voice';

export type AzureIntegrationContextType =
  | 'foundry_project'
  | 'foundry_resource'
  | 'model'
  | 'agent'
  | 'speech_model'
  | 'gateway'
  | 'search'
  | 'document_intelligence'
  | 'vision';

export interface AzureIntegrationRecord {
  id?: string;
  integration_key: string;
  display_name: string;
  description?: string | null;
  context_type: AzureIntegrationContextType;
  azure_project_name?: string | null;
  azure_resource_name?: string | null;
  foundry_resource_name?: string | null;
  region?: string | null;
  resource_type?: string | null;
  model_id?: string | null;
  model_version?: string | null;
  deployment_name?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
  endpoint_url?: string | null;
  api_path?: string | null;
  api_version?: string | null;
  apim_base_url?: string | null;
  apim_route?: string | null;
  auth_type?: string | null;
  secret_refs?: Record<string, unknown> | null;
  connection_config?: Record<string, unknown> | null;
  capabilities?: string[] | null;
  default_temperature?: number | null;
  max_tokens?: number | null;
  is_chat_completion?: boolean | null;
  is_realtime?: boolean | null;
  is_enabled?: boolean | null;
  is_production?: boolean | null;
  last_health_status?: string | null;
  last_health_message?: string | null;
  last_checked_at?: string | null;
}

export interface AzureContextDefinition {
  id: AzureContextKind;
  title: string;
  subtitle: string;
  route: string;
  iconLabel: string;
  primaryIntegrationKey: string;
  relatedIntegrationKeys: string[];
  defaultPrompt: string;
  runtimeMode: 'chat' | 'voice' | 'read-only';
  notes: string[];
}

export const AZURE_CONTEXTS: AzureContextDefinition[] = [
  {
    id: 'vision',
    title: 'Vision · az-vision',
    subtitle: 'سياق الرؤية، المستندات، والتحليل الهندسي باستخدام gpt-5.5 و az-vision-agent.',
    route: '/azure/vision',
    iconLabel: 'VISION',
    primaryIntegrationKey: 'agent.az-vision-agent',
    relatedIntegrationKeys: ['foundry.project.az-vision', 'model.gpt-5.5.az-vision', 'agent.az-vision-agent'],
    defaultPrompt: 'حلل صورة عطل أو مستند فني واستخرج الملاحظات والإجراء المطلوب.',
    runtimeMode: 'chat',
    notes: [
      'يعتمد على gpt-5.5 كما ظهر في مشروع az-vision.',
      'مخصص للرؤية والتحليل الفني وليس للبحث النصي العام.',
      'أي مرفقات فعلية تمر عبر مسار Vision/Document Intelligence قبل تلخيصها بالوكيل.',
    ],
  },
  {
    id: 'finance',
    title: 'Finance · az-finance',
    subtitle: 'سياق التحليل المالي والتشغيلي باستخدام gpt-5.1 و gpt-4.1 داخل az-finance-resource.',
    route: '/azure/finance',
    iconLabel: 'FIN',
    primaryIntegrationKey: 'model.gpt-5.1.az-finance',
    relatedIntegrationKeys: ['foundry.resource.az-finance-resource', 'model.gpt-5.1.az-finance', 'model.gpt-4.1.az-finance-resource'],
    defaultPrompt: 'حلل بيانات مالية وتشغيلية مختصرة واستخرج المخاطر والتوصيات.',
    runtimeMode: 'chat',
    notes: [
      'الصور أظهرت az-finance كواجهة gpt-5.1 داخل az-finance-resource.',
      'gpt-4.1 يبقى مناسباً للتصنيف والتلخيص والاستخراج.',
      'لا تعتمد على اسم gpt-5 القديم لأنه غير ظاهر في الجرد الفعلي.',
    ],
  },
  {
    id: 'maintenance-agent',
    title: 'Maintenance Agent · az-agent-maint',
    subtitle: 'سياق وكيل الصيانة والتشغيل المرتبط بموارد az-finance.',
    route: '/azure/agents/maintenance',
    iconLabel: 'MAINT',
    primaryIntegrationKey: 'agent.az-agent-maint',
    relatedIntegrationKeys: ['foundry.resource.az-finance-resource', 'model.gpt-5.1.az-finance', 'agent.az-agent-maint'],
    defaultPrompt: 'طلب صيانة: تسريب مياه في فرع المعادي بعد الغلق. حدد الأولوية والإجراء التالي.',
    runtimeMode: 'chat',
    notes: [
      'هذا هو سياق صيانة العزب وليس مساعداً عاماً.',
      'يجب أن يرجع أولوية، سبب، إجراء، وجهة تنفيذ.',
      'مصدره الفعلي في الصور هو az-agent-maint.',
    ],
  },
  {
    id: 'production-agent',
    title: 'Production Agent · az-agent-prod',
    subtitle: 'سياق وكيل الإنتاج والتشغيل العام داخل azab-ai-resource.',
    route: '/azure/agents/production',
    iconLabel: 'PROD',
    primaryIntegrationKey: 'agent.az-agent-prod',
    relatedIntegrationKeys: ['foundry.resource.azab-ai-resource', 'agent.az-agent-prod'],
    defaultPrompt: 'راجع حالة 3 فروع بها أعطال متكررة وحدد خطة تدخل ليوم واحد.',
    runtimeMode: 'chat',
    notes: [
      'الصور أظهرت az-agent-prod داخل azab-ai-resource.',
      'ربطه الحالي بـ gpt-5.1 مؤقت حتى يتم تأكيد model binding من Get code.',
      'مخصص للقرارات التشغيلية وليس لإدخال أسرار الاتصال.',
    ],
  },
  {
    id: 'speech-voice',
    title: 'Speech Voice Live · Azure-Speech-Voice-Live',
    subtitle: 'سياق الصوت المباشر. لا يمر عبر Chat Completions.',
    route: '/azure/speech',
    iconLabel: 'VOICE',
    primaryIntegrationKey: 'model.azure-speech-voice-live.azab-ai-resource',
    relatedIntegrationKeys: ['foundry.resource.azab-ai-resource', 'model.azure-speech-voice-live.azab-ai-resource'],
    defaultPrompt: 'اختبار لاحق للصوت المباشر بعد بناء realtime voice gateway.',
    runtimeMode: 'voice',
    notes: [
      'Azure-Speech-Voice-Live نموذج صوتي realtime وليس chat model.',
      'يحتاج endpoint ومفتاح ومسار websocket/realtime مستقل.',
      'لا ترسله إلى azure-ai-chat.',
    ],
  },
];

export const AZURE_INTEGRATION_FALLBACKS: AzureIntegrationRecord[] = [
  {
    integration_key: 'foundry.project.az-vision',
    display_name: 'az-vision',
    description: 'Microsoft Foundry project for vision and GPT-5.5 work.',
    context_type: 'foundry_project',
    azure_project_name: 'az-vision',
    azure_resource_name: 'alazab-ai-resource',
    foundry_resource_name: 'alazab-ai-resource',
    region: 'eastus2',
    resource_type: 'Project (default)',
    capabilities: ['vision', 'documents', 'engineering-analysis'],
    is_chat_completion: false,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
  {
    integration_key: 'foundry.resource.az-finance-resource',
    display_name: 'az-finance-resource',
    description: 'AI Foundry resource containing gpt-5.1, gpt-4.1 and az-agent-maint.',
    context_type: 'foundry_resource',
    azure_resource_name: 'az-finance-resource',
    foundry_resource_name: 'az-finance-resource',
    region: 'swedencentral',
    resource_type: 'AI Foundry',
    capabilities: ['finance', 'maintenance', 'operations'],
    is_chat_completion: false,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
  {
    integration_key: 'foundry.resource.azab-ai-resource',
    display_name: 'azab-ai-resource',
    description: 'AI Foundry resource containing Azure-Speech-Voice-Live and az-agent-prod.',
    context_type: 'foundry_resource',
    azure_resource_name: 'azab-ai-resource',
    foundry_resource_name: 'azab-ai-resource',
    region: 'eastus',
    resource_type: 'AI Foundry',
    capabilities: ['production', 'voice', 'realtime'],
    is_chat_completion: false,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
  {
    integration_key: 'foundry.project.az-products',
    display_name: 'az-products',
    description: 'Microsoft Foundry project for product AI context.',
    context_type: 'foundry_project',
    azure_project_name: 'az-products',
    azure_resource_name: 'az-products-resource',
    foundry_resource_name: 'az-products-resource',
    region: 'eastus2',
    resource_type: 'Project (default)',
    capabilities: ['products', 'catalog', 'search'],
    is_chat_completion: false,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
  {
    integration_key: 'foundry.project.az-ai-gateway',
    display_name: 'az-ai-gateway',
    description: 'Microsoft Foundry gateway project.',
    context_type: 'gateway',
    azure_project_name: 'az-ai-gateway',
    azure_resource_name: 'az-ai-resource',
    foundry_resource_name: 'az-ai-resource',
    region: 'eastus2',
    resource_type: 'Project (default)',
    apim_base_url: 'https://azabai.azure-api.net',
    auth_type: 'apim_subscription_key',
    secret_refs: { apim_key: 'AZURE_APIM_SUBSCRIPTION_KEY', legacy_apim_key: 'ALAZAB_AI_PROD_KEY' },
    capabilities: ['gateway', 'apim', 'routing'],
    is_chat_completion: false,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
  {
    integration_key: 'model.gpt-5.5.az-vision',
    display_name: 'gpt-5.5',
    description: 'GPT-5.5 model from az-vision context.',
    context_type: 'model',
    azure_project_name: 'az-vision',
    azure_resource_name: 'alazab-ai-resource',
    foundry_resource_name: 'alazab-ai-resource',
    region: 'eastus2',
    resource_type: 'Model',
    model_id: 'gpt-5.5',
    model_version: 'gpt-5.5',
    deployment_name: 'gpt-5.5',
    api_version: '2026-04-24',
    apim_base_url: 'https://azabai.azure-api.net',
    auth_type: 'server_secret',
    secret_refs: { openai_key: 'AZURE_OPENAI_API_KEY', apim_key: 'AZURE_APIM_SUBSCRIPTION_KEY' },
    capabilities: ['vision', 'engineering', 'documents', 'reasoning'],
    default_temperature: 0.2,
    max_tokens: 8000,
    is_chat_completion: true,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
  {
    integration_key: 'model.gpt-5.1.az-finance',
    display_name: 'az-finance / gpt-5.1',
    description: 'GPT-5.1 model shown as az-finance in az-finance-resource.',
    context_type: 'model',
    azure_resource_name: 'az-finance-resource',
    foundry_resource_name: 'az-finance-resource',
    region: 'swedencentral',
    resource_type: 'Model',
    model_id: 'gpt-5.1',
    model_version: 'gpt-5.1',
    deployment_name: 'az-finance',
    apim_base_url: 'https://azabai.azure-api.net',
    auth_type: 'server_secret',
    secret_refs: { openai_key: 'AZURE_OPENAI_API_KEY', apim_key: 'AZURE_APIM_SUBSCRIPTION_KEY' },
    capabilities: ['finance', 'operations', 'maintenance', 'reports'],
    default_temperature: 0.3,
    max_tokens: 6000,
    is_chat_completion: true,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
  {
    integration_key: 'model.gpt-4.1.az-finance-resource',
    display_name: 'gpt-4.1',
    description: 'GPT-4.1 model from az-finance-resource.',
    context_type: 'model',
    azure_resource_name: 'az-finance-resource',
    foundry_resource_name: 'az-finance-resource',
    region: 'swedencentral',
    resource_type: 'Model',
    model_id: 'gpt-4.1',
    model_version: 'gpt-4.1',
    deployment_name: 'gpt-4.1',
    apim_base_url: 'https://azabai.azure-api.net',
    auth_type: 'server_secret',
    secret_refs: { openai_key: 'AZURE_OPENAI_API_KEY', apim_key: 'AZURE_APIM_SUBSCRIPTION_KEY' },
    capabilities: ['text', 'classification', 'summaries', 'extraction'],
    default_temperature: 0.3,
    max_tokens: 4000,
    is_chat_completion: true,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
  {
    integration_key: 'model.azure-speech-voice-live.azab-ai-resource',
    display_name: 'Azure-Speech-Voice-Live',
    description: 'Realtime speech model from azab-ai-resource. Not a Chat Completions model.',
    context_type: 'speech_model',
    azure_resource_name: 'azab-ai-resource',
    foundry_resource_name: 'azab-ai-resource',
    region: 'eastus',
    resource_type: 'Model',
    model_id: 'Azure-Speech-Voice-Live',
    model_version: 'Azure-Speech-Voice-Live',
    deployment_name: 'Azure-Speech-Voice-Live',
    auth_type: 'server_secret',
    secret_refs: { speech_key: 'AZURE_SPEECH_VOICE_LIVE_KEY' },
    connection_config: { requires_separate_voice_path: true },
    capabilities: ['speech', 'voice', 'realtime'],
    default_temperature: 0,
    max_tokens: 0,
    is_chat_completion: false,
    is_realtime: true,
    is_enabled: true,
    is_production: false,
  },
  {
    integration_key: 'agent.az-vision-agent',
    display_name: 'az-vision-agent',
    description: 'Vision agent shown in az-vision project.',
    context_type: 'agent',
    azure_project_name: 'az-vision',
    azure_resource_name: 'alazab-ai-resource',
    foundry_resource_name: 'alazab-ai-resource',
    region: 'eastus2',
    resource_type: 'Agent',
    model_id: 'gpt-5.5',
    model_version: 'gpt-5.5',
    deployment_name: 'gpt-5.5',
    agent_id: 'az-vision-agent',
    agent_name: 'az-vision-agent',
    api_version: '2026-04-24',
    apim_base_url: 'https://azabai.azure-api.net',
    auth_type: 'server_secret',
    secret_refs: { openai_key: 'AZURE_OPENAI_API_KEY', apim_key: 'AZURE_APIM_SUBSCRIPTION_KEY' },
    capabilities: ['vision-agent', 'documents', 'technical-review'],
    default_temperature: 0.2,
    max_tokens: 8000,
    is_chat_completion: true,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
  {
    integration_key: 'agent.az-agent-maint',
    display_name: 'az-agent-maint',
    description: 'Maintenance agent shown in az-finance-resource.',
    context_type: 'agent',
    azure_resource_name: 'az-finance-resource',
    foundry_resource_name: 'az-finance-resource',
    region: 'swedencentral',
    resource_type: 'Agent',
    model_id: 'gpt-5.1',
    model_version: 'gpt-5.1',
    deployment_name: 'az-finance',
    agent_id: 'az-agent-maint',
    agent_name: 'az-agent-maint',
    apim_base_url: 'https://azabai.azure-api.net',
    auth_type: 'server_secret',
    secret_refs: { openai_key: 'AZURE_OPENAI_API_KEY', apim_key: 'AZURE_APIM_SUBSCRIPTION_KEY' },
    capabilities: ['maintenance', 'operations', 'priority-detection'],
    default_temperature: 0.3,
    max_tokens: 6000,
    is_chat_completion: true,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
  {
    integration_key: 'agent.az-agent-prod',
    display_name: 'az-agent-prod',
    description: 'Production agent shown in azab-ai-resource.',
    context_type: 'agent',
    azure_resource_name: 'azab-ai-resource',
    foundry_resource_name: 'azab-ai-resource',
    region: 'eastus',
    resource_type: 'Agent',
    model_id: 'gpt-5.1',
    model_version: 'gpt-5.1',
    deployment_name: 'az-finance',
    agent_id: 'az-agent-prod',
    agent_name: 'az-agent-prod',
    apim_base_url: 'https://azabai.azure-api.net',
    auth_type: 'server_secret',
    secret_refs: { openai_key: 'AZURE_OPENAI_API_KEY', apim_key: 'AZURE_APIM_SUBSCRIPTION_KEY' },
    connection_config: { model_binding_needs_confirmation: true },
    capabilities: ['production', 'operations', 'reports'],
    default_temperature: 0.3,
    max_tokens: 6000,
    is_chat_completion: true,
    is_realtime: false,
    is_enabled: true,
    is_production: true,
  },
];

export function getContextById(id?: string): AzureContextDefinition | undefined {
  return AZURE_CONTEXTS.find(context => context.id === id);
}

export function getFallbackByKey(key: string): AzureIntegrationRecord | undefined {
  return AZURE_INTEGRATION_FALLBACKS.find(record => record.integration_key === key);
}

export function getContextFallbackRecords(context: AzureContextDefinition): AzureIntegrationRecord[] {
  return context.relatedIntegrationKeys
    .map(key => getFallbackByKey(key))
    .filter(Boolean) as AzureIntegrationRecord[];
}

export function toDeploymentMap(records: AzureIntegrationRecord[]): Record<string, { deployment: string; apiVersion?: string }> {
  return records
    .filter(record => record.is_chat_completion && record.model_id && record.deployment_name)
    .reduce<Record<string, { deployment: string; apiVersion?: string }>>((acc, record) => {
      acc[record.model_id!] = {
        deployment: record.deployment_name!,
        apiVersion: record.api_version || undefined,
      };
      return acc;
    }, {});
}

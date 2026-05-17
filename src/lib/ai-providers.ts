import { supabase } from '@/integrations/supabase/client';

export type AIProvider = 'azure-apim' | 'openai' | 'deepseek';

interface BaseConfig {
  provider: AIProvider;
  apiKey?: string;
}

export interface AzureApimConfig extends BaseConfig {
  provider: 'azure-apim';
  model: 'gpt-5' | 'gpt-4.1';
}

export interface OpenAIConfig extends BaseConfig {
  provider: 'openai';
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
}

export interface DeepSeekConfig extends BaseConfig {
  provider: 'deepseek';
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export type AIConfig = AzureApimConfig | OpenAIConfig | DeepSeekConfig;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SendOptions {
  temperature?: number;
  maxTokens?: number;
}

const SYSTEM_PROMPT =
  'أنت مساعد ذكي يتحدث باللغة العربية والإنجليزية. قدم إجابات مفيدة ومفصلة واستخدم اللغة التي يستخدمها المستخدم.';

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async sendMessage(messages: ChatMessage[], options?: SendOptions): Promise<string> {
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 1000;

    if (this.config.provider === 'azure-apim') {
      return this.sendAzureApim(messages, this.config, temperature, maxTokens);
    }
    if (this.config.provider === 'openai') {
      return this.sendOpenAIMessage(messages, this.config, temperature, maxTokens);
    }
    if (this.config.provider === 'deepseek') {
      return this.sendDeepSeekMessage(messages, this.config, temperature, maxTokens);
    }
    throw new Error('مزود الذكاء الاصطناعي غير مدعوم');
  }

  private async sendAzureApim(
    messages: ChatMessage[],
    config: AzureApimConfig,
    temperature: number,
    maxTokens: number,
  ): Promise<string> {
    const payload = {
      model: config.model,
      messages: [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...messages],
      temperature,
      max_tokens: maxTokens,
    };

    const { data, error } = await supabase.functions.invoke('azure-ai-chat', { body: payload });

    if (error) {
      const ctx = (error as { context?: Response }).context;
      let serverMsg = error.message;
      try {
        if (ctx) {
          const parsed = await ctx.clone().json();
          if (parsed?.error) serverMsg = parsed.error;
        }
      } catch { /* ignore */ }
      throw new Error(`فشل Azure APIM: ${serverMsg}`);
    }
    if (data?.error) throw new Error(`فشل Azure APIM: ${data.error}`);
    return data?.content || 'عذراً، لم أتمكن من فهم سؤالك. يرجى المحاولة مرة أخرى.';
  }

  private async sendOpenAIMessage(messages: ChatMessage[], config: OpenAIConfig, temperature: number, maxTokens: number): Promise<string> {
    const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': config.apiKey },
      body: JSON.stringify({
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: maxTokens,
        temperature,
        top_p: 0.9,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status} - ${await response.text()}`);
    const data = await response.json();
    return data.choices[0]?.message?.content || 'عذراً، لم أتمكن من فهم سؤالك.';
  }

  private async sendDeepSeekMessage(messages: ChatMessage[], config: DeepSeekConfig, temperature: number, maxTokens: number): Promise<string> {
    const baseUrl = config.baseUrl || 'https://api.deepseek.com';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
    });
    if (!response.ok) throw new Error(`DeepSeek API error: ${response.status} - ${await response.text()}`);
    const data = await response.json();
    return data.choices[0]?.message?.content || 'عذراً، لم أتمكن من فهم سؤالك.';
  }
}

export const aiConfigManager = {
  save: (config: AIConfig) => localStorage.setItem('ai-config', JSON.stringify(config)),
  load: (): AIConfig | null => {
    const stored = localStorage.getItem('ai-config');
    if (stored) return JSON.parse(stored);
    // Default: Azure APIM with gpt-5 (server-side key, no client config needed)
    return { provider: 'azure-apim', model: 'gpt-5' };
  },
  clear: () => localStorage.removeItem('ai-config'),
  isConfigured: (): boolean => {
    const config = aiConfigManager.load();
    if (!config) return false;
    if (config.provider === 'azure-apim') return true; // server-side
    if (config.provider === 'openai') return !!(config.apiKey && config.endpoint && config.deployment);
    if (config.provider === 'deepseek') return !!(config.apiKey && config.model);
    return false;
  },
};

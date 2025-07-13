export type AIProvider = 'openai' | 'deepseek';

interface BaseConfig {
  provider: AIProvider;
  apiKey: string;
}

export interface OpenAIConfig extends BaseConfig {
  provider: 'openai';
  endpoint: string;
  deployment: string;
  apiVersion: string;
}

export interface DeepSeekConfig extends BaseConfig {
  provider: 'deepseek';
  baseUrl?: string;
  model: string;
}

export type AIConfig = OpenAIConfig | DeepSeekConfig;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async sendMessage(messages: ChatMessage[]): Promise<string> {
    if (this.config.provider === 'openai') {
      return this.sendOpenAIMessage(messages, this.config);
    } else if (this.config.provider === 'deepseek') {
      return this.sendDeepSeekMessage(messages, this.config);
    }
    throw new Error('مزود الذكاء الاصطناعي غير مدعوم');
  }

  private async sendOpenAIMessage(messages: ChatMessage[], config: OpenAIConfig): Promise<string> {
    const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.apiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'أنت مساعد ذكي يتحدث باللغة العربية والإنجليزية. قدم إجابات مفيدة ومفصلة واستخدم اللغة التي يستخدمها المستخدم.'
            },
            ...messages
          ],
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'عذراً، لم أتمكن من فهم سؤالك. يرجى المحاولة مرة أخرى.';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`فشل في الاتصال بـ OpenAI: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  }

  private async sendDeepSeekMessage(messages: ChatMessage[], config: DeepSeekConfig): Promise<string> {
    const baseUrl = config.baseUrl || 'https://api.deepseek.com';
    const url = `${baseUrl}/chat/completions`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: 'أنت مساعد ذكي يتحدث باللغة العربية والإنجليزية. قدم إجابات مفيدة ومفصلة واستخدم اللغة التي يستخدمها المستخدم.'
            },
            ...messages
          ],
          max_tokens: 1000,
          temperature: 0.7,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'عذراً، لم أتمكن من فهم سؤالك. يرجى المحاولة مرة أخرى.';
    } catch (error) {
      console.error('DeepSeek API Error:', error);
      throw new Error(`فشل في الاتصال بـ DeepSeek: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  }
}

// Configuration manager for all AI providers
export const aiConfigManager = {
  save: (config: AIConfig) => {
    localStorage.setItem('ai-config', JSON.stringify(config));
  },
  
  load: (): AIConfig | null => {
    const stored = localStorage.getItem('ai-config');
    return stored ? JSON.parse(stored) : null;
  },
  
  clear: () => {
    localStorage.removeItem('ai-config');
  },
  
  isConfigured: (): boolean => {
    const config = aiConfigManager.load();
    if (!config || !config.apiKey) return false;
    
    if (config.provider === 'openai') {
      return !!(config.endpoint && config.deployment);
    } else if (config.provider === 'deepseek') {
      return !!(config.model);
    }
    
    return false;
  }
};
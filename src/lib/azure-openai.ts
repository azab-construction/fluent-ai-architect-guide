interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AzureOpenAIService {
  private config: AzureOpenAIConfig;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
  }

  async sendMessage(messages: ChatMessage[]): Promise<string> {
    const url = `${this.config.endpoint}/openai/deployments/${this.config.deployment}/chat/completions?api-version=${this.config.apiVersion}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey,
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
        throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'عذراً، لم أتمكن من فهم سؤالك. يرجى المحاولة مرة أخرى.';
    } catch (error) {
      console.error('Azure OpenAI API Error:', error);
      throw new Error('فشل في الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.');
    }
  }
}

// Local storage management for API keys
export const configManager = {
  save: (config: AzureOpenAIConfig) => {
    localStorage.setItem('azure-openai-config', JSON.stringify(config));
  },
  
  load: (): AzureOpenAIConfig | null => {
    const stored = localStorage.getItem('azure-openai-config');
    return stored ? JSON.parse(stored) : null;
  },
  
  clear: () => {
    localStorage.removeItem('azure-openai-config');
  },
  
  isConfigured: (): boolean => {
    const config = configManager.load();
    return !!(config?.apiKey && config?.endpoint && config?.deployment);
  }
};
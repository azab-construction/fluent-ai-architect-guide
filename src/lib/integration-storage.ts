// Integration configuration storage manager
export interface IntegrationData {
  id: string;
  status: 'connected' | 'disconnected' | 'error';
  apiKey?: string;
  extraFields?: Record<string, string>;
  settings: Record<string, any>;
  connectedAt?: string;
}

const STORAGE_KEY = 'integrations-config';

export const integrationStorage = {
  loadAll: (): Record<string, IntegrationData> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  },

  load: (id: string): IntegrationData | null => {
    const all = integrationStorage.loadAll();
    return all[id] || null;
  },

  save: (data: IntegrationData) => {
    const all = integrationStorage.loadAll();
    all[data.id] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  remove: (id: string) => {
    const all = integrationStorage.loadAll();
    if (all[id]) {
      all[id].status = 'disconnected';
      all[id].apiKey = undefined;
      all[id].extraFields = undefined;
      all[id].connectedAt = undefined;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  },

  getStatus: (id: string): 'connected' | 'disconnected' | 'error' => {
    const data = integrationStorage.load(id);
    return data?.status || 'disconnected';
  }
};

// Chat analytics storage
export interface ChatAnalyticsData {
  totalMessages: number;
  totalResponses: number;
  messagesByDate: Record<string, number>;
  averageResponseTime: number;
  responseTimes: number[];
  lastUpdated: string;
}

const ANALYTICS_KEY = 'chat-analytics';

export const analyticsStorage = {
  load: (): ChatAnalyticsData => {
    const stored = localStorage.getItem(ANALYTICS_KEY);
    if (stored) return JSON.parse(stored);
    return {
      totalMessages: 0,
      totalResponses: 0,
      messagesByDate: {},
      averageResponseTime: 0,
      responseTimes: [],
      lastUpdated: new Date().toISOString()
    };
  },

  trackMessage: () => {
    const data = analyticsStorage.load();
    data.totalMessages += 1;
    const today = new Date().toISOString().split('T')[0];
    data.messagesByDate[today] = (data.messagesByDate[today] || 0) + 1;
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  },

  trackResponse: (responseTimeMs: number) => {
    const data = analyticsStorage.load();
    data.totalResponses += 1;
    data.responseTimes.push(responseTimeMs);
    // Keep last 100 response times
    if (data.responseTimes.length > 100) {
      data.responseTimes = data.responseTimes.slice(-100);
    }
    data.averageResponseTime = data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length;
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  },

  reset: () => {
    localStorage.removeItem(ANALYTICS_KEY);
  }
};

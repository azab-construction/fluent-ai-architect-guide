// Integration configuration storage manager.
// Security rule: never persist raw API keys, OAuth client secrets, PATs, or bearer tokens in localStorage.
export interface IntegrationData {
  id: string;
  status: 'connected' | 'disconnected' | 'error';
  apiKey?: string;
  extraFields?: Record<string, string>;
  settings: Record<string, any>;
  connectedAt?: string;
  secretRefs?: Record<string, string>;
  publicMetadata?: Record<string, string>;
}

const STORAGE_KEY = 'integrations-config';
const SECRET_FIELD_PATTERNS = /(api[-_ ]?key|token|secret|password|pat|bearer|authorization|clientsecret|client_secret)/i;

function sanitizeIntegrationData(data: IntegrationData): IntegrationData {
  const sanitized: IntegrationData = {
    id: data.id,
    status: data.status,
    settings: data.settings || {},
    connectedAt: data.connectedAt,
    secretRefs: data.secretRefs,
    publicMetadata: data.publicMetadata,
  };

  // Preserve only non-secret extra fields such as safe endpoint URLs or display names.
  if (data.extraFields) {
    const safeExtraFields = Object.fromEntries(
      Object.entries(data.extraFields).filter(([key]) => !SECRET_FIELD_PATTERNS.test(key))
    );
    if (Object.keys(safeExtraFields).length) sanitized.extraFields = safeExtraFields;
  }

  return sanitized;
}

function safeParse(raw: string | null): Record<string, IntegrationData> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, IntegrationData>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, sanitizeIntegrationData(value)])
    );
  } catch {
    return {};
  }
}

export const integrationStorage = {
  loadAll: (): Record<string, IntegrationData> => {
    const all = safeParse(localStorage.getItem(STORAGE_KEY));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all;
  },

  load: (id: string): IntegrationData | null => {
    const all = integrationStorage.loadAll();
    return all[id] || null;
  },

  save: (data: IntegrationData) => {
    const all = integrationStorage.loadAll();
    all[data.id] = sanitizeIntegrationData(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  remove: (id: string) => {
    const all = integrationStorage.loadAll();
    if (all[id]) {
      all[id] = {
        id,
        status: 'disconnected',
        settings: all[id].settings || {},
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  },

  purgeSecrets: () => {
    const all = integrationStorage.loadAll();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  getStatus: (id: string): 'connected' | 'disconnected' | 'error' => {
    const data = integrationStorage.load(id);
    return data?.status || 'disconnected';
  }
};

// Chat analytics storage. Contains counters only, no credentials.
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

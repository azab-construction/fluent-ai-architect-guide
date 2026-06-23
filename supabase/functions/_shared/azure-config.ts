// Shared Azure runtime configuration and callers for Supabase Edge Functions.
// Keep Azure secrets server-side only. Do not import this file from the React app.

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AzureOpenAIConfigInput {
  model?: string;
  deployment?: string;
  apiVersion?: string;
}

export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
  model?: string;
}

export interface AzureChatRequest extends AzureOpenAIConfigInput {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_APIM_BASE_URL = 'https://azabai.azure-api.net';
const DEFAULT_OPENAI_API_VERSION = '2024-08-01-preview';

type DeploymentMapValue = string | {
  deployment?: string;
  apiVersion?: string;
};

function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function envKeyForModel(model?: string): string | null {
  if (!model) return null;
  return model.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function parseDeploymentMap(): Record<string, DeploymentMapValue> {
  const raw = clean(Deno.env.get('AZURE_OPENAI_DEPLOYMENTS_JSON'));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, DeploymentMapValue>;
  } catch {
    return {};
  }
}

function mapValueForModel(model?: string): { deployment?: string; apiVersion?: string } {
  if (!model) return {};
  const mapped = parseDeploymentMap()[model];
  if (!mapped) return {};
  if (typeof mapped === 'string') return { deployment: mapped };
  return mapped;
}

function safeDeployment(value: string | null | undefined): string | null {
  const deployment = clean(value);
  if (!deployment) return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(deployment)) return null;
  return deployment;
}

export function getApimBaseUrl(): string {
  return withoutTrailingSlash(
    clean(Deno.env.get('AZURE_APIM_BASE_URL')) ||
    clean(Deno.env.get('AZURE_APIM_BASE')) ||
    DEFAULT_APIM_BASE_URL,
  );
}

export function getApimSubscriptionKey(): string | null {
  return clean(Deno.env.get('AZURE_APIM_SUBSCRIPTION_KEY')) ||
    clean(Deno.env.get('ALAZAB_AI_PROD_KEY'));
}

export function requireApimSubscriptionKey(): string {
  const key = getApimSubscriptionKey();
  if (!key) throw new Error('AZURE_APIM_SUBSCRIPTION_KEY is not configured');
  return key;
}

export function buildApimUrl(path: string): string {
  return `${getApimBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function readAzureOpenAIConfig(input: AzureOpenAIConfigInput = {}): {
  configured: boolean;
  missing: string[];
  config?: AzureOpenAIConfig;
} {
  const endpoint = clean(Deno.env.get('AZURE_OPENAI_ENDPOINT'));
  const apiKey = clean(Deno.env.get('AZURE_OPENAI_API_KEY'));
  const modelEnvKey = envKeyForModel(input.model);
  const mapped = mapValueForModel(input.model);

  const deployment = safeDeployment(input.deployment) ||
    safeDeployment(mapped.deployment) ||
    safeDeployment(modelEnvKey ? Deno.env.get(`AZURE_OPENAI_DEPLOYMENT_${modelEnvKey}`) : null) ||
    safeDeployment(Deno.env.get('AZURE_OPENAI_DEFAULT_DEPLOYMENT')) ||
    safeDeployment(Deno.env.get('AZURE_OPENAI_DEPLOYMENT'));

  const apiVersion = clean(input.apiVersion) ||
    clean(mapped.apiVersion) ||
    clean(modelEnvKey ? Deno.env.get(`AZURE_OPENAI_API_VERSION_${modelEnvKey}`) : null) ||
    clean(Deno.env.get('AZURE_OPENAI_API_VERSION')) ||
    DEFAULT_OPENAI_API_VERSION;

  const missing = [
    !endpoint ? 'AZURE_OPENAI_ENDPOINT' : null,
    !apiKey ? 'AZURE_OPENAI_API_KEY' : null,
    !deployment ? 'AZURE_OPENAI_DEFAULT_DEPLOYMENT or AZURE_OPENAI_DEPLOYMENT' : null,
  ].filter(Boolean) as string[];

  if (missing.length > 0) return { configured: false, missing };

  return {
    configured: true,
    missing: [],
    config: {
      endpoint: withoutTrailingSlash(endpoint!),
      apiKey: apiKey!,
      deployment: deployment!,
      apiVersion,
      model: input.model,
    },
  };
}

export function resolveAzureOpenAIConfig(input: AzureOpenAIConfigInput = {}): AzureOpenAIConfig {
  const result = readAzureOpenAIConfig(input);
  if (!result.configured || !result.config) {
    throw new Error(`Azure OpenAI secrets not configured: ${result.missing.join(', ')}`);
  }
  return result.config;
}

export function buildAzureOpenAIChatUrl(config: AzureOpenAIConfig): string {
  return `${config.endpoint}/openai/deployments/${encodeURIComponent(config.deployment)}/chat/completions?api-version=${encodeURIComponent(config.apiVersion)}`;
}

export async function callAzureOpenAIChat(request: AzureChatRequest): Promise<{
  response: Response;
  body: any;
  text: string;
  config: AzureOpenAIConfig;
}> {
  const config = resolveAzureOpenAIConfig(request);
  const response = await fetch(buildAzureOpenAIChatUrl(config), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': config.apiKey },
    body: JSON.stringify({
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1200,
    }),
  });

  const text = await response.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }

  return { response, body, text, config };
}

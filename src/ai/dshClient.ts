import { aiConfig } from './config';
import { logCall } from './logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallOptions {
  agent: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  retries?: number;
  jsonMode?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CallResult {
  content: string;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ChatCompletionResponse {
  choices: Array<{ message: { role: string; content: string }; finish_reason: string }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

async function callOnce(options: CallOptions): Promise<CallResult> {
  const started = Date.now();
  const body: Record<string, unknown> = {
    model: aiConfig.model,
    messages: options.messages,
    temperature: options.temperature ?? 0,
    max_tokens: options.maxTokens ?? 4096,
  };

  if (options.jsonMode ?? true) {
    body["response_format"] = { type: 'json_object' };
  }
  const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const durationMs = Date.now() - started;
  if (!response.ok) {
    const text = await response.text();
    throw Object.assign(
      new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`),
      { status: response.status }
    );
  }
  const json = (await response.json()) as ChatCompletionResponse;
  const content = json.choices?.[0]?.message?.content ?? '';
  const usage = json.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  return {
    content,
    durationMs,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}

export async function callModel(options: CallOptions): Promise<CallResult> {
  const maxAttempts = (options.retries ?? 2) + 1;
  const promptText = options.messages.map((m) => `[${m.role}] ${m.content}`).join('\n\n');
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await callOnce(options);
      await logCall({
        timestamp: new Date().toISOString(),
        agent: options.agent,
        model: aiConfig.model,
        prompt: promptText,
        response: result.content,
        durationMs: result.durationMs,
        status: 'ok',
        metadata: { ...options.metadata, attempt, totalTokens: result.totalTokens },
      });
      return result;
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      const retryable = status === undefined || RETRYABLE_STATUS.has(status);
      if (!retryable || attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  await logCall({
    timestamp: new Date().toISOString(),
    agent: options.agent,
    model: aiConfig.model,
    prompt: promptText,
    response: '',
    durationMs: 0,
    status: 'error',
    error: message,
    metadata: options.metadata,
  });
  throw lastError;
}

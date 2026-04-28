import { NextResponse } from 'next/server';
import { buildSystemPrompt, type AIResponse } from '@/lib/prompts';
import { isToneId, type ToneId } from '@/lib/tones';

export const runtime = 'edge';

const MAX_TOKENS = 1500;
const TIMEOUT_MS = 30_000;
const MIN_INPUT = 30;
const MAX_INPUT = 2000;

// Fallback chain. OpenRouter tries primary first; on errors (incl. 429s
// when one provider's pool is throttled upstream) it falls through in order.
// Quality-ordered for creative/Hinglish output.
const FALLBACK_MODELS = [
  'meta-llama/llama-3.3-70b-instruct',
  'deepseek/deepseek-chat',
];

const RETRY_INSTRUCTION =
  '\n\nIMPORTANT: Respond with VALID JSON ONLY — no prose, no markdown fences, no commentary. Exactly the three string fields specified above.';

type GenerateRequest = {
  tone: ToneId;
  dayInput: string;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

const errorResponse = (status: number, error: string, retryable: boolean) =>
  NextResponse.json({ error, retryable }, { status });

const stripCodeFences = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
};

const parseAIResponse = (raw: string): AIResponse | null => {
  try {
    const obj = JSON.parse(stripCodeFences(raw));
    if (
      obj &&
      typeof obj.reflection === 'string' &&
      typeof obj.fix_line === 'string' &&
      typeof obj.punchy_line === 'string' &&
      obj.reflection.trim().length > 0 &&
      obj.fix_line.trim().length > 0 &&
      obj.punchy_line.trim().length > 0
    ) {
      return {
        reflection: obj.reflection,
        fix_line: obj.fix_line,
        punchy_line: obj.punchy_line,
      };
    }
    return null;
  } catch {
    return null;
  }
};

type ProviderResult =
  | { ok: true; raw: string; debug: string }
  | { ok: false; status: number; message: string };

const callProvider = async (
  systemPrompt: string,
  userInput: string,
  signal: AbortSignal,
): Promise<ProviderResult> => {
  const baseUrl = process.env.AI_PROVIDER_BASE_URL ?? 'https://openrouter.ai/api/v1';
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const primaryModel = process.env.AI_MODEL ?? 'google/gemini-2.0-flash-001';

  if (!apiKey) {
    return { ok: false, status: 500, message: 'AI provider API key not configured' };
  }

  const models = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  const t0 = Date.now();
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? '',
      'X-Title': 'Mirror',
    },
    body: JSON.stringify({
      models,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
    }),
    signal,
  });
  const t1 = Date.now();

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return {
      ok: false,
      status: response.status,
      message: `Provider ${response.status}: ${text.slice(0, 240)}`,
    };
  }

  const data = (await response.json()) as ChatCompletionResponse & {
    model?: string;
    usage?: { completion_tokens?: number; prompt_tokens?: number };
  };
  const t2 = Date.now();
  const raw = data.choices?.[0]?.message?.content ?? '';
  const debug = `model=${data.model ?? '?'} fetch=${t1 - t0}ms parse=${t2 - t1}ms tokens_out=${data.usage?.completion_tokens ?? '?'}`;
  console.log(`[api/generate] ${debug}`);
  if (!raw) {
    return { ok: false, status: 502, message: 'Empty response from provider' };
  }
  return { ok: true, raw, debug };
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body', false);
  }

  const { tone, dayInput } = (body ?? {}) as Partial<GenerateRequest>;

  if (!isToneId(tone)) {
    return errorResponse(400, 'Invalid tone. Must be one of: roast, mirror, maa.', false);
  }
  if (typeof dayInput !== 'string') {
    return errorResponse(400, 'dayInput must be a string.', false);
  }
  const trimmed = dayInput.trim();
  if (trimmed.length < MIN_INPUT) {
    return errorResponse(400, `dayInput must be at least ${MIN_INPUT} characters.`, false);
  }
  if (trimmed.length > MAX_INPUT) {
    return errorResponse(400, `dayInput must be at most ${MAX_INPUT} characters.`, false);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const systemPrompt = buildSystemPrompt(tone);

    const first = await callProvider(systemPrompt, trimmed, controller.signal);
    if (!first.ok) {
      console.error('[api/generate] provider error (first):', first.message);
      return errorResponse(
        first.status >= 500 ? 502 : first.status,
        first.message,
        first.status >= 500,
      );
    }
    const parsed = parseAIResponse(first.raw);
    if (parsed) {
      return NextResponse.json(parsed, {
        status: 200,
        headers: { 'x-mirror-debug': first.debug },
      });
    }

    console.warn('[api/generate] first parse failed, retrying. raw:', first.raw.slice(0, 200));
    const retry = await callProvider(
      systemPrompt + RETRY_INSTRUCTION,
      trimmed,
      controller.signal,
    );
    if (!retry.ok) {
      console.error('[api/generate] provider error (retry):', retry.message);
      return errorResponse(502, retry.message, true);
    }
    const retryParsed = parseAIResponse(retry.raw);
    if (retryParsed) return NextResponse.json(retryParsed, { status: 200 });

    console.error('[api/generate] retry parse failed. raw:', retry.raw.slice(0, 200));
    return errorResponse(502, 'AI returned invalid JSON twice', true);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return errorResponse(504, 'AI provider timed out', true);
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/generate] unexpected:', message);
    return errorResponse(500, message, true);
  } finally {
    clearTimeout(timeout);
  }
}

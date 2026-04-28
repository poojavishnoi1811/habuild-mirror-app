import type { ToneId } from './tones';

export type WatiParam = { name: string; value: string };

export type SendResult =
  | { ok: true; raw?: unknown }
  | { ok: false; error: string; status?: number; raw?: unknown };

export function templateNameFor(day: number, tone: ToneId): string {
  return `mirror_d${day}_${tone}`;
}

export function normalizePhone(countryCode: string, phone: string): string {
  return (countryCode + phone).replace(/\D/g, '');
}

export async function sendWatiTemplate({
  countryCode,
  phone,
  templateName,
  parameters = [],
  broadcastName,
}: {
  countryCode: string;
  phone: string;
  templateName: string;
  parameters?: WatiParam[];
  broadcastName?: string;
}): Promise<SendResult> {
  const baseUrl = process.env.WATI_API_BASE_URL;
  const token = process.env.WATI_API_TOKEN;
  if (!baseUrl || !token) {
    return { ok: false, error: 'WATI_API_BASE_URL or WATI_API_TOKEN missing' };
  }

  const whatsappNumber = normalizePhone(countryCode, phone);
  const url = `${baseUrl}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(
    whatsappNumber,
  )}`;
  const body = {
    template_name: templateName,
    broadcast_name: broadcastName ?? `mirror_${templateName}_${Date.now()}`,
    parameters,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
          ? data.message
          : `HTTP ${res.status}`;
      return { ok: false, error: msg, status: res.status, raw: data };
    }
    return { ok: true, raw: data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

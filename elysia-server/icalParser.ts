import ical from 'node-ical';

export interface ParsedEvent {
  uid: string;
  summary: string;
  description: string | null;
  start: Date;
  end: Date;
  status: 'CONFIRMED' | 'CANCELLED' | 'TENTATIVE';
}

/**
 * Fetch with one retry on transient (5xx / network) failures. 4xx responses
 * (e.g. URL is wrong) bubble up immediately because retrying won't fix them.
 * The 1.5s gap is short enough not to blow the 10s outer timeout but long
 * enough to ride out a brief platform hiccup.
 */
async function fetchOnce(url: string, signal: AbortSignal): Promise<Response> {
  const r = await fetch(url, { signal });
  if (r.ok) return r;
  if (r.status >= 400 && r.status < 500) return r; // client error — caller throws
  throw new Error(`HTTP ${r.status}: ${r.statusText}`);
}

export async function fetchAndParseICal(url: string): Promise<ParsedEvent[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let text: string;
  try {
    let response: Response;
    try {
      response = await fetchOnce(url, controller.signal);
    } catch (firstErr) {
      // First attempt died on transient/network/5xx — wait briefly and retry once.
      await new Promise((r) => setTimeout(r, 1500));
      response = await fetchOnce(url, controller.signal);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    text = await response.text();
  } finally {
    clearTimeout(timeout);
  }

  const data = ical.parseICS(text);
  const events: ParsedEvent[] = [];

  for (const key of Object.keys(data)) {
    const raw = data[key] as any;
    if (!raw || raw.type !== 'VEVENT') continue;
    if (!raw.uid || !raw.start || !raw.end) continue;

    const start = raw.start instanceof Date ? raw.start : new Date(raw.start);
    const end = raw.end instanceof Date ? raw.end : new Date(raw.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

    const rawStatus = String(raw.status || 'CONFIRMED').toUpperCase();
    const status: ParsedEvent['status'] =
      rawStatus === 'CANCELLED' ? 'CANCELLED'
      : rawStatus === 'TENTATIVE' ? 'TENTATIVE'
      : 'CONFIRMED';

    events.push({
      uid: String(raw.uid),
      summary: String(raw.summary || '').trim(),
      description: raw.description ? String(raw.description).trim() : null,
      start,
      end,
      status,
    });
  }

  return events;
}

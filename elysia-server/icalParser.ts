import ical from 'node-ical';

export interface ParsedEvent {
  uid: string;
  summary: string;
  description: string | null;
  start: Date;
  end: Date;
  status: 'CONFIRMED' | 'CANCELLED' | 'TENTATIVE';
}

export async function fetchAndParseICal(url: string): Promise<ParsedEvent[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let text: string;
  try {
    const response = await fetch(url, { signal: controller.signal });
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

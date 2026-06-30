export interface SSEEvent {
  event: string;
  task_id: string;
  message_id?: string;
  workflow_run_id?: string;
  data: string | Record<string, unknown>;
}

export interface SearchStep {
  round: number;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

const DIFY_API_BASE = '/api/dify';

export async function runWorkflowBlocking(
  apiKey: string,
  query: string,
  maxResults: number,
): Promise<string> {
  const res = await fetch(`${DIFY_API_BASE}/workflows/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: { query, max_results: maxResults },
      response_mode: 'blocking',
      user: `user-${Date.now()}`,
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { message?: string }).message || `API 错误: ${res.status}`);
  }
  const raw = await res.json();

  // 深度搜索所有路径
  function deepFind(obj: unknown, depth = 0): string | null {
    if (depth > 10 || !obj || typeof obj !== 'object') return null;
    const o = obj as Record<string, unknown>;

    // 直接匹配常见字段
    if (typeof o.text === 'string' && o.text.length > 50) return o.text;
    if (typeof o.answer === 'string' && o.answer.length > 50) return o.answer;
    if (typeof o.result === 'string' && o.result.length > 50) return o.result;
    if (typeof o.output === 'string' && o.output.length > 50) return o.output;

    for (const key of Object.keys(o)) {
      const val = o[key];
      if (typeof val === 'string' && val.length > 50 && key !== 'query' && key !== 'message') return val;
      if (val && typeof val === 'object') {
        const found = deepFind(val, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  // 先尝试标准路径
  const data = raw as Record<string, unknown>;
  const inner = (data.data || data) as Record<string, unknown>;
  const outputs = (inner.outputs || {}) as Record<string, string>;
  if (outputs.result|| outputs.text || outputs.output || outputs.answer) {
    return outputs.result || outputs.text || outputs.output || outputs.answer || '';
  }

  // 深度搜索
  const found = deepFind(raw);
  if (found) return found;

  // 兜底：把整个响应 JSON 作为结果展示，方便诊断
  throw new Error('RAW_RESPONSE:' + JSON.stringify(raw).slice(0, 2000));
}

export async function runWorkflowStreaming(
  apiKey: string,
  query: string,
  maxResults: number,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const res = await fetch(`${DIFY_API_BASE}/workflows/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: { query, max_results: maxResults },
      response_mode: 'streaming',
      user: `user-${Date.now()}`,
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { message?: string }).message || `API 错误: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('无法获取响应流');
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch { /* skip */ }
      }
    }
  }
}

const NODE_MAP: Record<string, number> = {
  '关键词优化（第1轮）': 0,
  'ArXiv查询参数（第1轮）': 1,
  'ArXiv HTTP请求（第1轮）': 2,
  'ArXiv解析结果（第1轮）': 3,
  '质量判断（第1轮）': 4,
  '是否满意（第1轮）': 5,
  '关键词优化（第2轮）': 6,
  'ArXiv查询参数（第2轮）': 7,
  'ArXiv HTTP请求（第2轮）': 8,
  'ArXiv解析结果（第2轮）': 9,
  '质量判断（第2轮）': 10,
  '是否满意（第2轮）': 11,
  '关键词优化（第3轮）': 12,
  'ArXiv查询参数（第3轮）': 13,
  'ArXiv HTTP请求（第3轮）': 14,
  'ArXiv解析结果（第3轮）': 15,
  '结果整理输出': 16,
};

const STEPS: SearchStep[] = [
  { round: 1, label: '关键词优化（第1轮）', status: 'pending' },
  { round: 1, label: '查询参数（第1轮）', status: 'pending' },
  { round: 1, label: 'HTTP请求（第1轮）', status: 'pending' },
  { round: 1, label: '解析结果（第1轮）', status: 'pending' },
  { round: 1, label: '质量判断（第1轮）', status: 'pending' },
  { round: 1, label: '条件判断（第1轮）', status: 'pending' },
  { round: 2, label: '关键词优化（第2轮）', status: 'pending' },
  { round: 2, label: '查询参数（第2轮）', status: 'pending' },
  { round: 2, label: 'HTTP请求（第2轮）', status: 'pending' },
  { round: 2, label: '解析结果（第2轮）', status: 'pending' },
  { round: 2, label: '质量判断（第2轮）', status: 'pending' },
  { round: 2, label: '条件判断（第2轮）', status: 'pending' },
  { round: 3, label: '关键词优化（第3轮）', status: 'pending' },
  { round: 3, label: '查询参数（第3轮）', status: 'pending' },
  { round: 3, label: 'HTTP请求（第3轮）', status: 'pending' },
  { round: 3, label: '解析结果（第3轮）', status: 'pending' },
  { round: 0, label: '结果整理输出', status: 'pending' },
];

export function parseStepsFromEvents(events: SSEEvent[]): SearchStep[] {
  const steps = STEPS.map(s => ({ ...s }));
  for (const evt of events) {
    // data 可能是 string 或已解析的 object
    let data: Record<string, unknown> | null = null;
    try {
      if (typeof evt.data === 'string') {
        data = JSON.parse(evt.data) as Record<string, unknown>;
      } else if (evt.data && typeof evt.data === 'object') {
        data = evt.data as Record<string, unknown>;
      }
    } catch {}
    if (!data) continue;

    const title = (data.title as string) || '';
    const idx = NODE_MAP[title];
    if (idx === undefined) continue;
    if (evt.event === 'node_started') steps[idx].status = 'active';
    if (evt.event === 'node_finished') steps[idx].status = 'completed';
  }
  return steps;
}

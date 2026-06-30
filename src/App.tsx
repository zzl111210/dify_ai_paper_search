import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  runWorkflowBlocking,
  type SearchStep,
} from './api';

const QUICK_EXAMPLES = [
  '大语言模型的幻觉检测方法',
  'RIS 辅助 DOA 估计',
  'diffusion model channel estimation',
  'sparse array DOA estimation coprime array',
  '联邦学习中的隐私保护技术',
  '扩散模型在图像生成领域的突破',
];

function App() {
  const [view, setView] = useState<'search' | 'settings'>('search');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('dify_api_key') || '');
  const [query, setQuery] = useState('');
  const [maxResults, setMaxResults] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [steps, setSteps] = useState<SearchStep[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<{ q: string; a: string; t: string }[]>([]);

  const saveKey = (k: string) => { setApiKey(k); localStorage.setItem('dify_api_key', k); };

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return setError('请输入论文查询需求');
    if (!apiKey.trim()) { setError('请先在设置中配置 Dify API Key'); setView('settings'); return; }

    setLoading(true); setResult(''); setError(''); setSteps([]);
    let sec = 0;
    setElapsed(0);
    const timer = setInterval(() => setElapsed(++sec), 1000);

    // 进度模拟：阻塞模式下 Dify 不返回节点进度，直接获取最终结果
    // 显示一个模拟的进度指示让用户知道正在工作
    const simSteps: SearchStep[] = [
      { round: 1, label: '关键词优化（第1轮）', status: 'pending' },
      { round: 1, label: 'HTTP直连ArXiv（第1轮）', status: 'pending' },
      { round: 1, label: '质量判断（第1轮）', status: 'pending' },
      { round: 2, label: '关键词优化（第2轮）', status: 'pending' },
      { round: 2, label: 'HTTP直连ArXiv（第2轮）', status: 'pending' },
      { round: 2, label: '质量判断（第2轮）', status: 'pending' },
      { round: 3, label: '关键词优化（第3轮）', status: 'pending' },
      { round: 3, label: 'HTTP直连ArXiv（第3轮）', status: 'pending' },
      { round: 0, label: '结果整理输出', status: 'pending' },
    ];

    // 模拟进度逐步推进
    const advanceStep = (idx: number) => {
      if (idx >= simSteps.length) return;
      simSteps[idx].status = 'active';
      setSteps([...simSteps]);
      setTimeout(() => {
        simSteps[idx].status = 'completed';
        setSteps([...simSteps]);
      }, 600);
    };

    let simIdx = 0;
    const simInterval = setInterval(() => {
      if (simIdx < simSteps.length) advanceStep(simIdx++);
    }, 1500);

    try {
      const r = await runWorkflowBlocking(apiKey, q, maxResults);
      simSteps.forEach(s => s.status = 'completed');
      setSteps([...simSteps]);
      setResult(r);
      setHistory(prev => [{ q, a: r, t: new Date().toLocaleString() }, ...prev.slice(0, 19)]);
    } catch (e) {
      const msg = (e as Error).message || '';
      if (msg.startsWith('RAW_RESPONSE:')) {
        // 解析失败，展示原始响应
        const raw = msg.replace('RAW_RESPONSE:', '');
        try {
          const preview = JSON.stringify(JSON.parse(raw), null, 2);
          setResult('```json\n' + preview + '\n```\n\n> 未能自动解析结果，请复制以上 JSON 告知我');
        } catch { setResult(raw); }
      } else {
        setError(msg || '请求失败');
      }
    }

    clearInterval(simInterval);
    clearInterval(timer);
    setLoading(false);
  }, [query, maxResults, apiKey]);

  const completedRounds = new Set(steps.filter(s => s.status === 'completed' && s.round > 0).map(s => s.round));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-blue-200">📄</div>
            <div><h1 className="text-lg font-bold text-slate-800">论文查询助手</h1><p className="text-xs text-slate-500">迭代优化关键词 · 精准检索 ArXiv</p></div>
          </div>
          <button onClick={() => setView(view === 'settings' ? 'search' : 'settings')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all">
            {view === 'settings' ? '← 返回' : '⚙️ 设置'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {view === 'settings' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-2">API 配置</h2>
              <p className="text-sm text-slate-500 mb-4">输入 Dify 应用的 API Key，在 Dify 平台「API 访问」页面获取。</p>
              <input type="password" value={apiKey} onChange={e => saveKey(e.target.value)} placeholder="app-xxxxxxxxxxxxxxxx" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm" />
              {apiKey && <div className="mt-3 text-sm text-emerald-600">✓ API Key 已配置</div>}
              <button onClick={() => setView('search')} className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all">保存并返回</button>
            </div>
          </div>
        )}

        {view === 'search' && (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">论文查询需求</label>
                  <textarea value={query} onChange={e => setQuery(e.target.value)} placeholder="例如：RIS-assisted DOA estimation residual smoothing..." rows={3} disabled={loading}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:border-blue-500 transition-all text-sm resize-none" />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-slate-700 mb-2">数量</label>
                  <select value={maxResults} onChange={e => setMaxResults(+e.target.value)} disabled={loading}
                    className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:border-blue-500 transition-all text-sm">
                    {[3, 5, 7, 10, 15].map(n => <option key={n} value={n}>{n} 篇</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">最多 3 轮迭代优化搜索关键词</span>
                <button onClick={handleSearch} disabled={loading || !query.trim()}
                  className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all flex items-center gap-2">
                  {loading ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>搜索中...</> : <>🔍 开始查询</>}
                </button>
              </div>
            </div>

            {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">⚠️ {error}</div>}

            {loading && (
              <div className="mb-6 bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                {/* 顶部：当前状态横幅 */}
                {(() => {
                  const activeStep = steps.find(s => s.status === 'active');
                  const activeRound = activeStep?.round || 1;
                  const totalCompleted = steps.filter(s => s.status === 'completed').length;
                  const total = steps.length;
                  const pct = Math.round((totalCompleted / total) * 100);
                  return (
                    <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-blue-50 via-blue-100 to-cyan-50 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-xs text-blue-500 font-medium uppercase tracking-wide">当前进度</span>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-2xl font-bold text-blue-700">
                              {activeStep ? `第 ${activeRound || 1} 轮迭代` : '初始化中...'}
                            </span>
                            {activeStep && (
                              <span className="text-sm text-blue-500">
                                · {activeStep.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{elapsed}<span className="text-sm text-blue-400">s</span></div>
                          <div className="text-xs text-blue-400">已用时</div>
                        </div>
                      </div>
                      {/* 进度条 */}
                      <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-blue-400 mt-1 text-right">{totalCompleted}/{total} 步骤完成</div>
                    </div>
                  );
                })()}

                {/* 各轮详情 */}
                <div className="space-y-2">
                  {[1, 2, 3].map(round => {
                    const rs = steps.filter(s => s.round === round);
                    if (rs.length === 0) return null;
                    const active = rs.some(s => s.status === 'active');
                    const done = rs.every(s => s.status === 'completed');

                    // 第2、3轮还没开始时隐藏
                    if (round > 1 && rs.every(s => s.status === 'pending')) {
                      return (
                        <div key={round} className="flex items-center gap-3 py-2 opacity-30">
                          <span className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">{round}</span>
                          <span className="text-xs text-slate-400">第 {round} 轮迭代 — 等待中</span>
                        </div>
                      );
                    }

                    return (
                      <div key={round}>
                        {/* 轮次标题 */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-sm ${done ? 'bg-emerald-500' : active ? 'bg-blue-500 animate-pulse shadow-blue-200' : 'bg-slate-400'}`}>
                            {done ? '✓' : round}
                          </span>
                          <span className={`font-bold text-sm ${done ? 'text-emerald-700' : active ? 'text-blue-700' : 'text-slate-600'}`}>
                            第 {round} 轮迭代
                          </span>
                          {active && <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">进行中</span>}
                          {done && <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">✓ 完成</span>}
                        </div>

                        {/* 步骤流水线 */}
                        <div className="flex items-center gap-0.5 ml-1 pl-9">
                          {rs.map((s, i) => {
                            const isActive = s.status === 'active';
                            const isDone = s.status === 'completed';
                            return (
                              <div key={i} className="flex items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className={`w-2 h-2 rounded-full ${isDone ? 'bg-emerald-400' : isActive ? 'bg-blue-500 animate-ping' : 'bg-slate-300'}`} />
                                  <span className={`text-[11px] whitespace-nowrap ${isDone ? 'text-emerald-600 font-medium' : isActive ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                                    {s.label}
                                  </span>
                                </div>
                                {i < rs.length - 1 && (
                                  <span className={`w-4 h-px ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 最终整理 */}
                {steps.find(s => s.round === 0) && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {(() => {
                      const s = steps.find(x => x.round === 0)!;
                      return (
                        <div className={`flex items-center gap-2 ${s.status === 'active' ? 'text-cyan-700 font-bold' : s.status === 'completed' ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${s.status === 'active' ? 'bg-cyan-100' : s.status === 'completed' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                            {s.status === 'active' ? '⟳' : s.status === 'completed' ? '✓' : '·'}
                          </span>
                          <span className="text-sm">{s.label}</span>
                          {s.status === 'active' && <span className="text-[10px] bg-cyan-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">整理中</span>}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                <div className="flex justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">📋 查询结果</h2>
                  <span className="text-xs text-slate-400">耗时 {elapsed}s</span>
                </div>
                <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown></div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => { setResult(''); setSteps([]); }} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">清除</button>
                  <button onClick={handleSearch} className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm hover:bg-blue-100">重新查询</button>
                </div>
              </div>
            )}

            {!loading && !result && history.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 mb-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">💡 快速示例</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {QUICK_EXAMPLES.map((ex, i) => (
                    <button key={i} onClick={() => setQuery(ex)} className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-sm text-blue-700 text-left transition-all">{ex}</button>
                  ))}
                </div>
              </div>
            )}

            {history.length > 0 && !loading && !result && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4">📜 查询历史</h2>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {history.map((h, i) => (
                    <div key={i} onClick={() => { setQuery(h.q); setResult(h.a); }} className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 cursor-pointer border border-slate-200 hover:border-blue-200">
                      <div className="flex justify-between"><span className="text-sm font-medium text-slate-700 truncate">{h.q}</span><span className="text-xs text-slate-400">{h.t}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && !result && history.length === 0 && (
              <div className="mt-6 bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4">🧠 工作流原理</h2>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[
                    ['🔄', '迭代优化', '3轮自动优化关键词'],
                    ['🤖', '智能评估', 'AI自动判断结果质量'],
                    ['📝', '格式整理', '中文摘要+结构化输出'],
                  ].map(([icon, title, desc], i) => (
                    <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                      <div className="text-2xl mb-1">{icon}</div>
                      <h3 className="font-semibold text-sm">{title}</h3>
                      <p className="text-xs text-slate-600">{desc}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 text-center">
                  用户输入 → 关键词优化 → ArXiv搜索 → 质量判断 → 满意？✓:结果整理 | ✗:重新优化（最多3轮）
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200">论文查询助手（迭代优化版）· Dify Workflow · ArXiv</footer>
    </div>
  );
}

export default App;

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles, X, Send, Wand2, Loader2, Target, FileText, CheckCircle2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { streamElevaChat } from '../_lib/eleva-client';

interface ToolEvent {
  toolCallId: string;
  toolName: string;
  args?: unknown;
  result?: unknown;
  status: 'calling' | 'done';
}

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tools?: ToolEvent[];
  streaming?: boolean;
}

const suggestions = [
  'Rewrite: Built the pricing API',
  'Score my resume against a JD',
  'Draft a cover letter for Staff PM at Notion',
  'Improve my summary for a staff engineer role',
];

const seeded: Msg[] = [
  {
    id: 'seed-1',
    role: 'assistant',
    text: "Hey Ashish 👋 I'm your Eleva copilot. Try one of the shortcuts below — I can rewrite bullets, score ATS, or draft a cover letter in real time.",
  },
];

function toolIcon(name: string) {
  if (name === 'rewrite_bullet') return Wand2;
  if (name === 'score_ats') return Target;
  if (name === 'draft_cover_letter') return FileText;
  return Sparkles;
}
function toolLabel(name: string) {
  return {
    rewrite_bullet: 'Rewriting bullet',
    score_ats: 'Scoring against JD',
    draft_cover_letter: 'Drafting cover letter',
  }[name] ?? name;
}

export function ElevaCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(seeded);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (raw?: string) => {
    const content = (raw ?? input).trim();
    if (!content || busy) return;
    setInput('');
    setBusy(true);

    const userMsg: Msg = { id: 'u-' + Date.now(), role: 'user', text: content };
    const assistantId = 'a-' + Date.now();
    const assistantMsg: Msg = { id: assistantId, role: 'assistant', text: '', tools: [], streaming: true };
    setMessages((m) => [...m, userMsg, assistantMsg]);

    const history = [...messages.filter((m) => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.text })), { role: 'user' as const, content }];

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      for await (const ev of streamElevaChat(history, ctrl.signal)) {
        setMessages((all) => all.map((m) => {
          if (m.id !== assistantId) return m;
          const next: Msg = { ...m, tools: m.tools ? [...m.tools] : [] };
          if (ev.type === 'text-delta') next.text += ev.delta;
          else if (ev.type === 'tool-call') {
            next.tools!.push({ toolCallId: ev.toolCallId, toolName: ev.toolName, args: ev.args, status: 'calling' });
          } else if (ev.type === 'tool-result') {
            const t = next.tools!.find((x) => x.toolCallId === ev.toolCallId);
            if (t) { t.result = ev.result; t.status = 'done'; }
          } else if (ev.type === 'finish') {
            next.streaming = false;
          }
          return next;
        }));
      }
    } catch {
      // abort or network error — ignore
    } finally {
      setBusy(false);
      abortRef.current = null;
      setMessages((all) => all.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)));
    }
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl group"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))',
          boxShadow: '0 12px 40px -8px rgba(37,99,235,.6)',
        }}
        data-testid="copilot-trigger"
        aria-label="Open Eleva AI Copilot"
      >
        <motion.div
          className="absolute -top-8 whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))', color: 'rgb(var(--eleva-fg))' }}
        >
          Ask Eleva
        </motion.div>
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6 text-white" strokeWidth={2} />
            </motion.div>
          ) : (
            <motion.div key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="relative">
              <Sparkles className="w-6 h-6 text-white" strokeWidth={2} />
              <span className="absolute inset-0 rounded-full eleva-pulse-ring" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed bottom-24 right-6 z-40 w-[400px] h-[600px] rounded-2xl flex flex-col overflow-hidden"
            style={{
              background: 'rgb(var(--eleva-card))',
              border: '1px solid rgb(var(--eleva-border))',
              boxShadow: '0 30px 80px -20px rgba(2,6,23,.35)',
            }}
            data-testid="copilot-panel"
          >
            <div className="h-14 flex items-center gap-3 px-4 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  Eleva Copilot
                </div>
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: busy ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-success))' }} />
                  {busy ? 'Thinking…' : 'Online · streaming with tools'}
                </div>
              </div>
              <span className="eleva-kbd">⌘/</span>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <MsgRow key={m.id} msg={m} />
              ))}
            </div>

            <div className="px-3 pt-2 pb-1 flex gap-1.5 flex-wrap border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              {suggestions.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy}
                  className="text-[11px] px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
                  style={{
                    background: 'rgb(var(--eleva-muted))',
                    color: 'rgb(var(--eleva-muted-fg))',
                  }}
                  data-testid={`copilot-suggestion-${s.slice(0, 10).replace(/\s/g, '-')}`}
                >
                  <Wand2 className="w-3 h-3 inline mr-1" />
                  {s.length > 32 ? s.slice(0, 32) + '…' : s}
                </button>
              ))}
            </div>

            <div className="p-3 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="Ask Eleva anything…"
                disabled={busy}
                className="flex-1 h-10 px-3 rounded-lg text-sm outline-none disabled:opacity-60"
                style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
                data-testid="copilot-input"
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                className="w-10 h-10 rounded-lg flex items-center justify-center disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}
                data-testid="copilot-send"
              >
                {busy ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MsgRow({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={isUser ? 'flex justify-end' : 'flex gap-2'}>
      {!isUser && (
        <div className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className="max-w-[85%] space-y-1.5">
        {/* Tool calls */}
        {msg.tools?.map((t) => {
          const Icon = toolIcon(t.toolName);
          return (
            <div
              key={t.toolCallId}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-mono"
              style={{
                background: 'rgba(37,99,235,.08)',
                border: '1px solid rgba(37,99,235,.2)',
                color: 'rgb(var(--eleva-primary))',
              }}
            >
              {t.status === 'calling' ? (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-3 h-3 shrink-0" />
              )}
              <Icon className="w-3 h-3 shrink-0" />
              <span className="truncate">{toolLabel(t.toolName)}</span>
              {t.status === 'done' && <span className="opacity-60 shrink-0">· done</span>}
            </div>
          );
        })}
        {/* Text */}
        {msg.text && (
          <div
            className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
            style={{
              background: isUser
                ? 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))'
                : 'rgb(var(--eleva-muted))',
              color: isUser ? '#fff' : 'rgb(var(--eleva-fg))',
            }}
          >
            {msg.text}
            {msg.streaming && <span className="inline-block w-1.5 h-3 -mb-0.5 ml-0.5 rounded-sm" style={{ background: 'rgb(var(--eleva-primary))', animation: 'eleva-blink 1s infinite' }} />}
          </div>
        )}
      </div>
    </motion.div>
  );
}

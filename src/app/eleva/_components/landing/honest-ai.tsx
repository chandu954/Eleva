import { ShieldCheck, X, Check } from 'lucide-react';

const neverFabricates = [
  'Employers you haven\'t worked for',
  'Job titles you haven\'t held',
  'Projects you haven\'t built',
  'Degrees you haven\'t earned',
  'Skills you don\'t have',
  'Performance metrics unsupported by your resume',
];

export function HonestAI() {
  return (
    <section className="eleva-section-tight relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mb-4" style={{ border: '1px solid rgb(var(--eleva-border))', background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
            <ShieldCheck className="w-3 h-3" />
            Honest AI
          </div>
          <h2 className="font-display font-semibold leading-[1.04]" style={{ fontSize: 'clamp(2.5rem, 4.2vw, 4rem)', letterSpacing: '-0.035em', color: 'rgb(var(--eleva-fg))' }}>
            Improve the signal.<br />Never invent the experience.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Eleva can rewrite, reorganize, and emphasize information already supported by your background. It will never fabricate your credentials.
          </p>
          <div className="mt-6 space-y-2.5">
            {neverFabricates.map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-[13.5px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(148,163,184,0.14)' }}>
                  <X className="w-3 h-3" style={{ color: '#94A3B8' }} strokeWidth={2.5} />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
        <div
          className="rounded-[18px] p-6"
          style={{
            background: 'rgba(255,255,255,0.96)',
            border: '1px solid rgba(148,163,184,0.20)',
            boxShadow: '0 20px 60px rgba(15,23,42,0.08)',
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Example diff · Eleva change
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-medium mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Original</div>
              <div
                className="rounded-lg p-4 text-[14px] leading-relaxed"
                style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
              >
                Worked on backend APIs.
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: 'rgba(37,99,235,0.1)', color: 'rgb(var(--eleva-primary))' }}>
                ↓
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium mb-2 flex items-center gap-2">
                <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>After</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(37,99,235,0.1)', color: 'rgb(var(--eleva-primary))' }}>
                  AI-suggested
                </span>
              </div>
              <div
                className="rounded-lg p-4 text-[14px] leading-relaxed"
                style={{
                  background: 'rgba(37,99,235,0.04)',
                  border: '1px solid rgba(37,99,235,0.15)',
                  color: 'rgb(var(--eleva-fg))',
                }}
              >
                Built and maintained backend APIs supporting internal application workflows and external integrations.
              </div>
            </div>
            <div
              className="rounded-lg p-4 text-[12px] leading-relaxed flex items-start gap-2"
              style={{
                background: 'rgba(34,197,94,0.07)',
                border: '1px solid rgba(34,197,94,0.18)',
                color: 'rgb(var(--eleva-muted-fg))',
              }}
            >
              <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'rgb(var(--eleva-success))' }} />
              <span>
                <strong style={{ color: 'rgb(var(--eleva-fg))' }}>Why:</strong> Adds context and clarity without changing the factual scope of the candidate&apos;s experience.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

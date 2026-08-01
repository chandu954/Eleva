import { Check } from 'lucide-react';

const withoutEleva = ['Resume builder', 'General-purpose AI chat', 'Spreadsheet', 'ATS checker', 'Cover letter tool', 'Application tracker'];

const withEleva = [
  'Resume creation',
  'Job matching',
  'ATS analysis',
  'Resume tailoring',
  'Cover letters',
  'Application tracking',
  'Analytics',
];

export function ProductCredibility() {
  return (
    <section className="eleva-section relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display font-semibold leading-[1.04] text-center" style={{ fontSize: 'clamp(2.5rem, 4.2vw, 4rem)', letterSpacing: '-0.035em', color: 'rgb(var(--eleva-fg))' }}>
          What Eleva replaces.
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-center max-w-lg mx-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          Six separate tools working against each other — or one system working for you.
        </p>
        <div
          className="mt-10 rounded-[18px] overflow-hidden border"
          style={{
            borderColor: 'rgba(37,99,235,0.12)',
            background: 'rgb(var(--eleva-card))',
            boxShadow: '0 20px 60px rgba(15,23,42,0.08)',
          }}
        >
          <div className="grid sm:grid-cols-2">
            <div className="p-6 md:p-8 border-b sm:border-b-0 sm:border-r" style={{ background: '#FFFFFF', borderColor: 'rgba(37,99,235,0.12)' }}>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: '#64748B' }}>
                Without Eleva
              </div>
              <div className="space-y-2.5">
                {withoutEleva.map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-[14px]" style={{ color: '#64748B' }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#94A3B8' }} />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t text-[12px] font-medium" style={{ borderColor: 'rgba(37,99,235,0.12)', color: '#64748B' }}>
                6 disconnected tools
              </div>
            </div>
            <div className="p-6 md:p-8" style={{ background: 'linear-gradient(180deg, rgba(239,246,255,0.75), rgba(248,250,252,0.8))' }}>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: '#2563EB' }}>
                With Eleva
              </div>
              <div className="space-y-2.5">
                {withEleva.map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-[14px] font-medium" style={{ color: '#0F172A' }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#2563EB' }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div
            className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
            style={{
              background: 'linear-gradient(90deg, rgba(37,99,235,0.07), rgba(37,99,235,0.03))',
              borderTop: '1px solid rgba(37,99,235,0.15)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 shrink-0" style={{ color: '#2563EB' }} strokeWidth={2.5} />
              <span className="text-[13px] font-bold tracking-tight" style={{ color: '#0F172A' }}>
                ONE WORKSPACE
              </span>
            </div>
            <span className="text-[12.5px]" style={{ color: '#64748B' }}>
              All connected to the same job-search context.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

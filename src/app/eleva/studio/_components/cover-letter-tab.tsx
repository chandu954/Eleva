'use client';

import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsContent } from '@/components/ui/tabs';
import { Copy, RefreshCw, Download, Clock, Mail } from 'lucide-react';
import type { StudioPipelineSummary } from '../_lib/use-studio-pipeline';

interface CoverLetterTabProps {
  letter: string;
  summary: StudioPipelineSummary | null;
  elapsed: string | null;
  run: () => void;
  downloadExport: (format: 'pdf' | 'docx') => void;
}

export function CoverLetterTab({ letter, summary, elapsed, run, downloadExport }: CoverLetterTabProps) {
  return (
    <>
      {/* Tab: Cover Letter */}
                <TabsContent value="letter" className="mt-0 px-5 py-4">
                  {letter ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>
                          {summary?.company || 'Company'} · {summary?.role || 'Role'}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { navigator.clipboard.writeText(letter); toast.success('Copied'); }} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"><Copy className="w-3 h-3" /> Copy</button>
                          <button onClick={run} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"><RefreshCw className="w-3 h-3" /> Regenerate</button>
                          <button onClick={() => downloadExport('pdf')} className="eleva-btn-primary text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"><Download className="w-3 h-3" /> PDF</button>
                          <button onClick={() => downloadExport('docx')} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"><Download className="w-3 h-3" /> DOCX</button>
                        </div>
                      </div>
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="max-w-[650px] mx-auto rounded-xl p-8" style={{ background: '#fff', color: '#1a1a2e', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                          <div className="text-[14px] leading-[1.8] whitespace-pre-wrap font-serif">{letter}</div>
                        </div>
                      </ScrollArea>
                      {elapsed && (
                        <div className="p-3 rounded-lg flex items-center gap-3 text-[12px]" style={{ background: 'rgba(var(--eleva-success-rgb), 0.06)', border: '1px solid rgba(var(--eleva-success-rgb), 0.15)' }}>
                          <Clock className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--eleva-success))' }} />
                          <span style={{ color: 'rgb(var(--eleva-fg))' }}>Completed in <strong>{elapsed}s</strong> — saved <strong style={{ color: 'rgb(var(--eleva-success))' }}>~{Math.round(25 * 60 - parseFloat(elapsed) > 0 ? Math.round(25 * 60 - parseFloat(elapsed)) : 0)}s</strong></span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <Mail className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-[13px]">No cover letter generated yet.</p>
                      <p className="text-[11px] mt-1">Run the pipeline to generate one.</p>
                    </div>
                  )}
                </TabsContent>
    </>
  );
}

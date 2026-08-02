import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import dynamic from 'next/dynamic';
import { Navbar } from './_components/landing/navbar';
import { Hero } from './_components/landing/hero';
import { HonestAI } from './_components/landing/honest-ai';
import { ProductCredibility } from './_components/landing/product-credibility';
import { FinalCTA } from './_components/landing/final-cta';
import { Footer } from './_components/landing/footer';

const ProductDemo = dynamic(() => import('./_components/landing/product-demo').then((m) => m.ProductDemo), {
  loading: () => <div className="min-h-[420px]" aria-hidden />,
});
const CareerOS = dynamic(() => import('./_components/landing/career-os').then((m) => m.CareerOS), {
  loading: () => <div className="min-h-[480px]" aria-hidden />,
});
const Workflow = dynamic(() => import('./_components/landing/workflow').then((m) => m.Workflow), {
  loading: () => <div className="min-h-[480px]" aria-hidden />,
});
const ATSAnalysis = dynamic(() => import('./_components/landing/ats-analysis').then((m) => m.ATSAnalysis), {
  loading: () => <div className="min-h-[520px]" aria-hidden />,
});
const CommandShowcase = dynamic(() => import('./_components/landing/command-showcase').then((m) => m.CommandShowcase), {
  loading: () => <div className="min-h-[460px]" aria-hidden />,
});

export default async function ElevaLanding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/eleva/dashboard');

  return (
    <div className="eleva-ambient relative overflow-x-clip" id="main-content">
      <div className="relative">
        <div className="eleva-grid absolute inset-0" aria-hidden />
        <Navbar />
        <Hero />
        <ProductDemo />
      </div>
      <CareerOS />
      <div className="eleva-ambient-tint">
        <Workflow />
      </div>
      <div className="eleva-ambient-hero">
        <ATSAnalysis />
      </div>
      <div className="eleva-ambient-indigo">
        <HonestAI />
      </div>
      <CommandShowcase />
      <div className="eleva-ambient-tint">
        <ProductCredibility />
      </div>
      <div className="eleva-ambient-cta">
        <FinalCTA />
      </div>
      <Footer />
    </div>
  );
}

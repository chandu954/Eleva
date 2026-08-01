import { Navbar } from './_components/landing/navbar';
import { Hero } from './_components/landing/hero';
import { ProductDemo } from './_components/landing/product-demo';
import { CareerOS } from './_components/landing/career-os';
import { Workflow } from './_components/landing/workflow';
import { ATSAnalysis } from './_components/landing/ats-analysis';
import { HonestAI } from './_components/landing/honest-ai';
import { CommandShowcase } from './_components/landing/command-showcase';
import { ProductCredibility } from './_components/landing/product-credibility';
import { FinalCTA } from './_components/landing/final-cta';
import { Footer } from './_components/landing/footer';

export default function ElevaLanding() {
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

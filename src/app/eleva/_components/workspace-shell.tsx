'use client';

import { ElevaSidebar } from './sidebar';
import { ElevaHeader } from './header';
import { ElevaCopilot } from './copilot';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen">
      <ElevaSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ElevaHeader />
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="flex-1"
        >
          {children}
        </motion.main>
      </div>
      <ElevaCopilot />
    </div>
  );
}

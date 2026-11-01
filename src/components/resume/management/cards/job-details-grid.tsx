'use client';

import { MapPin, Clock, DollarSign, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";

interface JobDetailsGridProps {
  job: Job;
}

const formatWorkLocation = (workLocation: Job['work_location']) => {
  if (!workLocation) return 'Not specified';
  return workLocation.replace('_', ' ');
};

export function JobDetailsGrid({ job }: JobDetailsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-3">
      {[
        { icon: MapPin, text: job.location || 'Location not specified', color: 'pink' },
        { icon: Briefcase, text: formatWorkLocation(job.work_location), color: 'rose' },
        { icon: DollarSign, text: job.salary_range || 'Salary not specified', color: 'pink' },
        { icon: Clock, text: job.employment_type?.replace('_', ' ') || 'Employment type not specified', color: 'rose' }
      ].map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.1 }}
          className={cn(
            "flex items-center gap-2",
            "text-sm text-gray-600",
            `group-hover:text-${item.color}-600`,
            "transition-colors duration-300"
          )}
        >
          <item.icon className="w-4 h-4" />
          <span className="capitalize truncate">{item.text}</span>
        </motion.div>
      ))}
    </div>
  );
}

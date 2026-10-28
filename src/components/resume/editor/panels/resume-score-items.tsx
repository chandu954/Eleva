import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { camelCaseToReadable } from './resume-score-utils';

export function ScoreItem({ label, score, reason }: { label: string; score: number; reason: string }) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{camelCaseToReadable(label)}</span>
        <span className={cn(
          "text-xs px-2 py-1 rounded-full font-medium",
          score >= 70 ? "bg-green-100 text-green-700" :
          score >= 50 ? "bg-yellow-100 text-yellow-700" :
          "bg-red-100 text-red-700"
        )}>
          {score}/100
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", getScoreColor(score))}
        />
      </div>
      <p className="text-xs text-muted-foreground">{reason}</p>
    </motion.div>
  );
}

export function JobAlignmentItem({
  label,
  data
}: {
  label: string;
  data: {
    score: number;
    reason: string;
    matchedKeywords?: string[];
    missingKeywords?: string[];
    matchedRequirements?: string[];
    gapAnalysis?: string[];
    suggestions?: string[];
  };
}) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-blue-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-blue-700">{camelCaseToReadable(label)}</span>
        <span className={cn(
          "text-xs px-2 py-1 rounded-full font-medium",
          data.score >= 70 ? "bg-blue-100 text-blue-700" :
          data.score >= 50 ? "bg-yellow-100 text-yellow-700" :
          "bg-red-100 text-red-700"
        )}>
          {data.score}/100
        </span>
      </div>
      <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${data.score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", getScoreColor(data.score))}
        />
      </div>
      <p className="text-xs text-blue-600">{data.reason}</p>

      {/* Show matched keywords */}
      {data.matchedKeywords && data.matchedKeywords.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-green-600">Matched Keywords:</p>
          <div className="flex flex-wrap gap-1">
            {data.matchedKeywords.slice(0, 5).map((keyword, index) => (
              <span key={index} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Show missing keywords */}
      {data.missingKeywords && data.missingKeywords.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-600">Missing Keywords:</p>
          <div className="flex flex-wrap gap-1">
            {data.missingKeywords.slice(0, 5).map((keyword, index) => (
              <span key={index} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Show gap analysis */}
      {data.gapAnalysis && data.gapAnalysis.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-orange-600">Areas to Address:</p>
          <div className="space-y-1">
            {data.gapAnalysis.slice(0, 3).map((gap, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <div className="mt-1.5 h-1 w-1 rounded-full bg-orange-500 flex-shrink-0" />
                <p className="text-orange-600">{gap}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

import { Hume } from "hume";
import { expressionColors, isExpressionColor, expressionLabels } from "@/types/expressions.ts";
import { motion } from "framer-motion";
import * as R from "remeda";

export default function Expressions({
  values,
}: {
  values: Hume.empathicVoice.EmotionScores | undefined;
}) {
  if (!values) return null;

  const top3 = R.pipe(
    values,
    R.entries(),
    R.sortBy(R.pathOr([1], 0)),
    R.reverse(),
    R.take(3),
  );

  return (
    // Main container for emotion display
    <div className="text-xs p-3 w-full border-t border-border">
      {/* Top 3 emotions with progress bars */}
      <div className="flex flex-col md:flex-row gap-3">
        {top3.map(([key, value]) => (
          <div key={key} className="w-full overflow-hidden">
            {/* Emotion label and percentage */}
            <div className="flex items-center justify-between gap-1 pb-1">
              <div className="font-medium truncate flex items-center">
                {/* Colored dot indicator */}
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: isExpressionColor(key) ? expressionColors[key] : "#879aa1" }}></span>
                {/* Emotion name */}
                {expressionLabels[key]}
              </div>
              {/* Percentage display */}
              <div className="tabular-nums font-mono opacity-70">{Math.round(value * 100)}%</div>
            </div>
            {/* Progress bar container */}
            <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.05)" }}>
              {/* Animated progress bar */}
              <motion.div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  backgroundColor: isExpressionColor(key) ? expressionColors[key] : "#879aa1",
                  boxShadow: `0 0 8px ${isExpressionColor(key) ? expressionColors[key] : "#879aa1"}40`
                }}
                initial={{ width: 0 }}
                animate={{
                  width: `${R.pipe(value, R.clamp({ min: 0, max: 1 }), (v) => v * 100)}%`
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div >
  );
}
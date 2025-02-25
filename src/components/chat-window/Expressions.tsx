import { Hume } from "hume";
import { expressionColors, isExpressionColor } from "./expressions-utils/expressionColors";
import { expressionLabels } from "./expressions-utils/expressionLabels";
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

      {/* Emotion chart - small visualization of all emotions */}
      {/* <div className="mt-3 pt-2 border-t border-border/30">
        <div className="flex gap-1 flex-wrap justify-center">
          {R.pipe(
            values,
            R.entries(),
            R.sortBy(R.pathOr([1], 0)),
            R.reverse(),
            R.take(10),
            R.map(([key, value]) => (
              <div
                key={key}
                className="tooltip-wrapper relative group"
                style={{ width: "14px" }}
              >
                <motion.div
                  className="w-3 rounded-sm"
                  style={{
                    backgroundColor: isExpressionColor(key) ? expressionColors[key] : "#879aa1",
                    height: `${Math.max(4, value * 24)}px`,
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, value * 24)}px` }}
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {expressionLabels[key]}: {(value * 100).toFixed(1)}%
                </div>
              </div>
            ))
          )}
        </div>
      </div> */}
    </div >
  );
}
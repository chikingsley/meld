// src/components/chat-input/MicFFT.tsx
import { cn } from "@/utils";
import React, { useEffect, useRef } from "react";
import { AutoSizer } from "react-virtualized";

const renderFFT = (ctx: CanvasRenderingContext2D, fft: number[], width: number, height: number) => {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "currentColor";

  const barCount = 24;
  const barWidth = 2;
  const spacing = (width - barCount * barWidth) / (barCount + 1);

  for (let i = 0; i < barCount; i++) {
    const value = (fft[i] ?? 0) / 4;
    const h = Math.min(Math.max(height * value, 2), height);
    const yOffset = height * 0.5 - h * 0.5;

    ctx.beginPath();
    ctx.roundRect(spacing + i * (barWidth + spacing), yOffset, barWidth, h, 2);
    ctx.fill();
  }
};

const MicFFT = React.memo(({ fft, className }: { fft: number[]; className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Effect to handle FFT updates and resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match display size
    canvas.width = sizeRef.current.width;
    canvas.height = sizeRef.current.height;

    renderFFT(ctx, fft, sizeRef.current.width, sizeRef.current.height);
  }, [fft, sizeRef.current.width, sizeRef.current.height]);

  return (
    <div className={"relative size-full"}>
      {/* @ts-ignore AutoSizer uses direct DOM manipulation with javascript-detect-element-resize */}
      <AutoSizer>
        {({ width, height }) => {
          // Update size ref when dimensions change
          if (width !== sizeRef.current.width || height !== sizeRef.current.height) {
            sizeRef.current = { width, height };
          }

          return (
            <canvas
              ref={canvasRef}
              className={cn("absolute !inset-0 !size-full", className)}
            />
          );
        }}
      </AutoSizer>
    </div>
  );
});

MicFFT.displayName = "MicFFT";

export default MicFFT;


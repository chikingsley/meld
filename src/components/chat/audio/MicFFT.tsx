// src/components/chat-input/MicFFT.tsx
import { cn } from "@/utils/classNames";
import React, { useEffect, useRef, useState } from "react";

const renderFFT = (ctx: CanvasRenderingContext2D, fft: number[], width: number, height: number) => {
  ctx.clearRect(0, 0, width, height);
  const isDark = document.documentElement.classList.contains("dark");
  ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)";

  const barCount = 24;
  const barWidth = 2;
  const spacing = (width - barCount * barWidth) / (barCount + 1);

  for (let i = 0; i < barCount; i++) {
    const value = (fft[i] ?? 0) / 1.5;
    const h = Math.min(Math.max(height * value, 2), height);
    const yOffset = height * 0.5 - h * 0.5;

    ctx.beginPath();
    ctx.roundRect(spacing + i * (barWidth + spacing), yOffset, barWidth, h, 2);
    ctx.fill();
  }
};

const MicFFT = React.memo(({ fft, className }: { fft: number[]; className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Effect to handle container resizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create a resize observer to update dimensions when container resizes
    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    // Start observing the container
    resizeObserver.observe(container);

    // Initial measurement
    setDimensions({
      width: container.clientWidth,
      height: container.clientHeight
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Effect to handle FFT updates and resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match display size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    renderFFT(ctx, fft, dimensions.width, dimensions.height);
  }, [fft, dimensions.width, dimensions.height]);

  // Re-render when theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      renderFFT(ctx, fft, dimensions.width, dimensions.height);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, [fft, dimensions.width, dimensions.height]);

  return (
    <div ref={containerRef} className={"relative size-full"}>
      <canvas
        ref={canvasRef}
        className={cn("absolute !inset-0 !size-full", className)}
      />
    </div>
  );
});

MicFFT.displayName = "MicFFT";

export default MicFFT;


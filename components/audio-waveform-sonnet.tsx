"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  audioElement?: HTMLAudioElement | null;
  className?: string;
  barCount?: number;
  barWidth?: number;
  barGap?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  animate?: boolean;
}

export function AudioWaveform({
  audioElement,
  className,
  barCount = 64,
  barWidth = 3,
  barGap = 1,
  height = 80,
  color = "#f97316", // orange-500
  backgroundColor = "#1e293b", // slate-800
  animate = true,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio context and analyser
  useEffect(() => {
    if (!audioElement || isInitialized) return;

    const initializeAudio = async () => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Create analyser node
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64; // barCount * 2;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        // Create source from audio element
        const source = audioElement;
        // const source = audioContext.createMediaElementSource(audioElement);
        sourceRef.current = source;

        // Connect nodes
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize audio context:", error);
      }
    };

    initializeAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
      setIsInitialized(false);
    };
  }, [audioElement, barCount, isInitialized]);

  // Draw waveform
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;

    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get frequency data
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate bar dimensions
    const totalBarWidth = barWidth + barGap;
    const startX = (canvas.width - (barCount * totalBarWidth - barGap)) / 2;

    // Draw bars
    ctx.fillStyle = color;

    for (let i = 0; i < barCount; i++) {
      // Get frequency data for this bar (map to available data)
      const dataIndex = Math.floor((i / barCount) * dataArray.length);
      const barHeight = (dataArray[dataIndex] / 255) * canvas.height;

      // Calculate position
      const x = startX + i * totalBarWidth;
      const y = canvas.height - barHeight;

      // Draw bar with rounded top
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [
        barWidth / 2,
        barWidth / 2,
        0,
        0,
      ]);
      ctx.fill();
    }

    // Continue animation if audio is playing
    if (animate && audioElement && !audioElement.paused) {
      animationRef.current = requestAnimationFrame(drawWaveform);
    }
  };

  // Start/stop animation based on audio state
  useEffect(() => {
    if (!isInitialized || !audioElement) return;

    const handlePlay = () => {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
      if (animate) {
        drawWaveform();
      }
    };

    const handlePause = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    const handleEnded = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Draw empty waveform
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    };

    audioElement.addEventListener("play", handlePlay);
    audioElement.addEventListener("pause", handlePause);
    audioElement.addEventListener("ended", handleEnded);

    // Initial draw
    if (!audioElement.paused && animate) {
      drawWaveform();
    }

    return () => {
      audioElement.removeEventListener("play", handlePlay);
      audioElement.removeEventListener("pause", handlePause);
      audioElement.removeEventListener("ended", handleEnded);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    isInitialized,
    audioElement,
    animate,
    backgroundColor,
    color,
    barCount,
    barWidth,
    barGap,
  ]);

  // Calculate canvas width based on bar configuration
  const canvasWidth = barCount * (barWidth + barGap) - barGap;

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={height}
        className="rounded-md"
        style={{
          background: backgroundColor,
          maxWidth: "100%",
          height: "auto",
        }}
      />
      {!isInitialized && (
        <div
          className="flex items-center justify-center rounded-md"
          style={{
            width: canvasWidth,
            height: height,
            background: backgroundColor,
          }}
        >
          <div className="text-slate-400 text-xs">Loading waveform...</div>
        </div>
      )}
    </div>
  );
}

// Static waveform component for non-playing tracks
export function StaticWaveform({
  className,
  barCount = 32,
  barWidth = 3,
  barGap = 1,
  height = 40,
  color = "#64748b", // slate-500
  backgroundColor = "#1e293b", // slate-800
}: Omit<AudioWaveformProps, "audioElement" | "animate">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate random static waveform
    const totalBarWidth = barWidth + barGap;
    const startX = (canvas.width - (barCount * totalBarWidth - barGap)) / 2;

    ctx.fillStyle = color;

    for (let i = 0; i < barCount; i++) {
      // Generate random height with some pattern
      const randomHeight = Math.random() * 0.7 + 0.1; // 10% to 80% height
      const barHeight = randomHeight * canvas.height;

      const x = startX + i * totalBarWidth;
      const y = canvas.height - barHeight;

      // Draw bar with rounded top
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [
        barWidth / 2,
        barWidth / 2,
        0,
        0,
      ]);
      ctx.fill();
    }
  }, [barCount, barWidth, barGap, height, color, backgroundColor]);

  const canvasWidth = barCount * (barWidth + barGap) - barGap;

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={height}
        className="rounded-md"
        style={{
          background: backgroundColor,
          maxWidth: "100%",
          height: "auto",
        }}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  audioUrl?: string;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  className?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
  color?: string;
  progressColor?: string;
  onSeek?: (time: number) => void;
}

export function AudioWaveform({
  audioUrl,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  className,
  height = 60,
  barWidth = 2,
  barGap = 1,
  color = "#64748b", // slate-500
  progressColor = "#f97316", // orange-500
  onSeek,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const animationFrameRef = useRef<number>(0);

  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(0);

  // Initialize canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      setCanvasWidth(rect.width);
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [height]);

  // Load and analyze audio file
  const loadAudioData = useCallback(
    async (url: string) => {
      if (!url) return;

      setIsLoading(true);

      try {
        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;

        // Fetch and decode audio data
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        audioBufferRef.current = audioBuffer;

        // Extract waveform data
        const channelData = audioBuffer.getChannelData(0); // Use first channel
        const samples = Math.floor(canvasWidth / (barWidth + barGap));
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j] || 0);
          }
          waveform.push(sum / blockSize);
        }

        // Normalize waveform data
        const maxAmplitude = Math.max(...waveform);
        const normalizedWaveform = waveform.map((amplitude) =>
          maxAmplitude > 0 ? amplitude / maxAmplitude : 0
        );

        setWaveformData(normalizedWaveform);
      } catch (error) {
        console.error("Error loading audio data:", error);
        // Generate fallback waveform
        const samples = Math.floor(canvasWidth / (barWidth + barGap));
        const fallbackWaveform = Array.from(
          { length: samples },
          () => Math.random() * 0.5 + 0.1
        );
        setWaveformData(fallbackWaveform);
      } finally {
        setIsLoading(false);
      }
    },
    [canvasWidth, barWidth, barGap]
  );

  // Load audio data when URL changes
  useEffect(() => {
    if (audioUrl && canvasWidth > 0) {
      loadAudioData(audioUrl);
    }
  }, [audioUrl, canvasWidth, loadAudioData]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const progressRatio = duration > 0 ? currentTime / duration : 0;
    const progressX = width * progressRatio;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform bars
    waveformData.forEach((amplitude, index) => {
      const x = index * (barWidth + barGap);
      const barHeight = Math.max(2, amplitude * height * 0.8);
      const y = (height - barHeight) / 2;

      // Determine bar color based on progress
      const isPlayed = x < progressX;
      ctx.fillStyle = isPlayed ? progressColor : color;

      // Draw bar with rounded corners
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      ctx.fill();
    });

    // Draw progress line
    if (duration > 0 && progressX > 0) {
      ctx.strokeStyle = progressColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    waveformData,
    currentTime,
    duration,
    height,
    barWidth,
    barGap,
    color,
    progressColor,
  ]);

  // Animation loop for real-time updates
  useEffect(() => {
    const animate = () => {
      drawWaveform();
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      animate();
    } else {
      drawWaveform();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, drawWaveform]);

  // Handle canvas click for seeking
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSeek || duration <= 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const clickRatio = x / rect.width;
      const seekTime = clickRatio * duration;

      onSeek(Math.max(0, Math.min(seekTime, duration)));
    },
    [duration, onSeek]
  );

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className={cn(
          "w-full rounded-sm",
          onSeek && "cursor-pointer hover:opacity-80 transition-opacity"
        )}
        onClick={handleCanvasClick}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-sm">
          <div className="flex space-x-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-1 h-4 bg-orange-400 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {!audioUrl && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
          No audio loaded
        </div>
      )}
    </div>
  );
}

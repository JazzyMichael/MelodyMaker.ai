// components/audio-waveform.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AudioWaveformProps {
  audioUrl?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  className?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
  color?: string;
  progressColor?: string;
}

export function AudioWaveform({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onSeek,
  className = "",
  height = 40,
  barWidth = 2,
  barGap = 1,
  color = "#64748b", // slate-500
  progressColor = "#f97316", // orange-500
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate waveform data from audio
  const generateWaveform = useCallback(async (url: string) => {
    if (!url) return;

    setIsLoading(true);
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0);
      const samples = 100; // Number of bars in waveform
      const blockSize = Math.floor(channelData.length / samples);
      const waveform: number[] = [];

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveform.push(sum / blockSize);
      }

      // Normalize the waveform data
      const max = Math.max(...waveform);
      const normalizedWaveform = waveform.map(
        (value) => (value / max) * 0.8 + 0.1
      );

      setWaveformData(normalizedWaveform);
    } catch (error) {
      console.error("Error generating waveform:", error);
      // Generate a simple placeholder waveform
      const placeholderWaveform = Array.from(
        { length: 100 },
        () => Math.random() * 0.6 + 0.2
      );
      setWaveformData(placeholderWaveform);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate waveform when audio URL changes
  useEffect(() => {
    if (audioUrl) {
      generateWaveform(audioUrl);
    }
  }, [audioUrl, generateWaveform]);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height: canvasHeight } = canvas;
    ctx.clearRect(0, 0, width, canvasHeight);

    const barCount = waveformData.length;
    const totalBarWidth = barWidth + barGap;
    const availableWidth = width - barGap;
    const actualBarWidth = Math.max(
      1,
      Math.min(barWidth, availableWidth / barCount - barGap)
    );
    const actualBarGap = Math.max(
      0,
      (availableWidth - actualBarWidth * barCount) / (barCount - 1)
    );

    const progress = duration > 0 ? currentTime / duration : 0;

    waveformData.forEach((amplitude, index) => {
      const x = index * (actualBarWidth + actualBarGap);
      const barHeight = amplitude * canvasHeight;
      const y = (canvasHeight - barHeight) / 2;

      // Use progress color for played portion, regular color for unplayed
      const isPlayed = index / barCount <= progress;
      ctx.fillStyle = isPlayed ? progressColor : color;

      ctx.fillRect(x, y, actualBarWidth, barHeight);
    });
  }, [
    waveformData,
    currentTime,
    duration,
    color,
    progressColor,
    barWidth,
    barGap,
  ]);

  // Handle click to seek
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSeek || duration === 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const progress = x / rect.width;
      const seekTime = progress * duration;

      onSeek(Math.max(0, Math.min(seekTime, duration)));
    },
    [onSeek, duration]
  );

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="flex space-x-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-slate-400 rounded-full animate-pulse"
              style={{
                height: Math.random() * height * 0.6 + height * 0.2,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={height}
      className={`w-full cursor-pointer ${className}`}
      onClick={handleClick}
      style={{ height }}
    />
  );
}

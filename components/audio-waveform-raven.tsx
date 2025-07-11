import React, { useRef, useEffect } from "react";

interface AudioWaveformProps {
  audioUrl: string | null;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ audioUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    let audioContext: AudioContext | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;

    const drawWaveform = () => {
      if (!analyser) return;

      console.log("drawWaveform");
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create gradient
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
      );
      gradient.addColorStop(0, "#4CAF50");
      gradient.addColorStop(1, "#45a049");
      ctx.fillStyle = gradient;

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Draw waveform
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 2) * (canvas.height / 255);
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    const renderFrame = () => {
      drawWaveform();
      requestAnimationFrame(renderFrame);
    };

    const setupAudio = async () => {
      console.log("setupAudio");
      try {
        audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        source = audioContext.createMediaElementSource(audio);
        analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 256;
        renderFrame();
      } catch (error) {
        console.error("Audio setup failed:", error);
      }
    };

    audio.addEventListener("canplay", setupAudio);

    return () => {
      if (source) source.disconnect();
      if (analyser) analyser.disconnect();
      if (audioContext) audioContext.close();
      if (audioRef.current) {
        audioRef.current.removeEventListener("canplay", setupAudio);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  return (
    <div
      style={{
        width: "100%",
        height: "80px",
        margin: "10px 0",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default AudioWaveform;

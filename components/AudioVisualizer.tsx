import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isConnected: boolean;
  isSpeaking: boolean; // True if user or model is speaking (adds activity)
  analyser?: AnalyserNode; // Optional real analyser from audio context
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isConnected, isSpeaking, analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let offset = 0;

    const render = () => {
      if (!canvas) return;
      
      // Resize handling
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      if (!isConnected) {
        // Idle state - flat line or gentle pulse
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = '#e2e8f0'; // slate-200
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      // Active Waveform Simulation
      // Light theme colors: Purple, Violet, Fuchsia
      const colors = ['#9333ea', '#7c3aed', '#c026d3']; // purple-600, violet-600, fuchsia-600
      const baseAmplitude = isSpeaking ? height * 0.3 : height * 0.05;
      
      colors.forEach((color, i) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        for (let x = 0; x < width; x++) {
          // Combine sine waves
          const freq = 0.01 + (i * 0.005);
          const speed = offset * (0.05 + (i * 0.02));
          // If not speaking, reduce amplitude significantly
          const currentAmp = isSpeaking ? baseAmplitude : baseAmplitude * 0.2;
          
          const y = height / 2 + 
            Math.sin(x * freq + speed) * currentAmp * Math.sin(x / width * Math.PI); // Envelope
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      offset += 1;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isConnected, isSpeaking]);

  return (
    <div className="w-full h-32 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 relative">
        <canvas 
            ref={canvasRef} 
            width={600} 
            height={128} 
            className="w-full h-full block"
        />
        {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm font-medium uppercase tracking-widest">
                Ready to Connect
            </div>
        )}
    </div>
  );
};

export default AudioVisualizer;
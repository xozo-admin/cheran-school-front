// components/dashboard/student/charts/WaveChart.tsx
'use client';

import { useEffect, useRef } from 'react';

interface WaveChartData {
  term: string;
  value: number;
}

interface WaveChartProps {
  data: WaveChartData[];
}

export default function WaveChart({ data }: WaveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxValue = 5;

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight * (1 - i / 5));
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      // Y-axis labels
      ctx.font = '12px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'right';
      ctx.fillText(i.toFixed(1), padding - 10, y + 4);
    }

    // Draw wave
    if (data.length > 1) {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#10b981';
      
      data.forEach((point, index) => {
        const x = padding + (chartWidth * index) / (data.length - 1);
        const y = padding + chartHeight * (1 - point.value / maxValue);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          // Create smooth curve
          const prevX = padding + (chartWidth * (index - 1)) / (data.length - 1);
          const prevY = padding + chartHeight * (1 - data[index - 1].value / maxValue);
          const cp1x = prevX + (x - prevX) / 2;
          const cp2x = cp1x;
          ctx.bezierCurveTo(cp1x, prevY, cp2x, y, x, y);
        }
      });
      ctx.stroke();

      // Fill under wave
      ctx.lineTo(canvas.width - padding, canvas.height - padding);
      ctx.lineTo(padding, canvas.height - padding);
      ctx.closePath();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.fill();

      // Draw data points and labels
      data.forEach((point, index) => {
        const x = padding + (chartWidth * index) / (data.length - 1);
        const y = padding + chartHeight * (1 - point.value / maxValue);
        
        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw value
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#059669';
        ctx.textAlign = 'center';
        ctx.fillText(point.value.toFixed(1), x, y - 15);

        // Draw term label
        ctx.font = '12px Arial';
        ctx.fillStyle = '#4b5563';
        ctx.fillText(point.term, x, canvas.height - padding + 20);
      });
    }

  }, [data]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={500}
        height={300}
        className="w-full h-64"
      />
    </div>
  );
}
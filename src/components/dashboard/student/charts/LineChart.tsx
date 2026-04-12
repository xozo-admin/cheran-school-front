// components/dashboard/student/charts/LineChart.tsx
'use client';

import { useEffect, useRef } from 'react';

interface LineChartData {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartData[];
  color?: string;
}

export default function LineChart({ data, color = '#3b82f6' }: LineChartProps) {
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
    const maxValue = Math.max(...data.map(d => d.value), 5);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Draw line
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    
    data.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (data.length - 1);
      const y = padding + chartHeight * (1 - point.value / maxValue);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw data points
    data.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (data.length - 1);
      const y = padding + chartHeight * (1 - point.value / maxValue);
      
      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw value
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(point.value.toFixed(1), x, y - 15);

      // Draw label
      ctx.font = '12px Arial';
      ctx.fillStyle = '#4b5563';
      ctx.fillText(point.label, x, canvas.height - padding + 20);
    });

  }, [data, color]);

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
// components/dashboard/student/charts/RadarChart.tsx
'use client';

import { useEffect, useRef } from 'react';

interface RadarChartData {
  subject: string;
  score: number;
  fullMark: number;
}

interface RadarChartProps {
  data: RadarChartData[];
}

export default function RadarChart({ data }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.7;
    const angleStep = (2 * Math.PI) / data.length;

    // Draw grid circles
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const gridRadius = (radius * i) / 5;
      ctx.beginPath();
      for (let j = 0; j <= data.length; j++) {
        const angle = j * angleStep;
        const x = centerX + gridRadius * Math.cos(angle - Math.PI / 2);
        const y = centerY + gridRadius * Math.sin(angle - Math.PI / 2);
        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    for (let i = 0; i < data.length; i++) {
      const angle = i * angleStep;
      const x = centerX + radius * Math.cos(angle - Math.PI / 2);
      const y = centerY + radius * Math.sin(angle - Math.PI / 2);
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Draw labels
      const labelAngle = angle - Math.PI / 2;
      const labelRadius = radius + 20;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);
      
      ctx.font = '12px Arial';
      ctx.fillStyle = '#4b5563';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data[i].subject, labelX, labelY);
    }

    // Draw data polygon
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const angle = i * angleStep;
      const scoreRadius = (data[i].score / data[i].fullMark) * radius;
      const x = centerX + scoreRadius * Math.cos(angle - Math.PI / 2);
      const y = centerY + scoreRadius * Math.sin(angle - Math.PI / 2);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < data.length; i++) {
      const angle = i * angleStep;
      const scoreRadius = (data[i].score / data[i].fullMark) * radius;
      const x = centerX + scoreRadius * Math.cos(angle - Math.PI / 2);
      const y = centerY + scoreRadius * Math.sin(angle - Math.PI / 2);
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
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
// components/dashboard/student/charts/AreaChart.tsx
'use client';

import { useEffect, useRef } from 'react';

interface AreaChartData {
  subject: string;
  score: number;
  maxScore: number;
}

interface AreaChartProps {
  data: AreaChartData[];
}

export default function AreaChart({ data }: AreaChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    const maxValue = Math.max(...data.map(d => d.maxScore), 5);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + chartHeight * (1 - i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(canvas.width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.font = '12px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'right';
      ctx.fillText(i.toFixed(1), padding.left - 10, y + 4);
    }

    // Draw area
    ctx.beginPath();
    const barWidth = chartWidth / data.length;
    
    // Create gradient for area fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

    // Draw area path
    ctx.moveTo(padding.left, padding.top + chartHeight);
    
    data.forEach((item, index) => {
      const x = padding.left + (barWidth * index) + (barWidth / 2);
      const y = padding.top + chartHeight * (1 - item.score / maxValue);
      
      if (index === 0) {
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Close the path to create area
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.closePath();
    
    // Fill area
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line on top of area
    ctx.beginPath();
    data.forEach((item, index) => {
      const x = padding.left + (barWidth * index) + (barWidth / 2);
      const y = padding.top + chartHeight * (1 - item.score / maxValue);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw data points
    data.forEach((item, index) => {
      const x = padding.left + (barWidth * index) + (barWidth / 2);
      const y = padding.top + chartHeight * (1 - item.score / maxValue);
      
      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw value above point
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#3b82f6';
      ctx.textAlign = 'center';
      ctx.fillText(item.score.toFixed(1), x, y - 15);

      // Draw subject label
      ctx.font = '12px Arial';
      ctx.fillStyle = '#4b5563';
      ctx.textAlign = 'center';
      
      // Rotate labels if too many or text is long
      ctx.save();
      ctx.translate(x, padding.top + chartHeight + 20);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(item.subject, 0, 0);
      ctx.restore();
    });

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
'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface TeacherStatsCardProps {
  label: string;
  value: string;
  change: string;
  icon: ReactNode;
  color: string;
  trend: 'up' | 'down' | 'stable' | 'warning';
}

export const TeacherStatsCard = ({ label, value, change, icon, color, trend }: TeacherStatsCardProps | any) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'warning': return '⚠';
      default: return '→';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'warning': return 'text-amber-600';
      default: return 'text-blue-600';
    }
  };

  const getTrendBgColor = () => {
    switch (trend) {
      case 'up': return 'bg-green-100';
      case 'down': return 'bg-red-100';
      case 'warning': return 'bg-amber-100';
      default: return 'bg-blue-100';
    }
  };

  return (
    <motion.div 
      className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between mb-3">
        <motion.div 
          className={`p-3 ${color} rounded-xl text-white shadow-lg group-hover:shadow-2xl transition-shadow`}
          whileHover={{ rotate: 5 }}
        >
          {icon}
        </motion.div>
        <span className={`text-lg font-bold ${getTrendColor()}`}>{getTrendIcon()}</span>
      </div>
      
      <div className="mb-1">
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        <p className="text-sm text-slate-600 mt-1">{label}</p>
      </div>
      
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-slate-500">{change}</span>
        <div className={`h-1.5 w-12 rounded-full ${getTrendBgColor()} overflow-hidden`}>
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              trend === 'up' ? 'bg-green-500' :
              trend === 'down' ? 'bg-red-500' :
              trend === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            }`} 
            style={{ 
              width: trend === 'up' ? '80%' : 
                     trend === 'down' ? '40%' : 
                     trend === 'warning' ? '60%' : '50%' 
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};
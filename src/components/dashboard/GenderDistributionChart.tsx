// src/components/dashboard/GenderDistribution.tsx
'use client';

import { FaMale, FaFemale, FaUsers } from 'react-icons/fa';

interface GenderDistributionProps {
  male: number;
  female: number;
  other?: number;
  total: number;
  malePercentage: number;
  femalePercentage: number;
  otherPercentage?: number;
  showLegend?: boolean;
  showStats?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export const GenderDistribution = ({
  male,
  female,
  other = 0,
  total,
  malePercentage,
  femalePercentage,
  otherPercentage = 0,
  showLegend = true,
  showStats = true,
  size = 'md',
  variant = 'default',
  className = '',
}: GenderDistributionProps) => {
  
  // Size mappings for the donut chart
  const sizeMap = {
    sm: { svg: 120, radius: 26, strokeWidth: 8 },
    md: { svg: 180, radius: 40, strokeWidth: 12 },
    lg: { svg: 240, radius: 55, strokeWidth: 16 },
  };

  const { svg: svgSize, radius, strokeWidth } = sizeMap[size];
  const circumference = 2 * Math.PI * radius;
  
  const maleStroke = (malePercentage / 100) * circumference;
  const femaleStroke = (femalePercentage / 100) * circumference;
  const otherStroke = (otherPercentage / 100) * circumference;

  // Calculate offsets for stacked donut
  const femaleOffset = 0;
  const maleOffset = -femaleStroke;
  const otherOffset = -(femaleStroke + maleStroke);

  // Colors for different segments
  const colors = {
    male: '#3b82f6', // blue-500
    female: '#ec4899', // pink-500
    other: '#8b5cf6', // purple-500
  };

  // Compact variant - just the donut with minimal info
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="relative flex-shrink-0">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="transform -rotate-90">
            {/* Female segment */}
            {femalePercentage > 0 && (
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                fill="none"
                stroke={colors.female}
                strokeWidth={strokeWidth}
                strokeDasharray={`${femaleStroke} ${circumference}`}
                strokeDashoffset={femaleOffset}
                strokeLinecap="round"
              />
            )}
            {/* Male segment */}
            {malePercentage > 0 && (
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                fill="none"
                stroke={colors.male}
                strokeWidth={strokeWidth}
                strokeDasharray={`${maleStroke} ${circumference}`}
                strokeDashoffset={maleOffset}
                strokeLinecap="round"
              />
            )}
            {/* Other segment */}
            {otherPercentage > 0 && (
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                fill="none"
                stroke={colors.other}
                strokeWidth={strokeWidth}
                strokeDasharray={`${otherStroke} ${circumference}`}
                strokeDashoffset={otherOffset}
                strokeLinecap="round"
              />
            )}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-bold text-gray-900 dark:text-white ${
              size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl'
            }`}>
              {total}
            </span>
            <span className={`text-gray-600 dark:text-gray-400 ${
              size === 'sm' ? 'text-xs' : 'text-sm'
            }`}>
              Total
            </span>
          </div>
        </div>
        
        {showLegend && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Male: {male} ({malePercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-pink-500 mr-2"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Female: {female} ({femalePercentage.toFixed(1)}%)
              </span>
            </div>
            {other > 0 && (
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Other: {other} ({otherPercentage.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Detailed variant with full statistics
  if (variant === 'detailed') {
    return (
      <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 ${className}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-gray-900/70 dark:via-gray-800/70 dark:to-indigo-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-50 to-pink-50 rounded-lg">
              <FaUsers className="text-blue-600 w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Gender Distribution</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Student population breakdown</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{total}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Total</span>
          </div>
        </div>

        <div className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Donut Chart */}
          <div className="relative flex-shrink-0">
            <svg width="200" height="200" viewBox="0 0 100 100" className="transform -rotate-90">
              {/* Female segment */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={colors.female}
                strokeWidth="12"
                strokeDasharray={`${femaleStroke} ${circumference}`}
                strokeDashoffset={femaleOffset}
                strokeLinecap="round"
              />
              {/* Male segment */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={colors.male}
                strokeWidth="12"
                strokeDasharray={`${maleStroke} ${circumference}`}
                strokeDashoffset={maleOffset}
                strokeLinecap="round"
              />
              {/* Other segment */}
              {otherPercentage > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={colors.other}
                  strokeWidth="12"
                  strokeDasharray={`${otherStroke} ${circumference}`}
                  strokeDashoffset={otherOffset}
                  strokeLinecap="round"
                />
              )}
            </svg>
            
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{total}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Students</span>
            </div>
          </div>

          {/* Statistics */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaMale className="text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Male</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {male}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {malePercentage.toFixed(1)}% of total
                </div>
              </div>

              <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaFemale className="text-pink-600 dark:text-pink-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Female</span>
                </div>
                <div className="text-2xl font-bold text-pink-600 dark:text-pink-400 mb-1">
                  {female}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {femalePercentage.toFixed(1)}% of total
                </div>
              </div>

              {other > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaUsers className="text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">Other</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    {other}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {otherPercentage.toFixed(1)}% of total
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Gender Ratio</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {male}:{female} {male > female ? '(More Male)' : female > male ? '(More Female)' : '(Equal)'}
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Default variant - original design with donut and legend
  return (
    <div className={`${className}`}>
     
      <div className="flex flex-col items-center mt-2">
        {/* Donut Chart */}
        <div className="relative">
          <svg width="180" height="180" viewBox="0 0 100 100" className="transform -rotate-90">
            {/* Female segment */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={colors.female}
              strokeWidth="12"
              strokeDasharray={`${femaleStroke} ${circumference}`}
              strokeDashoffset={femaleOffset}
              strokeLinecap="round"
            />
            {/* Male segment */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={colors.male}
              strokeWidth="12"
              strokeDasharray={`${maleStroke} ${circumference}`}
              strokeDashoffset={maleOffset}
              strokeLinecap="round"
            />
            {/* Other segment */}
            {otherPercentage > 0 && (
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={colors.other}
                strokeWidth="12"
                strokeDasharray={`${otherStroke} ${circumference}`}
                strokeDashoffset={otherOffset}
                strokeLinecap="round"
              />
            )}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{total}</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Students</span>
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <FaMale size={12} className="inline mr-1" />
                Male: {male} ({malePercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-pink-500 mr-2"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <FaFemale size={12} className="inline mr-1" />
                Female: {female} ({femalePercentage.toFixed(1)}%)
              </span>
            </div>
            {other > 0 && (
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <FaUsers size={12} className="inline mr-1" />
                  Other: {other} ({otherPercentage.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Additional Stats */}
        {showStats && (
          <div className="mt-6 w-full pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {malePercentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Male</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {femalePercentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Female</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

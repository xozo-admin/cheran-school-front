'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export const ActivityMonitoring = ({ teacherData, onRefresh }: any) => {
  const data = teacherData?.weekly_activity || [];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between mb-4">
        <h3 className="font-semibold text-lg">Weekly Activity</h3>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line dataKey="attendance" strokeWidth={2} />
            <Line dataKey="submissions" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

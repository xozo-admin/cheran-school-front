'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AttendanceChartProps {
  attendance: any[];
}

export const AttendanceChart = ({ attendance }: AttendanceChartProps) => {
  // Process data for charts
  const processDailyData = () => {
    const dailyMap = new Map();
    
    attendance.forEach(record => {
      const date = new Date(record.date).toLocaleDateString();
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { present: 0, absent: 0, late: 0 });
      }
      const data = dailyMap.get(date);
      data[record.status.toLowerCase()]++;
    });

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
      total: data.present + data.absent + data.late,
      rate: data.total > 0 ? (data.present / data.total) * 100 : 0
    }));
  };

  const processStatusData = () => {
    const statusCounts = {
      Present: 0,
      Absent: 0,
      Late: 0
    };

    attendance.forEach(record => {
      if (statusCounts.hasOwnProperty(record.status)) {
        statusCounts[record.status as keyof typeof statusCounts]++;
      }
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
  };

  const dailyData = processDailyData();
  const statusData = processStatusData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Attendance Trend */}
      <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Attendance Trend</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                tickFormatter={(value) => value.split('/')[0]}
              />
              <YAxis stroke="#666" />
              <Tooltip 
                formatter={(value: number) => [value, 'Students']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="present" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Present"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="absent" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Absent"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="late" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Late"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Distribution</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                formatter={(value: number) => [value, 'Students']}
              />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 0, 0]}
                barSize={60}
              >
                {statusData.map((entry, index) => (
                  <rect 
                    key={`cell-${index}`}
                    fill={entry.status === 'Present' ? '#10b981' : 
                          entry.status === 'Absent' ? '#ef4444' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
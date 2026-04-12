'use client';

import { PieChart, Pie, ResponsiveContainer, Tooltip } from 'recharts';

export const ClassAttendance = ({
  attendanceData,
  onMarkAttendance,
  loading = false,
  error = '',
}: any) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-lg mb-4">Today Attendance</h3>
        <div className="h-56 flex items-center justify-center text-sm text-slate-500">
          Loading attendance...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
        <h3 className="font-semibold text-lg mb-2">Today Attendance</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!attendanceData) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-lg mb-2">Today Attendance</h3>
        <p className="text-sm text-slate-500">No attendance data available.</p>
      </div>
    );
  }

  const present =
    attendanceData.present_count ??
    attendanceData.present ??
    attendanceData?.summary?.Present ??
    0;
  const absent =
    attendanceData.absent_count ??
    attendanceData.absent ??
    attendanceData?.summary?.Absent ??
    0;
  const total = Number(present) + Number(absent);

  const data = [
    { name: 'Present', value: present },
    { name: 'Absent', value: absent }
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4">Today Attendance</h3>

      {total > 0 ? (
        <div className="h-56">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-56 flex items-center justify-center text-sm text-slate-500">
          No attendance marked yet.
        </div>
      )}

      <button
        onClick={() => onMarkAttendance(attendanceData)}
        disabled={!onMarkAttendance || total === 0}
        className="w-full mt-4 py-2 rounded-xl bg-blue-600 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Update Attendance
      </button>
    </div>
  );
};

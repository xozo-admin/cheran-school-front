'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export const StudentPerformance = ({ teacherData, onViewStudent }: any) => {
  const students = teacherData?.students || [];

  const chartData = students.map((s: any) => ({
    name: s.name,
    marks: s.avg_marks || 0
  }));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-1">Student Performance</h3>
      <p className="text-sm text-slate-500 mb-4">Average marks overview</p>

      <div className="h-60">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="marks" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 space-y-1">
        {students.slice(0, 3).map((s: any) => (
          <button
            key={s.id}
            onClick={() => onViewStudent(s.id)}
            className="text-blue-600 text-sm hover:underline"
          >
            View {s.name}
          </button>
        ))}
      </div>
    </div>
  );
};

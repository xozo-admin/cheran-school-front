'use client';

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const AssignmentStatus = ({ assignmentsData, onCreateAssignment }: any) => {
  const data = [
    {
      name: 'Assignments',
      Completed: assignmentsData.filter((a: { is_completed: any; }) => a.is_completed).length,
      Pending: assignmentsData.filter((a: { is_completed: any; }) => !a.is_completed).length
    }
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4">Assignments</h3>

      <div className="h-40">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <Tooltip />
            <Bar dataKey="Completed" />
            <Bar dataKey="Pending" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <button
        onClick={() => onCreateAssignment({})}
        className="w-full mt-4 py-2 rounded-xl bg-green-600 text-white text-sm"
      >
        Create Assignment
      </button>
    </div>
  );
};

'use client';

export const QuickTeacherActions = () => {
  const actions = [
    'Mark Attendance',
    'Create Assignment',
    'Upload Resource',
    'Send Announcement'
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>

      <div className="grid grid-cols-2 gap-3">
        {actions.map(a => (
          <button
            key={a}
            className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-sm"
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  );
};

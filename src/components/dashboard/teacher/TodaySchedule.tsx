'use client';

export const TodaySchedule = ({ timetable }: any) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const todayClasses = Array.isArray(timetable)
    ? timetable.filter((t: any) => t.day === today)
    : Array.isArray(timetable?.timetable)
      ? timetable.timetable
      : Array.isArray(timetable?.timetable?.[today])
        ? timetable.timetable[today]
        : [];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4">Today Schedule</h3>

      {todayClasses.length === 0 && (
        <p className="text-sm text-slate-500">No classes today</p>
      )}

      <ul className="space-y-3">
        {todayClasses.map((c: any) => (
          <li key={c.id} className="p-3 bg-slate-50 rounded-xl">
            <p className="font-medium">{c.subject || c.subject_name || 'Class'}</p>
            <p className="text-xs text-slate-500">
              {c.time || (c.start_time && c.end_time ? `${c.start_time} - ${c.end_time}` : '')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

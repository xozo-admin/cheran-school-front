'use client';

export const UpcomingClasses = ({ timetable }: any) => {
  const upcoming = Array.isArray(timetable)
    ? timetable.slice(0, 3)
    : Array.isArray(timetable?.timetable)
      ? timetable.timetable.slice(0, 3)
      : timetable?.timetable && typeof timetable.timetable === 'object'
        ? Object.values(timetable.timetable).flat().slice(0, 3)
        : [];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4">Upcoming Classes</h3>

      <ul className="space-y-3">
        {upcoming.map((c: any, index: number) => (
          <li key={c.id ?? `${c.day || 'day'}-${c.start_time || 'time'}-${index}`} className="border rounded-xl p-3">
            <p className="font-medium">{c.subject || c.subject_name || 'Class'}</p>
            <p className="text-xs text-slate-500">
              {c.day || 'Today'} • {c.time || c.start_time || ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

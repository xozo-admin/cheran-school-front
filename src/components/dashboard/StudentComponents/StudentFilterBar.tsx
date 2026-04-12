'use client';

import { useEffect, useState } from 'react';

export default function StudentFilterBar({
  onSelectStudent,
}: {
  onSelectStudent: (id: string) => void;
}) {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/setup/students/')
      .then(res => res.json())
      .then(setStudents);
  }, []);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <select
        onChange={(e) => onSelectStudent(e.target.value)}
        className="w-full md:w-80 border rounded-lg px-3 py-2"
      >
        <option value="">Select Student</option>
        {students.map(s => (
          <option key={s.student_id} value={s.student_id}>
            {s.name} – {s.class}-{s.section}
          </option>
        ))}
      </select>
    </div>
  );
}

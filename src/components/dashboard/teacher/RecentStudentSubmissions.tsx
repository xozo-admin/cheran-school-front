'use client';

export const RecentStudentSubmissions = ({
  assignmentsData,
  onGradeSubmission
}: any) => {
  const submissions =
    assignmentsData.flatMap((a: { submissions: any; }) => a.submissions || []).slice(0, 4);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4">Recent Submissions</h3>

      {submissions.map((s: any) => (
        <div key={s.id} className="flex justify-between mb-3">
          <div>
            <p className="font-medium">{s.student_name}</p>
            <p className="text-xs text-slate-500">{s.assignment_title}</p>
          </div>
          <button
            onClick={() => onGradeSubmission(s.id, 80)}
            className="text-blue-600 text-sm"
          >
            Grade
          </button>
        </div>
      ))}
    </div>
  );
};

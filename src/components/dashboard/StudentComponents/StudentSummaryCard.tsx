export default function StudentSummaryCard({
  student,
  attendance,
}: {
  student: any;
  attendance: number;
}) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-white border rounded-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <p className="text-sm text-slate-500">Student</p>
        <p className="font-semibold">{student.name}</p>
      </div>

      <div>
        <p className="text-sm text-slate-500">Overall %</p>
        <p className="text-xl font-bold text-blue-600">
          {student.overall_percentage}%
        </p>
      </div>

      <div>
        <p className="text-sm text-slate-500">Rank</p>
        <p className="text-xl font-bold">{student.rank}</p>
      </div>

      <div>
        <p className="text-sm text-slate-500">Attendance</p>
        <p
          className={`text-xl font-bold ${
            attendance < 75 ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {attendance}%
        </p>
      </div>
    </div>
  );
}

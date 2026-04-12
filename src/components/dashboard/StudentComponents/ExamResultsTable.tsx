export default function ExamResultsTable({ exams }: { exams: any[] }) {
  return (
    <div className="bg-white rounded-xl p-6 border shadow-sm">
      <h3 className="font-semibold mb-4">Exam Results</h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="py-2">Exam</th>
            <th>Subject</th>
            <th>Marks</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {exams.map((e, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2">{e.exam_name}</td>
              <td>{e.subject}</td>
              <td>{e.marks}</td>
              <td>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    e.marks >= 35
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {e.marks >= 35 ? 'Pass' : 'Fail'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

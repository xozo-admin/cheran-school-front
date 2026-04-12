export default function SubjectPerformanceChart({
  subjects,
}: {
  subjects: any[];
}) {
  return (
    <div className="bg-white rounded-xl p-6 border shadow-sm">
      <h3 className="font-semibold mb-4">Subject Performance</h3>

      <div className="space-y-3">
        {subjects.map(sub => (
          <div key={sub.name}>
            <div className="flex justify-between text-sm mb-1">
              <span>{sub.name}</span>
              <span>{sub.marks}</span>
            </div>
            <div className="h-2 bg-slate-200 rounded">
              <div
                className="h-2 bg-blue-500 rounded"
                style={{ width: `${sub.marks}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

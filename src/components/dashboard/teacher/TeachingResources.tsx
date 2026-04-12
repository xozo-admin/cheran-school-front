'use client';

export const TeachingResources = ({ resources = [], onUploadResource }: any) => {

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4">Teaching Resources</h3>

      <ul className="space-y-2 mb-4">
        {resources.map((r: any) => (
          <li key={r.id} className="text-sm text-slate-700">
            {r.title}
          </li>
        ))}
      </ul>

      <button
        onClick={onUploadResource}
        className="w-full py-2 rounded-xl bg-indigo-600 text-white text-sm"
      >
        Upload Resource
      </button>
    </div>
  );
};

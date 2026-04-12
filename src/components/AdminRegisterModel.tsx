'use client';

export default function AdminRegisterModal() {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-center">
          Register School Admin
        </h2>

        {/* reuse your admin register form here */}
        <p className="text-sm text-gray-600 text-center mb-4">
          Please register admin to continue using the system
        </p>

        {/* form goes here */}
      </div>
    </div>
  );
}

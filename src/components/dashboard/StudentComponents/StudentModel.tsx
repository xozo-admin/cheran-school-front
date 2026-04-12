'use client';

import { useState, useEffect } from 'react';
import { FiX, FiUser, FiMail, FiPhone, FiCalendar, FiHome } from 'react-icons/fi';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  student?: any;
}

export default function StudentModal({ isOpen, onClose, onSubmit, student }: StudentModalProps) {
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    student_email: '',
    father_name: '',
    mother_name: '',
    father_phone: '',
    mother_phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    class_name: '',
    section: '',
  });

  useEffect(() => {
    if (student) {
      setFormData({
        student_id: student.student_id || '',
        student_name: student.student_name || '',
        student_email: student.student_email || '',
        father_name: student.father_name || '',
        mother_name: student.mother_name || '',
        father_phone: student.father_phone || '',
        mother_phone: student.mother_phone || '',
        date_of_birth: student.date_of_birth || '',
        gender: student.gender || '',
        address: student.address || '',
        class_name: student.class_name || '',
        section: student.section || '',
      });
    } else {
      setFormData({
        student_id: '',
        student_name: '',
        student_email: '',
        father_name: '',
        mother_name: '',
        father_phone: '',
        mother_phone: '',
        date_of_birth: '',
        gender: '',
        address: '',
        class_name: '',
        section: '',
      });
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {student ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID *
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.student_id}
                      onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                      className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter student ID"
                    />
                  </div>
                </div>

                {/* Student Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.student_name}
                      onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                      className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.student_email}
                      onChange={(e) => setFormData({...formData, student_email: e.target.value})}
                      className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="student@example.com"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                      className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Father's Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Father's Phone *
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      required
                      value={formData.father_phone}
                      onChange={(e) => setFormData({...formData, father_phone: e.target.value})}
                      className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <div className="relative">
                    <FiHome className="absolute left-3 top-3 text-gray-400" />
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      rows={3}
                      className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter address"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {student ? 'Update Student' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
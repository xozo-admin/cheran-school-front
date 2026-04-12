'use client';

import { useState, useEffect } from 'react';
import { FiX, FiUser, FiSearch, FiCheck, FiAlertCircle } from 'react-icons/fi';
// import { teachersAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface AssignTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  section?: any;
  standard?: any;
}

interface Teacher {
  teacher_id: string;
  name: string;
  department: string;
  email: string;
  phone: string;
  current_class?: string;
}

export const AssignTeacherModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  section,
  standard 
}: AssignTeacherModalProps) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      // fetchTeachers();
      // if (section?.class_teacher) {
      //   setCurrentAssignment(section.class_teacher);
      //   setSelectedTeacherId(section.class_teacher.teacher_id);
      // } else {
      //   setCurrentAssignment(null);
      //   setSelectedTeacherId('');
      // }
    }
  }, [isOpen, section]);

  useEffect(() => {
    filterTeachers();
  }, [teachers, searchTerm]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      // const response = await teachersAPI.getAll();
      // setTeachers(response.data);
      // setFilteredTeachers(response.data);
    } catch (error) {
      toast.error('Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  const filterTeachers = () => {
    if (!searchTerm) {
      setFilteredTeachers(teachers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = teachers.filter(teacher =>
      teacher.name.toLowerCase().includes(term) ||
      teacher.teacher_id.toLowerCase().includes(term) ||
      teacher.department.toLowerCase().includes(term)
    );
    setFilteredTeachers(filtered);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeacherId) {
      toast.error('Please select a teacher');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit({
      teacher_id: selectedTeacherId
    });
    setShowConfirmation(false);
  };

  const getTeacherStatus = (teacher: Teacher) => {
    if (teacher.teacher_id === currentAssignment?.teacher_id) {
      return {
        type: 'current',
        text: 'Currently Assigned',
        color: 'bg-green-100 text-green-800'
      };
    }
    if (teacher.current_class) {
      return {
        type: 'assigned',
        text: `Assigned to ${teacher.current_class}`,
        color: 'bg-yellow-100 text-yellow-800'
      };
    }
    return {
      type: 'available',
      text: 'Available',
      color: 'bg-blue-100 text-blue-800'
    };
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
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Assign Class Teacher
                </h3>
                <p className="text-sm text-gray-600">
                  {standard?.name && section?.name 
                    ? `Class ${standard.name} - Section ${section.name}`
                    : 'Select a teacher for this section'
                  }
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Current Assignment Info */}
            {currentAssignment && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiUser className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Current Class Teacher</p>
                      <p className="font-semibold text-gray-900">{currentAssignment.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        ID: {currentAssignment.teacher_id}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    Currently Assigned
                  </span>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Teachers
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, ID, or department..."
                  className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Teacher Selection */}
                <div className="mb-6 max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredTeachers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <FiUser className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No teachers found</p>
                      <p className="text-sm mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredTeachers.map((teacher) => {
                        const status = getTeacherStatus(teacher);
                        const isSelected = selectedTeacherId === teacher.teacher_id;
                        const isCurrent = teacher.teacher_id === currentAssignment?.teacher_id;

                        return (
                          <div
                            key={teacher.teacher_id}
                            className={`p-4 cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                            } ${isCurrent ? 'bg-green-50' : ''}`}
                            onClick={() => !isCurrent && setSelectedTeacherId(teacher.teacher_id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  isSelected ? 'bg-blue-100' : 'bg-gray-100'
                                } ${isCurrent ? 'bg-green-100' : ''}`}>
                                  <FiUser className={`w-5 h-5 ${
                                    isSelected ? 'text-blue-600' : 'text-gray-600'
                                  } ${isCurrent ? 'text-green-600' : ''}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">
                                      {teacher.name}
                                    </p>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>
                                      {status.text}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                    <span>ID: {teacher.teacher_id}</span>
                                    <span>•</span>
                                    <span>{teacher.department}</span>
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {teacher.email} • {teacher.phone}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center">
                                {isCurrent && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <FiCheck className="w-4 h-4" />
                                    <span className="text-sm font-medium">Current</span>
                                  </div>
                                )}
                                {isSelected && !isCurrent && (
                                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                                    <FiCheck className="w-4 h-4 text-white" />
                                  </div>
                                )}
                                {!isSelected && !isCurrent && (
                                  <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {filteredTeachers.filter(t => !t.current_class).length}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Available</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {filteredTeachers.filter(t => t.current_class && t.teacher_id !== currentAssignment?.teacher_id).length}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Assigned</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {filteredTeachers.filter(t => t.teacher_id === currentAssignment?.teacher_id).length}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Current</p>
                  </div>
                </div>
              </>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedTeacherId || selectedTeacherId === currentAssignment?.teacher_id}
                className={`px-6 py-2.5 rounded-lg transition-colors ${
                  !selectedTeacherId || selectedTeacherId === currentAssignment?.teacher_id
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {currentAssignment ? 'Change Assignment' : 'Assign Teacher'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedTeacherId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiAlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirm Assignment
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to assign this teacher?
                  </p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <FiUser className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {teachers.find(t => t.teacher_id === selectedTeacherId)?.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      ID: {selectedTeacherId}
                    </p>
                  </div>
                </div>
              </div>

              {currentAssignment && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Note: This will replace the current class teacher{' '}
                    <span className="font-semibold">{currentAssignment.name}</span>
                  </p>
                </div>
              )}

              <div className="text-sm text-gray-600 mb-6">
                <p className="font-medium mb-2">Assignment Details:</p>
                <ul className="space-y-1">
                  <li>• Class: {standard?.name || 'N/A'}</li>
                  <li>• Section: {section?.name || 'N/A'}</li>
                  <li>• Teacher will be responsible for this section</li>
                  <li>• Previous assignments (if any) will be updated</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
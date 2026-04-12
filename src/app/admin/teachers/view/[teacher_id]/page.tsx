'use client';

import { apiFetch } from '@/lib/api';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FaUserTie,
  FaArrowLeft,
  FaPhone,
  FaEnvelope,
  FaCalendar,
  FaGraduationCap,
  FaBuilding,
  FaMapMarkerAlt,
  FaEdit,
  FaTrash,
  FaChalkboardTeacher,
  FaIdCard,
} from 'react-icons/fa';

interface Teacher {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  qualification: string;
  department: string;
  address: string;
  assigned_class: string;
  assigned_section: {
    id: number;
    name: string;
    standard: {
      id: number;
      name: string;
    };
  } | null;
}

export default function ViewTeacherPage() {
  const params = useParams();
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const teacher_id = params.teacher_id as string;

  useEffect(() => {
    fetchTeacherDetails();
  }, [teacher_id]);

  const fetchTeacherDetails = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`setup/teachers/${teacher_id}/`, {
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Teacher not found');
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Teacher data:', data);
      setTeacher(data);
    } catch (error) {
      console.error('Error fetching teacher details:', error);
      alert(error instanceof Error ? error.message : 'Failed to load teacher details');
      router.push('/admin/teachers/allteachers');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/admin/teachers/edit/${teacher_id}`);
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    
    try {
      const response = await apiFetch(`setup/teachers/${teacher_id}/`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      
      alert('Teacher deleted successfully');
      router.push('/admin/teachers/allteachers');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete teacher');
    }
  };

  const calculateAge = (dob: string) => {
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return null;
    }
  };

  const getAssignedClassText = () => {
    if (!teacher) return 'Not assigned';
    
    if (teacher.assigned_section && teacher.assigned_section.standard) {
      return `Class ${teacher.assigned_section.standard.name} - Section ${teacher.assigned_section.name}`;
    } else if (teacher.assigned_class) {
      return teacher.assigned_class;
    }
    
    return 'Not assigned';
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/teachers/allteachers');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="text-gray-600" />
            </button>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Loading teacher details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Not Found</h1>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
              <FaUserTie className="text-3xl text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Teacher not found</h3>
            <p className="text-gray-600 mb-6">The teacher you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/admin/teachers/allteachers')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Teachers
            </button>
          </div>
        </div>
      </div>
    );
  }

  const age = calculateAge(teacher.date_of_birth);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaArrowLeft className="text-gray-600 text-lg" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Teacher Details</h1>
                <p className="text-gray-600 mt-1">View complete information about the teacher</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FaEdit />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <FaTrash />
                Delete
              </button>
            </div>
          </div>

          {/* TEACHER PROFILE CARD */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="h-24 w-24 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-100 to-purple-50 border border-purple-200">
                <FaUserTie className="text-purple-600 text-4xl" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">{teacher.name}</h2>
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                        {teacher.department}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <FaIdCard className="text-gray-400" />
                        <span>ID: {teacher.teacher_id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaGraduationCap className="text-gray-400" />
                        <span>{teacher.qualification}</span>
                      </div>
                      {(teacher.assigned_class || teacher.assigned_section) && (
                        <div className="flex items-center gap-2">
                          <FaChalkboardTeacher className="text-gray-400" />
                          <span>{getAssignedClassText()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {age !== null && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Age</p>
                        <p className="text-2xl font-bold text-gray-900">{age}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PERSONAL INFORMATION */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaUserTie className="text-purple-500" />
              Personal Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FaEnvelope className="text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="text-gray-900">{teacher.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FaPhone className="text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="text-gray-900">{teacher.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FaCalendar className="text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="text-gray-900">
                    {teacher.date_of_birth} {age !== null && `(${age} years old)`}
                  </p>
                </div>
              </div>
              {teacher.address && (
                <div className="flex items-start gap-3">
                  <FaMapMarkerAlt className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-900 whitespace-pre-line">{teacher.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PROFESSIONAL INFORMATION */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaGraduationCap className="text-green-500" />
              Professional Information
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-500">Qualification</p>
                <p className="text-gray-900 font-medium">{teacher.qualification}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="text-gray-900 font-medium">{teacher.department}</p>
              </div>
              {(teacher.assigned_section || teacher.assigned_class) && (
                <div>
                  <p className="text-sm text-gray-500">Assigned Class</p>
                  <p className="text-gray-900 font-medium">{getAssignedClassText()}</p>
                </div>
              )}
            </div>
          </div>

          {/* CLASS INFORMATION - Only show if assigned */}
          {(teacher.assigned_section && teacher.assigned_section.standard) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaChalkboardTeacher className="text-blue-500" />
                Class Assignment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-500">Class</p>
                    <p className="text-xl font-bold text-gray-900">Class {teacher.assigned_section.standard.name}</p>
                    <p className="text-sm text-gray-600">Standard ID: {teacher.assigned_section.standard.id}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-500">Section</p>
                    <p className="text-xl font-bold text-gray-900">{teacher.assigned_section.name}</p>
                    <p className="text-sm text-gray-600">Section ID: {teacher.assigned_section.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ADDITIONAL INFO */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Teacher ID & System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Teacher ID</p>
              <p className="text-gray-900 font-mono bg-gray-50 p-2 rounded">{teacher.teacher_id}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Database ID</p>
              <p className="text-gray-900 font-mono bg-gray-50 p-2 rounded">{teacher.id}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Assigned Class</p>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">
                {teacher.assigned_class || 'Not assigned'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FaTrash className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Teacher</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <span className="font-semibold">{teacher.name}</span>?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. All teacher records will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Teacher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
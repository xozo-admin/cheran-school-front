'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaUserGraduate,
  FaUserPlus,
  FaTrash,
  FaEye,
  FaEdit,
  FaArrowLeft,
  FaSave,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPhone,
  FaEnvelope,
  FaCalendar,
  FaUser,
  FaChevronLeft,
  FaChevronRight,
  FaMapMarkerAlt,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaUsers,
  FaChartBar,
  FaSchool,
  FaIdCard,
  FaBirthdayCake,
  FaVenusMars,
  FaSync,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaClipboardList,
  FaFileExport,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { IoIosSchool, IoMdStats } from 'react-icons/io';
import { MdClass, MdOutlineFamilyRestroom, MdOutlineDashboard } from 'react-icons/md';
import { FiCalendar, FiFilter, FiDownload, FiChevronRight, FiUsers, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';

interface Student {
  student_id: string;
  student_name: string;
  student_email: string | null;
  father_name: string;
  mother_name: string;
  gender: string;
  date_of_birth: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  class_name: string | null;
  section: string | null;
  address: string | null;
  date_of_admission?: string;
  standard?: string;
}

interface ClassStats {
  class: string;
  count: number;
  sections: string[];
}

export const AllStudentsPage = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'student_name',
    direction: 'asc'
  });
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [bulkUploadMode, setBulkUploadMode] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    student_email: '',
    father_name: '',
    mother_name: '',
    father_phone: '',
    mother_phone: '',
    date_of_birth: '',
    gender: 'Male',
    class_name: '',
    section: '',
    address: '',
  });

  // Theme-aware CSS classes using the theme system
  const headerClasses = combine(
    get('bg', 'primary'),
    'border-b',
    get('border', 'primary'),
    'px-6 py-4',
    'transition-all duration-150'
  );

  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-2xl p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50');
    }
    if (color === 'pink') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-pink-900/10'
        : 'from-white to-pink-50');
    }
    if (color === 'indigo') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getStatsCardClass = (color: 'blue' | 'emerald' | 'amber' | 'pink' | 'indigo' = 'blue') => {
    return getCardGradientClass(color);
  };

  const getInputClass = () => combine(
    'px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all w-full',
    'text-sm', // Added text size
    get('bg', 'card'),
    get('border', 'secondary'),
    get('text', 'primary'),
    'placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'hover:border-[var(--color-border-strong)]',
    'focus:border-[var(--color-accent-primary)]'
  );

  const getPrimaryButtonClass = () => combine(
    'px-6 py-3.5 rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-sm', // Added text size
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-4 py-3 rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-sm', // Added text size
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getStatusBadgeClass = (type: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
      blue: {
        bg: theme === 'dark' ? 'from-blue-900/30 to-blue-800/30' : 'from-blue-100 to-blue-200',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
      },
      emerald: {
        bg: theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30' : 'from-emerald-100 to-emerald-200',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
      },
      pink: {
        bg: theme === 'dark' ? 'from-pink-900/30 to-pink-800/30' : 'from-pink-100 to-pink-200',
        text: theme === 'dark' ? 'text-pink-300' : 'text-pink-700',
        border: theme === 'dark' ? 'border-pink-800' : 'border-pink-200'
      },
      amber: {
        bg: theme === 'dark' ? 'from-amber-900/30 to-amber-800/30' : 'from-amber-100 to-amber-200',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
      },
      indigo: {
        bg: theme === 'dark' ? 'from-indigo-900/30 to-indigo-800/30' : 'from-indigo-100 to-indigo-200',
        text: theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700',
        border: theme === 'dark' ? 'border-indigo-800' : 'border-indigo-200'
      },
    };

    const colors = colorMap[type] || colorMap.blue;
    return combine(
      'px-3 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  const getTableHeaderClass = () => combine(
    get('bg', 'secondary'),
    'divide-y',
    get('border', 'primary')
  );

  const getTableRowClass = () => combine(
    get('bg', 'card'),
    'divide-y',
    get('border', 'primary'),
  );

  /* ================= FETCH STUDENTS ================= */
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:8000/api/schooladmin/students/', {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setStudents(data || []);
      calculateClassStats(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toastError('Failed to fetch students. Please check your connection.');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  /* ================= CALCULATE CLASS STATS ================= */
  const calculateClassStats = (studentsList: Student[]) => {
    const stats: { [key: string]: ClassStats } = {};

    studentsList.forEach(student => {
      const className = student.class_name || 'Not Assigned';
      if (!stats[className]) {
        stats[className] = {
          class: className,
          count: 0,
          sections: []
        };
      }
      stats[className].count++;
      if (student.section && !stats[className].sections.includes(student.section)) {
        stats[className].sections.push(student.section);
      }
    });

    setClassStats(Object.values(stats).sort((a, b) => {
      if (a.class === 'Not Assigned') return 1;
      if (b.class === 'Not Assigned') return -1;
      return parseInt(a.class) - parseInt(b.class);
    }));
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  /* ================= DELETE STUDENT ================= */
  const deleteStudent = async (id: string) => {
    setShowDeleteConfirm(null);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/schooladmin/students/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Token ${token}` },
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setStudents(prev => prev.filter(s => s.student_id !== id));
      toastSuccess('Student deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      toastError('Failed to delete student');
      fetchStudents();
    }
  };

  /* ================= START EDIT ================= */
  const startEdit = (s: Student) => {
    setFormData({
      student_id: s.student_id,
      student_name: s.student_name,
      student_email: s.student_email || '',
      father_name: s.father_name,
      mother_name: s.mother_name,
      father_phone: s.father_phone || '',
      mother_phone: s.mother_phone || '',
      date_of_birth: s.date_of_birth || '',
      gender: s.gender,
      class_name: s.class_name || '',
      section: s.section || '',
      address: s.address || '',
    });
    setEditId(s.student_id);
    setMode('edit');
  };

  /* ================= VIEW STUDENT DETAILS ================= */
  const viewStudentDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/api/schooladmin/students/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });

      if (res.ok) {
        const student = await res.json();
        setSelectedStudent(student);
        setShowStudentModal(true);
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  };

  /* ================= HANDLE FORM CHANGE ================= */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT FORM ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');

    const payload = {
      student_id: formData.student_id,
      student_name: formData.student_name,
      student_email: formData.student_email || null,
      father_name: formData.father_name,
      mother_name: formData.mother_name,
      father_phone: formData.father_phone || null,
      mother_phone: formData.mother_phone || null,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender,
      class_name: formData.class_name || null,
      section: formData.section || null,
      address: formData.address || null,
    };

    const url = mode === 'edit'
      ? `http://127.0.0.1:8000/api/schooladmin/students/${editId}/`
      : `http://127.0.0.1:8000/api/schooladmin/students/`;

    const method = mode === 'edit' ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (res.ok) {
        fetchStudents();
        setMode('list');
        setFormData({
          student_id: '',
          student_name: '',
          student_email: '',
          father_name: '',
          mother_name: '',
          father_phone: '',
          mother_phone: '',
          date_of_birth: '',
          gender: 'Male',
          class_name: '',
          section: '',
          address: '',
        });

        const successMsg = mode === 'edit'
          ? 'Student updated successfully!'
          : 'Student added successfully!';
        toastSuccess(successMsg);
      } else {
        const errorMsg = responseData.message ||
          responseData.detail ||
          'Operation failed. Please check your data.';
        toastError(`Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      toastError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  /* ================= BULK UPLOAD CSV ================= */
  const handleBulkUpload = async () => {
    if (!csvFile) {
      toastWarning('Please select a CSV file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', csvFile);

    setUploadProgress(0);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8000/api/schooladmin/csv/', {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        toastSuccess('Bulk upload completed successfully!');
        fetchStudents();
        setBulkUploadMode(false);
        setCsvFile(null);
      } else {
        toastError(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toastError('Upload failed. Please try again.');
    } finally {
      setUploadProgress(100);
    }
  };

  /* ================= SORTING ================= */
  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedStudents = [...students].sort((a, b) => {
    const aValue: any = a[sortConfig.key as keyof Student];
    const bValue: any = b[sortConfig.key as keyof Student];

    if (aValue === null || bValue === null) return 0;

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  /* ================= FILTER & SEARCH ================= */
  const filteredStudents = sortedStudents.filter(student => {
    const matchesSearch =
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.father_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.class_name && student.class_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGender = filterGender === 'all' || student.gender === filterGender;
    const matchesClass = filterClass === 'all' || student.class_name === filterClass;

    return matchesSearch && matchesGender && matchesClass;
  });

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);

  /* ================= STATS ================= */
  const maleCount = students.filter(s => s.gender === 'Male').length;
  const femaleCount = students.filter(s => s.gender === 'Female').length;
  const totalStudents = students.length;

  /* ================= EXPORT CSV ================= */
  const exportToCSV = () => {
    const headers = [
      'Student ID', 'Name', 'Email', 'Gender', 'DOB',
      'Father', 'Mother', 'Father Phone', 'Mother Phone',
      'Class', 'Section', 'Address'
    ];

    const csvData = students.map(student => [
      student.student_id,
      student.student_name,
      student.student_email || '',
      student.gender,
      student.date_of_birth || '',
      student.father_name,
      student.mother_name,
      student.father_phone || '',
      student.mother_phone || '',
      student.class_name || '',
      student.section || '',
      student.address || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toastSuccess('CSV exported successfully!');
  };

  /* ================= GET UNIQUE CLASSES ================= */
  const uniqueClasses = Array.from(new Set(students
    .filter(s => s.class_name)
    .map(s => s.class_name)
    .filter(Boolean)
  ));

  /* ================= AGE CALCULATION ================= */
  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className={`p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full">
        {/* HEADER SECTION */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={combine(
                "p-3 rounded-2xl shadow-lg",
                theme === 'dark'
                  ? "bg-gradient-to-br from-blue-600 to-blue-700"
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <FaUserGraduate className="text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-3xl font-bold", get('text', 'primary'))}>
                  Student Management
                </h1>
                <p className={combine("text-sm mt-1 flex items-center", get('text', 'secondary'))}>
                  <MdOutlineDashboard className="mr-2" />
                  Manage all student records and information
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {mode === 'list' ? (
                <>
                  <button
                    onClick={exportToCSV}
                    className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
                  >
                    <FiDownload className="text-sm" />
                    <span className="text-sm">Export CSV</span>
                  </button>

                  <button
                    onClick={() => setBulkUploadMode(!bulkUploadMode)}
                    className={combine(
                      getSecondaryButtonClass(),
                      "flex items-center space-x-2",
                      theme === 'dark'
                        ? 'border-emerald-800 text-emerald-300 hover:border-emerald-700'
                        : 'border-emerald-200 text-emerald-700 hover:border-emerald-300'
                    )}
                  >
                    <FaClipboardList className="text-sm" />
                    <span className="text-sm">Bulk Upload</span>
                  </button>

                  <button
                    onClick={() => setMode('add')}
                    className={combine(getPrimaryButtonClass(), "flex items-center space-x-2")}
                  >
                    <FaUserPlus className="text-sm" />
                    <span className="text-sm">Add Student</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setMode('list')}
                  className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
                >
                  <FaArrowLeft className="text-sm" />
                  <span className="text-sm">Back to List</span>
                </button>
              )}
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            <div className={getStatsCardClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Students</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{totalStudents}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FiUsers className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-4 text-xs", get('text', 'tertiary'))}>
                Across all classes & sections
              </div>
            </div>

            <div className={getStatsCardClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Male Students</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{maleCount}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FaUser className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'success'))}>
                {totalStudents > 0 ? `${((maleCount / totalStudents) * 100).toFixed(1)}%` : '0%'} of total
              </div>
            </div>

            <div className={getStatsCardClass('pink')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Female Students</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{femaleCount}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-pink-900/30' : 'bg-pink-100'
                )}>
                  <FaUser className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-pink-400' : 'text-pink-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'warning'))}>
                {totalStudents > 0 ? `${((femaleCount / totalStudents) * 100).toFixed(1)}%` : '0%'} of total
              </div>
            </div>

            <div className={getStatsCardClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Classes</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{classStats.length}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <IoIosSchool className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'warning'))}>
                {uniqueClasses.length} active classes
              </div>
            </div>

            <div className={getStatsCardClass('indigo')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Filtered</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{filteredStudents.length}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FiFilter className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'primary'))}>
                {totalStudents > 0 ? `${((filteredStudents.length / totalStudents) * 100).toFixed(1)}%` : '0%'} of total
              </div>
            </div>
          </div>

          {/* BULK UPLOAD MODAL */}
          {bulkUploadMode && (
            <div className="animate-fade-in mb-6">
              <div className={getCardGradientClass('emerald')}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={combine(
                      "p-2 rounded-xl",
                      theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                    )}>
                      <FaClipboardList className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                      )} />
                    </div>
                    <div>
                      <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Bulk Upload Students</h3>
                      <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                        Upload a CSV file to add multiple students at once
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBulkUploadMode(false)}
                    className={combine(
                      "p-2 rounded-xl transition-all",
                      "hover:bg-[var(--color-bg-hover)]"
                    )}
                  >
                    <FaTimesCircle className={get('icon', 'secondary') + " text-sm"} />
                  </button>
                </div>

                <div className="mb-4">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Select CSV File
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className={getInputClass()}
                    />
                    <button
                      onClick={handleBulkUpload}
                      disabled={!csvFile}
                      className={combine(
                        "px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center space-x-2 text-sm",
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white',
                        "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                      )}
                    >
                      <FiDownload className="text-sm" />
                      <span className="text-sm">Upload</span>
                    </button>
                  </div>
                  {csvFile && (
                    <p className={combine(
                      "mt-2 text-xs flex items-center gap-2",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )}>
                      <FiCheckCircle className="text-sm" />
                      Selected: {csvFile.name}
                    </p>
                  )}
                </div>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mb-4">
                    <div className={combine("flex justify-between text-xs mb-1", get('text', 'secondary'))}>
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className={combine("w-full rounded-full h-1.5", get('bg', 'secondary'))}>
                      <div
                        className={combine(
                          "h-1.5 rounded-full transition-all duration-300",
                          theme === 'dark'
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                            : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                        )}
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className={combine("text-xs", get('text', 'secondary'))}>
                  <p className={combine("font-medium mb-2", get('text', 'primary'))}>CSV Format:</p>
                  <div className={combine(
                    "p-3 rounded-xl font-mono text-xs",
                    get('bg', 'secondary'),
                    get('text', 'primary')
                  )}>
                    student_id,student_name,student_email,father_name,mother_name,father_phone,mother_phone,date_of_birth,gender,class,section,address
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLASS DISTRIBUTION CHART */}
          {!statsLoading && classStats.length > 0 && (
            <div className={getCardGradientClass('indigo')}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                  )}>
                    <IoMdStats className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                    )} />
                  </div>
                  <div>
                    <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Class Distribution</h3>
                    <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                      Student count across different classes
                    </p>
                  </div>
                </div>

              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {classStats.slice(0, 6).map((stat) => (
                  <div key={stat.class} className={combine(
                    "rounded-xl p-3 border shadow-sm hover:shadow-md transition-all hover:scale-[1.02]",
                    get('bg', 'card'),
                    get('border', 'primary')
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={combine("font-bold text-sm", get('text', 'primary'))}>
                        Class {stat.class}
                      </span>
                      <span className={getStatusBadgeClass('blue')}>
                        {stat.count}
                      </span>
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>
                      {stat.sections.length} sections
                    </div>
                    <div className={combine(
                      "mt-2 h-1.5 rounded-full overflow-hidden",
                      get('bg', 'secondary')
                    )}>
                      <div
                        className={combine(
                          "h-full rounded-full",
                          theme === 'dark'
                            ? 'bg-gradient-to-r from-blue-400 to-indigo-500'
                            : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                        )}
                        style={{ width: `${(stat.count / totalStudents) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {mode === 'list' && (
          <div className="animate-fade-in">
            {/* SEARCH & FILTERS */}
            <div className={combine(
              getCardGradientClass('blue'),
              "transition-all duration-200 backdrop-blur-md bg-opacity-95 mb-4"
            )}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 space-y-4 lg:space-y-0">
                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    <FaSearch className="inline mr-2 text-sm" />
                    Search Students
                  </label>
                  <div className="relative">
                    <FaSearch className={combine(
                      "absolute left-3 top-1/2 transform -translate-y-1/2 text-sm",
                      get('icon', 'secondary')
                    )} />
                    <input
                      type="text"
                      placeholder="Search by name, ID, father's name, or class..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={getInputClass()}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    <FaVenusMars className="inline mr-2 text-sm" />
                    Gender
                  </label>
                  <select
                    value={filterGender}
                    onChange={(e) => {
                      setFilterGender(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={getInputClass()}
                  >
                    <option value="all">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    <FaSchool className="inline mr-2 text-sm" />
                    Class
                  </label>
                  <select
                    value={filterClass}
                    onChange={(e) => {
                      setFilterClass(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={getInputClass()}
                  >
                    <option value="all">All Classes</option>
                    {uniqueClasses.map(cls => (
                      <option key={cls} value={cls!}>Class {cls}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* STUDENTS TABLE */}
            <div className={getCardGradientClass()}>
              <div className={combine(
                "p-4 border-b",
                get('border', 'primary'),
                get('bg', 'secondary')
              )}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                  <div>
                    <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Student Records</h3>
                    <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                      View and manage student information
                    </p>
                  </div>

                  <div className={combine("text-xs", get('text', 'tertiary'))}>
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredStudents.length)} of {filteredStudents.length} students
                  </div>
                </div>
              </div>
              {/* Table Content */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className={combine(
                        "animate-spin rounded-full h-8 w-8 border-4",
                        theme === 'dark' ? 'border-blue-500 border-t-transparent' : 'border-blue-600 border-t-transparent'
                      )}></div>
                      <p className={combine("mt-3 text-sm font-medium", get('text', 'secondary'))}>Loading students...</p>
                    </div>
                  </div>
                ) : currentStudents.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className={combine(
                      "inline-block p-3 rounded-full mb-3",
                      theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                    )}>
                      <FaUserGraduate className={combine(
                        "text-xl",
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                      )} />
                    </div>
                    <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No students found</h3>
                    <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                      {searchTerm || filterGender !== 'all' || filterClass !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Add your first student to get started'}
                    </p>
                  </div>
                ) : (
                  <>
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={combine(
                        "bg-[var(--color-bg-secondary)]",
                        "divide-y",
                        get('border', 'primary'), // Adjust this top value as needed
                      )}>
                        <tr>
                          <th
                            className={combine(
                              "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors",
                              get('text', 'tertiary'),
                              "hover:bg-[var(--color-bg-hover)] bg-[var(--color-bg-secondary)]"
                            )}
                            onClick={() => handleSort('student_name')}
                          >
                            <div className="flex items-center space-x-2">
                              <FaUserGraduate className="text-xs" />
                              <span className="text-xs">Student Details</span>
                              <div className="ml-1">
                                {sortConfig.key === 'student_name' ? (
                                  sortConfig.direction === 'asc' ?
                                    <FaSortUp className={get('accent', 'primary') + " text-xs"} /> :
                                    <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                                ) : (
                                  <FaSort className={get('icon', 'secondary') + " text-xs"} />
                                )}
                              </div>
                            </div>
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary'),
                            "bg-[var(--color-bg-secondary)]"
                          )}>
                            <div className="flex items-center space-x-2">
                              <MdOutlineFamilyRestroom className="text-xs" />
                              <span className="text-xs">Family Info</span>
                            </div>
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary'),
                            "bg-[var(--color-bg-secondary)]"
                          )}>
                            <div className="flex items-center space-x-2">
                              <FaSchool className="text-xs" />
                              <span className="text-xs">Class & Contact</span>
                            </div>
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary'),
                            "bg-[var(--color-bg-secondary)]"
                          )}>
                            <div className="flex items-center space-x-2">
                              <FaChartBar className="text-xs" />
                              <span className="text-xs">Actions</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className={combine("divide-y", getTableRowClass())}>
                        {currentStudents.map((student) => (
                          <tr
                            key={student.student_id}
                            className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className={combine(
                                  "h-10 w-10 rounded-full flex items-center justify-center mr-3",
                                  student.gender === 'Male'
                                    ? theme === 'dark'
                                      ? 'bg-blue-900/30'
                                      : 'bg-blue-100'
                                    : theme === 'dark'
                                      ? 'bg-pink-900/30'
                                      : 'bg-pink-100'
                                )}>
                                  <FaUserGraduate className={
                                    student.gender === 'Male'
                                      ? theme === 'dark' ? 'text-blue-400 text-sm' : 'text-blue-600 text-sm'
                                      : theme === 'dark' ? 'text-pink-400 text-sm' : 'text-pink-600 text-sm'
                                  } />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className={combine("font-semibold text-sm", get('text', 'primary'))}>
                                      {student.student_name}
                                    </h4>
                                    <span className={getStatusBadgeClass(student.gender === 'Male' ? 'blue' : 'pink')}>
                                      {student.gender}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-3 mt-1">
                                    <span className={combine("text-xs flex items-center space-x-1", get('text', 'tertiary'))}>
                                      <FaIdCard className="text-xs" />
                                      <span className="text-xs">{student.student_id}</span>
                                    </span>
                                    {student.date_of_birth && (
                                      <span className={combine("text-xs flex items-center space-x-1", get('text', 'tertiary'))}>
                                        <FaCalendar className="text-xs" />
                                        <span className="text-xs">{calculateAge(student.date_of_birth)} yrs</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1.5">
                                <div>
                                  <p className={combine("text-xs", get('text', 'tertiary'))}>Father</p>
                                  <p className={combine("font-medium text-sm", get('text', 'primary'))}>{student.father_name}</p>
                                  {student.father_phone && (
                                    <p className={combine("text-xs flex items-center space-x-1 mt-0.5", get('text', 'tertiary'))}>
                                      <FaPhone className="text-xs" />
                                      <span className="text-xs">{student.father_phone}</span>
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className={combine("text-xs", get('text', 'tertiary'))}>Mother</p>
                                  <p className={combine("font-medium text-sm", get('text', 'primary'))}>{student.mother_name}</p>
                                  {student.mother_phone && (
                                    <p className={combine("text-xs flex items-center space-x-1 mt-0.5", get('text', 'tertiary'))}>
                                      <FaPhone className="text-xs" />
                                      <span className="text-xs">{student.mother_phone}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1.5">
                                <div>
                                  <p className={combine("text-xs", get('text', 'tertiary'))}>Class & Section</p>
                                  <div className="flex items-center space-x-2">
                                    <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                                      {student.class_name || 'Not Assigned'}
                                    </span>
                                    {student.section && (
                                      <span className={getStatusBadgeClass('emerald')}>
                                        Section {student.section}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {student.student_email && (
                                  <div>
                                    <p className={combine("text-xs", get('text', 'tertiary'))}>Email</p>
                                    <p className={combine("text-xs truncate max-w-[180px]", get('text', 'primary'))}>
                                      {student.student_email}
                                    </p>
                                  </div>
                                )}
                                {student.address && (
                                  <div>
                                    <p className={combine("text-xs", get('text', 'tertiary'))}>Address</p>
                                    <p className={combine("text-xs truncate max-w-[180px]", get('text', 'secondary'))}>
                                      {student.address}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-1.5">
                                <button
                                  onClick={() => viewStudentDetails(student.student_id)}
                                  className={combine(
                                    "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                    get('icon', 'primary') + " text-sm"
                                  )}
                                  title="View Details"
                                >
                                  <FaEye className="text-sm" />
                                </button>
                                <button
                                  onClick={() => startEdit(student)}
                                  className={combine(
                                    "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                    get('icon', 'primary') + " text-sm"
                                  )}
                                  title="Edit"
                                >
                                  <FaEdit className="text-sm" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(student.student_id)}
                                  className={combine(
                                    "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                    get('icon', 'primary') + " text-sm"
                                  )}
                                  title="Delete"
                                >
                                  <FaTrash className="text-sm" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* PAGINATION */}
                    {totalPages > 1 && (
                      <div className={combine("px-4 py-3 border-t", get('border', 'primary'))}>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                          <p className={combine("text-xs", get('text', 'tertiary'))}>
                            Page {currentPage} of {totalPages}
                          </p>
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className={combine(
                                "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                                getSecondaryButtonClass()
                              )}
                            >
                              <FaChevronLeft className="text-xs" />
                            </button>

                            <div className="flex space-x-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }

                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={combine(
                                      "px-3 py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                      currentPage === pageNum
                                        ? getPrimaryButtonClass()
                                        : getSecondaryButtonClass()
                                    )}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className={combine(
                                "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                                getSecondaryButtonClass()
                              )}
                            >
                              <FaChevronRight className="text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ADD/EDIT FORM */}
        {(mode === 'add' || mode === 'edit') && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className={getCardGradientClass()}>
              {/* Form Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={combine(
                      "p-2 rounded-xl",
                      theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                    )}>
                      <FaUserPlus className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      )} />
                    </div>
                    <div>
                      <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                        {mode === 'edit' ? 'Edit Student' : 'Add New Student'}
                      </h2>
                      <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                        {mode === 'edit' ? 'Update student information' : 'Fill in the details to register a new student'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMode('list');
                      setFormData({
                        student_id: '',
                        student_name: '',
                        student_email: '',
                        father_name: '',
                        mother_name: '',
                        father_phone: '',
                        mother_phone: '',
                        date_of_birth: '',
                        gender: 'Male',
                        class_name: '',
                        section: '',
                        address: '',
                      });
                    }}
                    className={combine(
                      "p-1.5 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                      get('icon', 'secondary') + " text-sm"
                    )}
                  >
                    <FaTimesCircle className="text-sm" />
                  </button>
                </div>
                <div className={combine(
                  "p-2 rounded-xl text-xs",
                  theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                )}>
                  <p className={combine(
                    "flex items-center space-x-2",
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  )}>
                    <FaInfoCircle className="text-xs" />
                    <span className="text-xs">Fields marked with * are required</span>
                  </p>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Student ID */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <FaIdCard className="inline mr-1.5 text-sm" />
                      Student ID *
                    </label>
                    <input
                      type="text"
                      name="student_id"
                      value={formData.student_id}
                      onChange={handleChange}
                      required
                      disabled={mode === 'edit'}
                      className={combine(getInputClass(), "disabled:opacity-50")}
                      placeholder="STU001"
                    />
                  </div>

                  {/* Student Name */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <FaUser className="inline mr-1.5 text-sm" />
                      Student Name *
                    </label>
                    <input
                      type="text"
                      name="student_name"
                      value={formData.student_name}
                      onChange={handleChange}
                      required
                      className={getInputClass()}
                      placeholder="John Doe"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <FaEnvelope className="inline mr-1.5 text-sm" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="student_email"
                      value={formData.student_email}
                      onChange={handleChange}
                      className={getInputClass()}
                      placeholder="student@example.com"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <FaVenusMars className="inline mr-1.5 text-sm" />
                      Gender *
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      required
                      className={getInputClass()}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <FaCalendar className="inline mr-1.5 text-sm" />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      className={getInputClass()}
                    />
                  </div>

                  {/* Father's Name */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <FaUser className="inline mr-1.5 text-sm" />
                      Father's Name *
                    </label>
                    <input
                      type="text"
                      name="father_name"
                      value={formData.father_name}
                      onChange={handleChange}
                      required
                      className={getInputClass()}
                      placeholder="Father's full name"
                    />
                  </div>

                  {/* Mother's Name */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <FaUser className="inline mr-1.5 text-sm" />
                      Mother's Name *
                    </label>
                    <input
                      type="text"
                      name="mother_name"
                      value={formData.mother_name}
                      onChange={handleChange}
                      required
                      className={getInputClass()}
                      placeholder="Mother's full name"
                    />
                  </div>

                  {/* Father's Phone */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <FaPhone className="inline mr-1.5 text-sm" />
                      Father's Phone
                    </label>
                    <input
                      type="tel"
                      name="father_phone"
                      value={formData.father_phone}
                      onChange={handleChange}
                      className={getInputClass()}
                      placeholder="+91 9876543210"
                    />
                  </div>

                  {/* Mother's Phone */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <FaPhone className="inline mr-1.5 text-sm" />
                      Mother's Phone
                    </label>
                    <input
                      type="tel"
                      name="mother_phone"
                      value={formData.mother_phone}
                      onChange={handleChange}
                      className={getInputClass()}
                      placeholder="+91 9876543210"
                    />
                  </div>

                  {/* Class */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <FaSchool className="inline mr-1.5 text-sm" />
                      Class
                    </label>
                    <input
                      type="text"
                      name="class_name"
                      value={formData.class_name}
                      onChange={handleChange}
                      className={getInputClass()}
                      placeholder="e.g., 10"
                    />
                  </div>

                  {/* Section */}
                  <div>
                    <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      <MdClass className="inline mr-1.5 text-sm" />
                      Section
                    </label>
                    <input
                      type="text"
                      name="section"
                      value={formData.section}
                      onChange={handleChange}
                      className={getInputClass()}
                      placeholder="e.g., A"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                    <FaMapMarkerAlt className="inline mr-1.5 text-sm" />
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={2}
                    className={combine(getInputClass(), "resize-none")}
                    placeholder="Full address"
                  />
                </div>

                {/* Form Actions */}
                <div className={combine("flex space-x-2 pt-4 border-t", get('border', 'primary'))}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('list');
                      setFormData({
                        student_id: '',
                        student_name: '',
                        student_email: '',
                        father_name: '',
                        mother_name: '',
                        father_phone: '',
                        mother_phone: '',
                        date_of_birth: '',
                        gender: 'Male',
                        class_name: '',
                        section: '',
                        address: '',
                      });
                    }}
                    className={combine(getSecondaryButtonClass(), "text-sm")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className={combine(
                          "animate-spin rounded-full h-4 w-4 border-b-2",
                          theme === 'dark' ? 'border-white' : 'border-white'
                        )}></div>
                        <span className="text-sm">{mode === 'edit' ? 'Updating...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        <span className="text-sm">{mode === 'edit' ? 'Update Student' : 'Save Student'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STUDENT DETAILS MODAL */}
        {showStudentModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass(),
              "max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            )}>
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaUserGraduate className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                  <div>
                    <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Student Details</h3>
                    <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                      Complete information about {selectedStudent.student_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className={combine(
                    "p-1.5 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                    get('icon', 'secondary') + " text-sm"
                  )}
                >
                  <FaTimesCircle className="text-sm" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Personal Information */}
                <div className={combine(
                  "rounded-xl p-4 border",
                  theme === 'dark' ? 'from-gray-800/50 to-gray-800/30' : 'from-blue-50 to-blue-100/30',
                  theme === 'dark' ? 'border-gray-700' : 'border-blue-200',
                  "bg-gradient-to-br"
                )}>
                  <h4 className={combine("font-semibold text-sm mb-3 flex items-center space-x-2", get('text', 'primary'))}>
                    <FaUser className={theme === 'dark' ? 'text-blue-400 text-sm' : 'text-blue-500 text-sm'} />
                    <span className="text-sm">Personal Information</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Student ID</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedStudent.student_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Full Name</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedStudent.student_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Gender</span>
                      <span className={getStatusBadgeClass(selectedStudent.gender === 'Male' ? 'blue' : 'pink')}>
                        {selectedStudent.gender}
                      </span>
                    </div>
                    {selectedStudent.date_of_birth && (
                      <div className="flex justify-between">
                        <span className={combine("text-xs", get('text', 'tertiary'))}>Date of Birth</span>
                        <span className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedStudent.date_of_birth}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Information */}
                <div className={combine(
                  "rounded-xl p-4 border",
                  theme === 'dark' ? 'from-gray-800/50 to-gray-800/30' : 'from-emerald-50 to-emerald-100/30',
                  theme === 'dark' ? 'border-gray-700' : 'border-emerald-200',
                  "bg-gradient-to-br"
                )}>
                  <h4 className={combine("font-semibold text-sm mb-3 flex items-center space-x-2", get('text', 'primary'))}>
                    <FaSchool className={theme === 'dark' ? 'text-emerald-400 text-sm' : 'text-emerald-500 text-sm'} />
                    <span className="text-sm">Academic Information</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Class</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                        {selectedStudent.class_name || 'Not Assigned'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Section</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                        {selectedStudent.section || 'Not Assigned'}
                      </span>
                    </div>
                    {selectedStudent.student_email && (
                      <div className="flex justify-between">
                        <span className={combine("text-xs", get('text', 'tertiary'))}>Email</span>
                        <span className={combine("font-medium text-sm", get('accent', 'primary'))}>
                          {selectedStudent.student_email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parent Information */}
                <div className={combine(
                  "rounded-xl p-4 border",
                  theme === 'dark' ? 'from-gray-800/50 to-gray-800/30' : 'from-purple-50 to-purple-100/30',
                  theme === 'dark' ? 'border-gray-700' : 'border-purple-200',
                  "bg-gradient-to-br"
                )}>
                  <h4 className={combine("font-semibold text-sm mb-3 flex items-center space-x-2", get('text', 'primary'))}>
                    <MdOutlineFamilyRestroom className={theme === 'dark' ? 'text-purple-400 text-sm' : 'text-purple-500 text-sm'} />
                    <span className="text-sm">Parent Information</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Father's Name</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedStudent.father_name}</span>
                    </div>
                    {selectedStudent.father_phone && (
                      <div className="flex justify-between">
                        <span className={combine("text-xs", get('text', 'tertiary'))}>Father's Phone</span>
                        <span className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedStudent.father_phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Mother's Name</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedStudent.mother_name}</span>
                    </div>
                    {selectedStudent.mother_phone && (
                      <div className="flex justify-between">
                        <span className={combine("text-xs", get('text', 'tertiary'))}>Mother's Phone</span>
                        <span className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedStudent.mother_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className={combine(
                  "rounded-xl p-4 border",
                  theme === 'dark' ? 'from-gray-800/50 to-gray-800/30' : 'from-amber-50 to-amber-100/30',
                  theme === 'dark' ? 'border-gray-700' : 'border-amber-200',
                  "bg-gradient-to-br"
                )}>
                  <h4 className={combine("font-semibold text-sm mb-3 flex items-center space-x-2", get('text', 'primary'))}>
                    <FaMapMarkerAlt className={theme === 'dark' ? 'text-amber-400 text-sm' : 'text-amber-500 text-sm'} />
                    <span className="text-sm">Contact Information</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedStudent.address && (
                      <div>
                        <span className={combine("text-xs", get('text', 'tertiary'))}>Address</span>
                        <p className={combine("font-medium text-sm mt-0.5", get('text', 'primary'))}>{selectedStudent.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className={combine("flex space-x-2 pt-4 border-t", get('border', 'primary'))}>
                <button
                  onClick={() => {
                    startEdit(selectedStudent);
                    setShowStudentModal(false);
                  }}
                  className={combine(
                    getPrimaryButtonClass(),
                    "flex items-center space-x-2 text-sm",
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                  )}
                >
                  <FaEdit className="text-sm" />
                  <span className="text-sm">Edit Student</span>
                </button>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className={combine(getSecondaryButtonClass(), "text-sm")}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass(),
              "max-w-md w-full shadow-2xl"
            )}>
              <div className="text-center">
                <div className={combine(
                  "mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-3",
                  theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                )}>
                  <FaTrash className={combine(
                    "h-5 w-5",
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  )} />
                </div>
                <h3 className={combine("text-lg font-bold mb-1.5", get('text', 'primary'))}>Delete Student</h3>
                <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                  Are you sure you want to delete this student? This action cannot be undone.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className={combine(getSecondaryButtonClass(), "text-sm flex-1")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteStudent(showDeleteConfirm)}
                    className={combine(
                      getPrimaryButtonClass(),
                      "text-sm flex-1",
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                    )}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
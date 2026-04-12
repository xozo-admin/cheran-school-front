'use client';

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from 'react';
import { 
  FaMoneyBillWave,
  FaCreditCard,
  FaChartLine,
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaUserGraduate,
  FaBuilding,
  FaListAlt,
  FaRupeeSign,
  FaFileInvoiceDollar,
  FaPercentage,
  FaCalendarDay,
  FaHistory,
  FaPrint,
  FaFileExport,
  FaInfoCircle
} from 'react-icons/fa';
import { toast } from '@/lib/toast';

export default function FeeAssignment () {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    academic_year: '',
    class_name: '',
    fee_type: 'Tuition',
    amount: '',
    due_date: ''
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [years] = useState(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({length: 5}, (_, i) => `${currentYear - i}-${currentYear - i + 1}`);
  });
  const [feeTypes] = useState(['Tuition', 'Transport', 'Hostel', 'Library', 'Sports', 'Exam']);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await apiFetch('academics/standards/', {
        headers: {
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch('fees/assign/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Fee assigned successfully! ${result.students_affected} students affected`);
        setFormData({
          academic_year: '',
          class_name: '',
          fee_type: 'Tuition',
          amount: '',
          due_date: ''
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to assign fee');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FaCreditCard className="text-purple-600" />
          Assign Fee to Class
        </h3>
        <p className="text-gray-600">Assign fee structure to entire class</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year *
            </label>
            <select
              name="academic_year"
              value={formData.academic_year}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-purple-200 bg-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
            >
              <option value="">Select Year</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class *
            </label>
            <select
              name="class_name"
              value={formData.class_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-purple-200 bg-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.name}>Class {cls.name}</option>
              ))}
            </select>
          </div>

          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fee Type *
            </label>
            <select
              name="fee_type"
              value={formData.fee_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-purple-200 bg-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
            >
              {feeTypes.map(type => (
                <option key={type} value={type}>{type} Fee</option>
              ))}
            </select>
          </div>

          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (₹) *
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <FaRupeeSign />
              </div>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full pl-10 pr-4 py-3 border border-purple-200 bg-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="e.g., 35000"
              />
            </div>
          </div>

          <div className="group md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date *
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <FaCalendarAlt />
              </div>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-3 border border-purple-200 bg-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-purple-700 mb-1">Fee Assignment Summary</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Fee will be applied to all students in the class</span>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Assigning Fee...
                </>
              ) : (
                <>
                  <FaCreditCard />
                  Assign Fee to Class
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

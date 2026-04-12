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

export default function ApplyConcession ()  {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    academic_year: '',
    discounts: [{ fee_type: '', discount_amount: '' }]
  });
  const [result, setResult] = useState<any>(null);

  const [years] = useState(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({length: 5}, (_, i) => `${currentYear - i}-${currentYear - i + 1}`);
  });
  const [feeTypes] = useState(['Tuition', 'Transport', 'Hostel', 'Library', 'Sports', 'Exam']);

  const handleDiscountChange = (index: number, field: string, value: string) => {
    const newDiscounts = [...formData.discounts];
    newDiscounts[index] = { ...newDiscounts[index], [field]: value };
    setFormData({ ...formData, discounts: newDiscounts });
  };

  const addDiscount = () => {
    setFormData({
      ...formData,
      discounts: [...formData.discounts, { fee_type: '', discount_amount: '' }]
    });
  };

  const removeDiscount = (index: number) => {
    if (formData.discounts.length > 1) {
      const newDiscounts = formData.discounts.filter((_, i) => i !== index);
      setFormData({ ...formData, discounts: newDiscounts });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch('fees/concession/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        toast.success('Concession applied successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to apply concession');
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
          <FaPercentage className="text-orange-600" />
          Apply Fee Concession
        </h3>
        <p className="text-gray-600">Apply discounts and concessions to student fees</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student ID *
            </label>
            <input
              type="text"
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              required
              className="w-full px-4 py-3 border border-orange-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              placeholder="e.g., STU2024001"
            />
          </div>

          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              value={formData.academic_year}
              onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
              className="w-full px-4 py-3 border border-orange-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            >
              <option value="">Select Year (Optional)</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Discounts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Fee Discounts</h4>
            <button
              type="button"
              onClick={addDiscount}
              className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all text-sm font-medium flex items-center gap-2"
            >
              {/* <FaPlus className="text-xs" /> */}
              Add Discount
            </button>
          </div>

          {formData.discounts.map((discount, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee Type {index + 1}
                </label>
                <select
                  value={discount.fee_type}
                  onChange={(e) => handleDiscountChange(index, 'fee_type', e.target.value)}
                  className="w-full px-4 py-3 border border-orange-200 bg-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  <option value="">Select Type</option>
                  {feeTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Amount (₹)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <FaRupeeSign />
                  </div>
                  <input
                    type="number"
                    value={discount.discount_amount}
                    onChange={(e) => handleDiscountChange(index, 'discount_amount', e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 border border-orange-200 bg-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Amount"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => removeDiscount(index)}
                  disabled={formData.discounts.length <= 1}
                  className="px-4 py-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors font-medium flex-1 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-xl p-5 border border-orange-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-orange-700 mb-1">Concession Summary</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  {formData.discounts.length} fee type{formData.discounts.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Applying...
                </>
              ) : (
                <>
                  <FaPercentage />
                  Apply Concession
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl p-5 border border-emerald-200">
          <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <FaCheckCircle />
            Concession Application Results
          </h4>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Student:</span> {result.student}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Academic Year:</span> {result.academic_year || 'All Years'}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-emerald-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      Fee Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      Original Total
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      Concession Applied
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      New Due
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {result.report.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {item.fee_type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'Success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        ₹{parseFloat(item.original_total || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-orange-600">
                          ₹{parseFloat(item.concession_applied || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-bold ${
                          parseFloat(item.new_due || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          ₹{parseFloat(item.new_due || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

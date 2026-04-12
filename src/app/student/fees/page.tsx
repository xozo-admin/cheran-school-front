// app/student/fees/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  FaMoneyBillWave,
  FaCreditCard,
  FaReceipt,
  FaDownload,
  FaPrint,
  FaHistory,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaRupeeSign,
  FaWallet,
  FaQrcode,
  FaCopy,
  FaEye,
  FaUserGraduate,
  FaShieldAlt,
  FaLock,
  FaSpinner,
  FaExternalLinkAlt,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaTags,
  FaUniversity,
  FaFileInvoiceDollar,
  FaPercent,
  FaCheckDouble,
  FaHourglassHalf,
  FaBan,
  FaEyeSlash,
  FaPlus,
  FaMinus,
  FaInfoCircle,
  FaSync,
  FaTimes,
  FaCheck,
  FaFilePdf,
  FaFileCsv,
  FaArrowLeft,
  FaArrowRight,
} from 'react-icons/fa';
import { FiDownload, FiFilter } from 'react-icons/fi';
import { MdClass, MdOutlineDashboard, MdPayment, MdAttachMoney, MdAccountBalance, MdOutlineReceipt } from 'react-icons/md';
import { toastError, toastSuccess, toastInfo, toastWarning, toastPromise } from '@/lib/toast';
import { studentApi } from '@/lib/api';
import { loadRazorpayScript, openRazorpayCheckout, formatCurrency, RazorpayOptions } from '@/lib/razorpay';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { format, parseISO } from 'date-fns';

// Types
interface StudentProfile {
  student_id: string;
  student_name: string;
  class_name: string;
  section_name: string;
  email?: string;
  phone?: string;
  father_name?: string;
  mother_name?: string;
  address?: string;
  date_of_birth?: string;
  gender?: string;
}

interface PaymentSummary {
  id?: number;
  date: string;
  payment_datetime?: string;
  amount: number;
  installment_number?: number;
  mode: string;
  transaction_id: string;
}

interface StudentFeeRecord {
  fee_id: number;
  academic_year: string;
  fee_type: string;
  class: string;
  total_amount: number;
  concession: number;
  paid_amount: number;
  due_amount: number;
  effective_total: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
  installment_count?: number;
  installment_amount?: number;
  installments_paid_count?: number;
  installments_remaining_count?: number;
  next_installment_number?: number;
  next_installment_amount?: number;
  due_date: string;
  last_payment_date: string | null;
  payments: PaymentSummary[];
}

interface StudentFeeSummary {
  student: {
    id: string;
    name: string;
    class: string;
    section: string;
  };
  summary: {
    total_fee: number;
    total_concession: number;
    total_paid: number;
    total_due: number;
    records_count: number;
    paid_count: number;
    partial_count: number;
    unpaid_count: number;
  };
  fee_records: StudentFeeRecord[];
}

interface FeeReceipt {
  id: number;
  student_id: string;
  student_name: string;
  student_class: string;
  student_section: string;
  fee_type: string;
  academic_year: string;
  transaction_id: string;
  payment_mode: string;
  payment_mode_display: string;
  payment_date: string;
  amount_paid: number;
  total_fee: number;
  concession_amount: number;
  balance_due: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
  payment_status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED' | 'REFUND_PENDING';
  payment_status_display: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  remarks?: string;
}

interface PaymentInitiationResponse {
  status: number;
  payment_id: number;
  order_id: string;
  amount: number;
  installment_number?: number;
  installment_count?: number;
  next_installment_amount?: number;
  currency: string;
  key_id: string;
  student_name: string;
  student_email?: string;
  student_phone?: string;
  description: string;
  gateway_mode: 'DUMMY' | 'REAL';
  return_url?: string;
}

const MIN_PAYMENT_AMOUNT = 10;

const getNextPayableAmount = (fee: StudentFeeRecord) => {
  const installmentAmount = Number(fee.next_installment_amount ?? 0);
  if (installmentAmount > 0) {
    return installmentAmount;
  }
  return Number(fee.due_amount ?? 0);
};

const getFullDueAmount = (fee: StudentFeeRecord) => Number(fee.due_amount ?? 0);

const canChooseFullDuePayment = (fee: StudentFeeRecord) => {
  const nextAmount = getNextPayableAmount(fee);
  const dueAmount = getFullDueAmount(fee);
  return (fee.installment_count || 1) > 1 && dueAmount > nextAmount;
};

export default function FeesPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<FeeReceipt[]>([]);
  const [feeSummary, setFeeSummary] = useState<StudentFeeSummary | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchTransactionId, setSearchTransactionId] = useState('');
  const [selectedFeeType, setSelectedFeeType] = useState<string>('');
  const [paymentChoice, setPaymentChoice] = useState<'INSTALLMENT' | 'FULL'>('INSTALLMENT');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentProfile | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ============ THEME CLASSES ============

  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'green', solid: boolean = false) => {
    const baseClasses = combine(
      'rounded-2xl p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    if (solid) {
      return combine(baseClasses, get('bg', 'card'));
    }

    if (color === 'green') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-green-900/10'
        : 'from-white to-green-50');
    }
    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-purple-900/10'
        : 'from-white to-purple-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50');
    }
    if (color === 'indigo') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50');
    }
    if (color === 'red') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-red-900/10'
        : 'from-white to-red-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getStatsCardClass = (color: 'green' | 'blue' | 'purple' | 'amber' | 'indigo' | 'red' = 'green') => {
    return getCardGradientClass(color);
  };

  const getInputClass = () => combine(
    'px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all w-full',
    'text-sm',
    'border',
    theme === 'dark'
      ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500',
    'placeholder:text-sm',
    'hover:border-[var(--color-border-strong)]',
    'focus:border-[var(--color-accent-primary)]'
  );

  const getPrimaryButtonClass = (color: string = 'green') => combine(
    'px-6 py-3.5 rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
    'text-sm',
    theme === 'dark'
      ? `bg-gradient-to-r from-${color}-600 to-${color}-700 hover:from-${color}-700 hover:to-${color}-800`
      : `bg-gradient-to-r from-${color}-500 to-${color}-600 hover:from-${color}-600 hover:to-${color}-700`
  );

  const getSecondaryButtonClass = () => combine(
    'px-4 py-3 rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    'text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getModalCardClass = () => combine(
    'rounded-2xl p-6 border shadow-2xl',
    theme === 'dark'
      ? 'bg-gray-900 border-gray-700'
      : 'bg-white border-gray-200'
  );

  const getStatusBadge = (status: string) => {
    const colorMap: { [key: string]: string } = {
      PAID: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200',
      PARTIAL: theme === 'dark' ? 'bg-amber-900/30 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200',
      UNPAID: theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200',
      OVERDUE: theme === 'dark' ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-100 text-red-700 border-red-200',
      PENDING: theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200',
      SUCCESS: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200',
      FAILED: theme === 'dark' ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-100 text-red-700 border-red-200',
      INITIATED: theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200',
      REFUNDED: theme === 'dark' ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-700 border-purple-200',
      REFUND_PENDING: theme === 'dark' ? 'bg-orange-900/30 text-orange-300 border-orange-800' : 'bg-orange-100 text-orange-700 border-orange-200',
    };

    const classes = combine(
      'px-3 py-1.5 text-sm font-medium rounded-full border inline-flex items-center gap-1.5',
      colorMap[status] || colorMap.UNPAID
    );

    return <span className={classes}>{status}</span>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <FaCheckCircle className="text-green-500" />;
      case 'PARTIAL':
        return <FaClock className="text-yellow-500" />;
      case 'UNPAID':
        return <FaClock className="text-gray-500" />;
      case 'OVERDUE':
        return <FaExclamationTriangle className="text-red-500" />;
      default:
        return <FaClock className="text-gray-500" />;
    }
  };

  const getPaymentModeBadge = (mode: string) => {
    const colorMap: { [key: string]: string } = {
      UPI: theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200',
      CASH: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200',
      NETBANKING: theme === 'dark' ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-700 border-purple-200',
      CHEQUE: theme === 'dark' ? 'bg-amber-900/30 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200',
      CARD: theme === 'dark' ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' : 'bg-indigo-100 text-indigo-700 border-indigo-200',
      DD: theme === 'dark' ? 'bg-orange-900/30 text-orange-300 border-orange-800' : 'bg-orange-100 text-orange-700 border-orange-200',
      ONLINE: theme === 'dark' ? 'bg-cyan-900/30 text-cyan-300 border-cyan-800' : 'bg-cyan-100 text-cyan-700 border-cyan-200',
      RAZORPAY: theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };

    const displayMode = mode.replace('_', ' ');
    const classes = combine(
      'px-2 py-1 text-xs font-medium rounded-full border inline-flex items-center gap-1',
      colorMap[mode] || colorMap.CASH
    );

    return <span className={classes}>{displayMode}</span>;
  };

  const getFeeTypeBadge = (feeType: string) => {
    const colorMap: { [key: string]: string } = {
      Tuition: theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200',
      Transport: theme === 'dark' ? 'bg-amber-900/30 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200',
      Library: theme === 'dark' ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-700 border-purple-200',
      Sports: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200',
      Lab: theme === 'dark' ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' : 'bg-indigo-100 text-indigo-700 border-indigo-200',
      Development: theme === 'dark' ? 'bg-pink-900/30 text-pink-300 border-pink-800' : 'bg-pink-100 text-pink-700 border-pink-200',
    };

    const defaultColor = theme === 'dark'
      ? 'bg-gray-700 text-gray-300 border-gray-600'
      : 'bg-gray-100 text-gray-700 border-gray-200';

    const classes = combine(
      'px-3 py-1.5 text-sm font-medium rounded-full border inline-flex items-center gap-1.5',
      colorMap[feeType] || defaultColor
    );

    return <span className={classes}>{feeType}</span>;
  };

  // ============ API CALLS ============

  // Fetch fee summary and payment history
  const fetchFeeData = async () => {
    try {
      setLoading(true);

      // Get student profile first
      const profileResponse = await studentApi.profile.get();
      const profileData = profileResponse.data;
      setStudentInfo(profileData.data);

      console.log("Student Profile:", profileData);

      // Fetch fee summary with correct params
      const summaryResponse = await studentApi.fees.summary({
        academic_year: '2025-2026',
        student_id: profileData.data.student_id
      });

      console.log("Fee Summary Response:", summaryResponse.data);
      const summaryData = summaryResponse.data;
      setFeeSummary(summaryData);

      // Extract payment history from fee records
      const allPayments: FeeReceipt[] = [];

      if (summaryData?.fee_records) {
        summaryData.fee_records.forEach((record: any) => {
          if (record.payments && record.payments.length > 0) {
            record.payments.forEach((payment: any) => {
              allPayments.push({
                id: payment.id || 0,
                student_id: profileData.data.student_id,
                student_name: profileData.data.student_name,
                student_class: record.class,
                student_section: profileData.data.section_name,
                fee_type: record.fee_type,
                academic_year: record.academic_year,
                transaction_id: payment.transaction_id,
                payment_mode: payment.mode,
                payment_mode_display: payment.mode,
                payment_date: payment.payment_datetime || payment.date,
                amount_paid: payment.amount,
                total_fee: record.total_amount,
                concession_amount: record.concession || 0,
                balance_due: record.due_amount,
                status: record.status,
                payment_status: 'SUCCESS',
                payment_status_display: 'Success',
              });
            });
          }
        });
      }

      // Sort by date (newest first)
      setPaymentHistory(allPayments.sort((a, b) =>
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      ));

    } catch (error) {
      console.error('Error fetching fee data:', error);
      toastError('Failed to load fee information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Current feeSummary:", feeSummary);
    console.log("Current paymentHistory:", paymentHistory);
    console.log("Available fee records:", feeSummary?.fee_records);
  }, [feeSummary, paymentHistory]);

  useEffect(() => {
    fetchFeeData();
  }, []);

  // Helper functions for payment processing
  const initiateRazorpayPayment = async (
    studentId: string,
    className: string,
    feeType: string,
    amount: number
  ): Promise<PaymentInitiationResponse> => {
    try {
      const requestData = {
        student_id: studentId,
        class_name: className,
        fee_type: feeType,
        amount: amount,
        payment_mode: 'RAZORPAY',
        return_url: `${window.location.origin}/fees/callback`,
        academic_year: '2025-2026'
      };

      console.log("Initiating payment with data:", requestData);

      const response = await studentApi.fees.initiatePayment(requestData);
      console.log("Payment initiation response:", response);
      console.log("Response data:", response.data);

      return response.data;
    } catch (error: any) {
      console.error("Full error object:", error);
      if (error.response) {
        console.error("Error data:", error.response.data);
        console.error("Error status:", error.response.status);
        console.error("Error headers:", error.response.headers);

        const errorMessage = error.response.data?.error ||
          error.response.data?.detail ||
          error.response.data?.message ||
          'Payment initiation failed';
        toastError(errorMessage);
      } else if (error.request) {
        console.error("No response received:", error.request);
        toastError('No response from server. Please check your connection.');
      } else {
        console.error("Error message:", error.message);
        toastError(error.message);
      }
      throw error;
    }
  };

  const verifyPayment = async (
    orderId: string,
    paymentId: string,
    signature: string
  ) => {
    try {
      const response = await studentApi.fees.verifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  };

  const cancelPayment = async (orderId: string) => {
    try {
      await studentApi.fees.cancelPayment({
        razorpay_order_id: orderId,
        reason: 'Payment cancelled by user from checkout',
      });
    } catch (error) {
      console.error('Error cancelling payment:', error);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!selectedFeeType || !studentInfo) return;

    const selectedFee = feeSummary?.fee_records.find(
      f => f.fee_type === selectedFeeType
    );

    if (!selectedFee) {
      toastError('Selected fee type not found');
      return;
    }

    const amountToPay = paymentChoice === 'FULL'
      ? getFullDueAmount(selectedFee)
      : getNextPayableAmount(selectedFee);
    if (amountToPay < MIN_PAYMENT_AMOUNT) {
      toastError(`Minimum payment amount is ₹${MIN_PAYMENT_AMOUNT}`);
      return;
    }

    setProcessingPayment(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toastError('Failed to load payment gateway');
        setProcessingPayment(false);
        return;
      }

      // Initiate payment
      const paymentData = await initiateRazorpayPayment(
        studentInfo.student_id,
        selectedFee.class,
        selectedFeeType,
        amountToPay
      );

      console.log('Payment initiated:', paymentData);

      let paymentHandled = false;

      // Configure Razorpay options with tracking disabled
      const options = {
        key: paymentData.key_id,
        amount: paymentData.amount * 100,
        currency: paymentData.currency,
        name: 'School Fee Payment',
        description: paymentData.description || `${selectedFeeType} Fee Payment`,
        order_id: paymentData.order_id,
        handler: async (response: any) => {
          paymentHandled = true;
          try {
            const verificationResult = await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            if (verificationResult.status === 200) {
              toastSuccess('Payment successful!');
              setShowPaymentModal(false);
              await fetchFeeData();
              setSelectedReceipt(verificationResult.receipt);
              setShowReceiptModal(true);
            }
          } catch (error) {
            console.error('Verification failed:', error);
            toastError('Payment verification failed');
          } finally {
            setProcessingPayment(false);
          }
        },
        prefill: {
          name: studentInfo.student_name,
          email: studentInfo.email || '',
          contact: studentInfo.phone || '',
        },
        notes: {
          student_id: studentInfo.student_id,
          fee_type: selectedFeeType,
          class: selectedFee.class,
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: async () => {
            if (!paymentHandled) {
              await cancelPayment(paymentData.order_id);
            }
            setProcessingPayment(false);
            toastInfo('Payment cancelled');
          },
        },
        // 🔥 ADD THESE OPTIONS TO DISABLE TRACKING
        retry: {
          enabled: true,
          max_count: 3,
        },
        remember_customer: false,  // Disable customer tracking
        send_sms_hash: false,       // Disable SMS tracking
        allow_rotation: false,      // Disable screen rotation tracking
        config: {
          display: {
            // Hide biometric collection
            blocks: {
              banks: {
                name: 'Pay using',
                instruments: [
                  {
                    method: 'card'
                  },
                  {
                    method: 'netbanking'
                  },
                  {
                    method: 'upi'
                  },
                  {
                    method: 'wallet'
                  }
                ]
              }
            },
            // Disable biometrics
            preferences: {
              show_default_blocks: true
            }
          }
        }
      };

      // Create and open Razorpay instance
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Payment error:', error);
      toastError(error.message || 'Payment failed');
      setProcessingPayment(false);
    }
  };

  const handleGetReceipt = async () => {
    if (!searchTransactionId.trim()) {
      toastError('Please enter a transaction ID');
      return;
    }

    try {
      const response = await studentApi.fees.receipt({ transaction_id: searchTransactionId });
      setSelectedReceipt(response.data.receipt);
      setShowReceiptModal(true);
      setSearchTransactionId('');
    } catch (error) {
      console.error('Receipt error:', error);
      toastError('Receipt not found. Please check transaction ID.');
    }
  };

  const handleDownloadReceipt = async (receipt: FeeReceipt) => {
    try {
      await toastPromise(
        new Promise((resolve) => setTimeout(resolve, 1500)),
        {
          pending: 'Generating receipt...',
          success: 'Receipt downloaded successfully',
          error: 'Failed to download receipt',
        }
      );

      // Create a JSON file for download (replace with actual PDF generation)
      const content = JSON.stringify(receipt, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${receipt.transaction_id}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toastError('Failed to download receipt');
    }
  };

  const handlePrintReceipt = (receipt: FeeReceipt) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Fee Receipt - ${receipt.transaction_id}</title>
            <style>
              body { 
                font-family: 'Arial', sans-serif; 
                padding: 40px; 
                background: #f3f4f6;
                margin: 0;
              }
              .receipt-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                overflow: hidden;
              }
              .receipt-header {
                background: linear-gradient(135deg, #2563eb, #1e40af);
                color: white;
                padding: 30px;
                text-align: center;
              }
              .receipt-header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
              }
              .receipt-header p {
                margin: 5px 0 0;
                opacity: 0.9;
              }
              .receipt-body {
                padding: 30px;
              }
              .section {
                background: #f9fafb;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
              }
              .section-title {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin: 0 0 15px 0;
                padding-bottom: 10px;
                border-bottom: 2px solid #e5e7eb;
              }
              .details-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
              }
              .detail-item {
                margin-bottom: 10px;
              }
              .detail-label {
                font-size: 12px;
                color: #6b7280;
                margin-bottom: 4px;
              }
              .detail-value {
                font-size: 16px;
                font-weight: 500;
                color: #1f2937;
              }
              .amount-breakdown {
                background: linear-gradient(135deg, #eff6ff, #dbeafe);
                border-radius: 12px;
                padding: 20px;
              }
              .amount-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #bfdbfe;
              }
              .amount-row:last-child {
                border-bottom: none;
              }
              .total-row {
                font-size: 20px;
                font-weight: bold;
                color: #059669;
                padding-top: 15px;
              }
              .status-badge {
                display: inline-block;
                padding: 8px 24px;
                border-radius: 9999px;
                font-weight: 600;
                font-size: 16px;
                background: ${receipt.status === 'PAID' ? '#d1fae5' : '#fee2e2'};
                color: ${receipt.status === 'PAID' ? '#065f46' : '#991b1b'};
              }
              .footer {
                text-align: center;
                padding: 20px;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 12px;
              }
              .transaction-id {
                font-family: monospace;
                background: #f3f4f6;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 14px;
              }
              @media print {
                body { background: white; padding: 0; }
                .receipt-container { box-shadow: none; }
              }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              <div class="receipt-header">
                <h1>🏫 School Name</h1>
                <p>Fee Payment Receipt</p>
                <p class="transaction-id">${receipt.transaction_id}</p>
              </div>
              
              <div class="receipt-body">
                <div class="section">
                  <h2 class="section-title">Student Details</h2>
                  <div class="details-grid">
                    <div class="detail-item">
                      <div class="detail-label">Name</div>
                      <div class="detail-value">${receipt.student_name}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Student ID</div>
                      <div class="detail-value">${receipt.student_id}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Class & Section</div>
                      <div class="detail-value">${receipt.student_class} - ${receipt.student_section}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Academic Year</div>
                      <div class="detail-value">${receipt.academic_year}</div>
                    </div>
                  </div>
                </div>

                <div class="section">
                  <h2 class="section-title">Payment Details</h2>
                  <div class="details-grid">
                    <div class="detail-item">
                      <div class="detail-label">Fee Type</div>
                      <div class="detail-value">${receipt.fee_type}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Payment Mode</div>
                      <div class="detail-value">${receipt.payment_mode_display}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Payment Date</div>
                      <div class="detail-value">${new Date(receipt.payment_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })}</div>
                    </div>
                    ${receipt.razorpay_payment_id ? `
                    <div class="detail-item">
                      <div class="detail-label">Razorpay ID</div>
                      <div class="detail-value transaction-id">${receipt.razorpay_payment_id}</div>
                    </div>
                    ` : ''}
                  </div>
                </div>

                <div class="amount-breakdown">
                  <h2 class="section-title" style="margin-top: 0;">Amount Breakdown</h2>
                  <div class="amount-row">
                    <span>Total Fee</span>
                    <span style="font-weight: 500;">${formatCurrency(receipt.total_fee)}</span>
                  </div>
                  ${receipt.concession_amount > 0 ? `
                  <div class="amount-row" style="color: #059669;">
                    <span>Concession</span>
                    <span>- ${formatCurrency(receipt.concession_amount)}</span>
                  </div>
                  ` : ''}
                  <div class="amount-row total-row">
                    <span>Amount Paid</span>
                    <span>${formatCurrency(receipt.amount_paid)}</span>
                  </div>
                  <div class="amount-row" style="${receipt.balance_due > 0 ? 'color: #dc2626;' : 'color: #059669;'}">
                    <span>Balance Due</span>
                    <span>${formatCurrency(receipt.balance_due)}</span>
                  </div>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <span class="status-badge">
                    ${receipt.status} PAYMENT
                  </span>
                </div>

                <div style="text-align: center; color: #6b7280; font-size: 14px;">
                  <p>This is a computer generated receipt. No signature required.</p>
                  <p style="margin-top: 5px;">For any queries, contact accounts@school.com</p>
                </div>
              </div>

              <div class="footer">
                <p>© ${new Date().getFullYear()} School Name. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const copyTransactionId = (id: string) => {
    navigator.clipboard.writeText(id);
    toastSuccess('Transaction ID copied to clipboard');
  };

  const calculateTotalFees = () => {
    return feeSummary?.summary.total_fee || 0;
  };

  const calculateTotalPaid = () => {
    return feeSummary?.summary.total_paid || 0;
  };

  const calculateBalanceDue = () => {
    return feeSummary?.summary.total_due || 0;
  };

  const calculateTotalConcession = () => {
    return feeSummary?.summary.total_concession || 0;
  };

  const isDueDatePassed = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const filteredFeeRecords = feeSummary?.fee_records.filter(record => {
    let matches = true;
    if (filterYear !== 'all' && record.academic_year !== filterYear) matches = false;
    if (filterStatus !== 'all' && record.status !== filterStatus) matches = false;
    return matches;
  });

  const filteredPaymentHistory = paymentHistory.filter(payment => {
    let matches = true;
    if (filterYear !== 'all' && payment.academic_year !== filterYear) matches = false;
    if (filterStatus !== 'all' && payment.status !== filterStatus) matches = false;
    return matches;
  });

  const uniqueYears = feeSummary?.fee_records 
    ? Array.from(new Set(feeSummary.fee_records.map(f => f.academic_year))) 
    : [];

  if (loading) {
    return (
      <div className={getBgClass()}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className={combine(
              "animate-spin rounded-full h-16 w-16 border-4 mx-auto mb-4",
              theme === 'dark' ? 'border-green-500 border-t-transparent' : 'border-green-600 border-t-transparent'
            )}></div>
            <p className={get('text', 'secondary')}>Loading your fee information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full">
        {/* ============ HEADER SECTION ============ */}
        <div className="mb-6">
          <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaMoneyBillWave className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">
                    Fee Management
                  </h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    <MdOutlineDashboard className="text-sm" />
                    View and manage your fee payments
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={fetchFeeData}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  <FaSync className={`text-sm ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <button
                  onClick={() => setShowFilterModal(true)}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium flex items-center gap-2 transition-colors"
                >
                  <FiFilter className="text-sm" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============ QUICK STATS ============ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <div className={getStatsCardClass('green')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Fees</p>
                  <p className={combine("text-lg md:text-xl font-bold mt-1", get('text', 'primary'))}>
                    ₹{calculateTotalFees().toLocaleString('en-IN')}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                )}>
                  <FaMoneyBillWave className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                {feeSummary?.fee_records.length || 0} fee types
              </div>
            </div>

            <div className={getStatsCardClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Paid</p>
                  <p className={combine("text-lg md:text-xl font-bold mt-1 text-green-600 dark:text-green-400")}>
                    ₹{calculateTotalPaid().toLocaleString('en-IN')}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaCheckCircle className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                {feeSummary?.summary.paid_count || 0} paid fees
              </div>
            </div>

            <div className={getStatsCardClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Due</p>
                  <p className={combine("text-lg md:text-xl font-bold mt-1 text-amber-600 dark:text-amber-400")}>
                    ₹{calculateBalanceDue().toLocaleString('en-IN')}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaClock className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                {feeSummary?.summary.unpaid_count || 0} pending
              </div>
            </div>

            <div className={getStatsCardClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Transactions</p>
                  <p className={combine("text-lg md:text-xl font-bold mt-1", get('text', 'primary'))}>
                    {paymentHistory.length}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaHistory className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                {paymentHistory.length} total payments
              </div>
            </div>
          </div>

          {/* Concession Summary (if any) */}
          {calculateTotalConcession() > 0 && (
            <div className={getStatsCardClass('green') + " mt-3"}>
              <div className="flex items-center gap-3">
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                )}>
                  <FaPercent className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  )} />
                </div>
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>
                    Total Concession Applied
                  </p>
                  <p className={combine("text-lg font-bold text-green-600 dark:text-green-400")}>
                    ₹{calculateTotalConcession().toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Student Info Card */}
          {studentInfo && (
            <div className={getStatsCardClass('indigo') + " mt-3"}>
              <div className="flex items-center gap-3">
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaUserGraduate className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
                <div>
                  <p className={combine("text-sm font-semibold", get('text', 'primary'))}>
                    {studentInfo.student_name}
                  </p>
                  <p className={combine("text-xs", get('text', 'tertiary'))}>
                    Class {studentInfo.class_name} - Section {studentInfo.section_name} | ID: {studentInfo.student_id}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============ MAIN CONTENT GRID ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Fee Structure */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fee Structure Section */}
            <div className={getCardGradientClass('green', true)}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                  )}>
                    <FaFileInvoiceDollar className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    )} />
                  </div>
                  <div>
                    <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                      Fee Structure
                    </h2>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      {filteredFeeRecords?.length || 0} fee types found
                    </p>
                  </div>
                </div>

                {calculateBalanceDue() > 0 && (
                  <button
                    onClick={() => {
                      setSelectedFeeType('');
                      setPaymentChoice('INSTALLMENT');
                      setShowPaymentModal(true);
                    }}
                    className={combine(getPrimaryButtonClass('green'), "flex items-center gap-2")}
                  >
                    <FaCreditCard className="text-sm" />
                    <span>Pay Now</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {filteredFeeRecords && filteredFeeRecords.length > 0 ? (
                  filteredFeeRecords.map((record) => {
                    const isOverdue = record.status === 'OVERDUE' ||
                      (record.status !== 'PAID' && isDueDatePassed(record.due_date));

                    return (
                      <div
                        key={record.fee_id}
                        className={combine(
                          "p-5 rounded-xl border transition-all hover:shadow-md",
                          isOverdue
                            ? theme === 'dark' ? 'bg-red-900/10 border-red-800' : 'bg-red-50 border-red-200'
                            : record.status === 'PAID'
                              ? theme === 'dark' ? 'bg-green-900/10 border-green-800' : 'bg-green-50 border-green-200'
                              : record.status === 'PARTIAL'
                                ? theme === 'dark' ? 'bg-amber-900/10 border-amber-800' : 'bg-amber-50 border-amber-200'
                                : theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                        )}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                          <div className="flex items-start gap-3">
                            <div className={combine(
                              "p-2 rounded-lg",
                              isOverdue
                                ? theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                                : record.status === 'PAID'
                                  ? theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                                  : record.status === 'PARTIAL'
                                    ? theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                                    : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                            )}>
                              <FaMoneyBillWave className={combine(
                                "text-lg",
                                isOverdue
                                  ? 'text-red-500'
                                  : record.status === 'PAID'
                                    ? 'text-green-500'
                                    : record.status === 'PARTIAL'
                                      ? 'text-amber-500'
                                      : 'text-gray-500'
                              )} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={combine("font-semibold text-lg", get('text', 'primary'))}>
                                  {record.fee_type}
                                </h3>
                                {getFeeTypeBadge(record.fee_type)}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 mt-1">
                                <span className={combine("text-xs", get('text', 'secondary'))}>
                                  <FaCalendarAlt className="inline mr-1 text-xs" />
                                  Year: {record.academic_year}
                                </span>
                                <span className={combine("text-xs", get('text', 'secondary'))}>
                                  <FaClock className="inline mr-1 text-xs" />
                                  Due: {format(new Date(record.due_date), 'dd MMM yyyy')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 md:mt-0 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <FaRupeeSign className={combine("text-sm", get('icon', 'secondary'))} />
                              <span className={combine("text-2xl font-bold", get('text', 'primary'))}>
                                {record.total_amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                            {record.concession > 0 && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Concession: -₹{record.concession.toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={get('text', 'secondary')}>Payment Progress</span>
                            <span className={combine("font-medium", get('text', 'primary'))}>
                              ₹{record.paid_amount.toLocaleString('en-IN')} / ₹{(record.total_amount - record.concession).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-300 ${isOverdue
                                  ? 'bg-red-500'
                                  : record.status === 'PAID'
                                    ? 'bg-green-500'
                                    : record.status === 'PARTIAL'
                                      ? 'bg-amber-500'
                                      : 'bg-gray-500'
                                }`}
                              style={{
                                width: `${Math.min(100, (record.paid_amount / (record.total_amount - record.concession)) * 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Recent Payments */}
                        {record.payments && record.payments.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className={combine("text-xs font-medium mb-2", get('text', 'primary'))}>
                              Recent Payments:
                            </p>
                            <div className="space-y-2">
                              {record.payments.slice(0, 3).map((payment, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className={get('text', 'tertiary')}>
                                    {format(new Date(payment.payment_datetime || payment.date), 'dd MMM yyyy')}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className={combine("font-medium", get('text', 'primary'))}>
                                      ₹{payment.amount.toLocaleString('en-IN')}
                                    </span>
                                    {getPaymentModeBadge(payment.mode)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(record.status)}
                            {isOverdue && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className={combine("text-lg font-bold", get('accent', 'warning'))}>
                            Due: ₹{record.due_amount.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {record.due_amount > 0 && record.status !== 'PAID' && (
                          <div className="mt-3">
                            <button
                              onClick={() => {
                                setSelectedFeeType(record.fee_type);
                                setPaymentChoice('INSTALLMENT');
                                setShowPaymentModal(true);
                              }}
                              className={combine(getPrimaryButtonClass('blue'), "w-full flex items-center justify-center gap-2 text-sm py-2.5")}
                            >
                              <FaCreditCard className="text-xs" />
                              <span>Pay Now</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <div className={combine(
                      "inline-block p-4 rounded-full mb-4",
                      theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                    )}>
                      <FaMoneyBillWave className={combine(
                        "text-3xl",
                        theme === 'dark' ? 'text-green-400' : 'text-green-500'
                      )} />
                    </div>
                    <h3 className={combine("text-lg font-medium mb-2", get('text', 'primary'))}>
                      No fee records found
                    </h3>
                    <p className={combine("text-sm mb-6 max-w-md mx-auto", get('text', 'secondary'))}>
                      There are no fee records available for your account.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment History */}
            <div className={getCardGradientClass('purple', true)}>
              <div className="flex items-center gap-3 mb-6">
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaHistory className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
                <div>
                  <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                    Payment History
                  </h2>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    {filteredPaymentHistory.length} transactions
                  </p>
                </div>
              </div>

              {filteredPaymentHistory.length > 0 ? (
                <div className="space-y-3">
                  {filteredPaymentHistory.map((payment) => (
                    <div
                      key={payment.transaction_id}
                      className={combine(
                        "p-4 rounded-xl border transition-all hover:shadow-md",
                        theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                      )}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className={combine(
                            "p-2 rounded-lg",
                            theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                          )}>
                            <FaReceipt className={combine(
                              "text-sm",
                              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={combine("font-mono text-xs", get('text', 'tertiary'))}>
                                {payment.transaction_id}
                              </span>
                              <button
                                onClick={() => copyTransactionId(payment.transaction_id)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title="Copy Transaction ID"
                              >
                                <FaCopy className="text-xs" />
                              </button>
                              {getPaymentModeBadge(payment.payment_mode)}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-1">
                              <span className={combine("text-xs", get('text', 'secondary'))}>
                                {payment.fee_type}
                              </span>
                              <span className={combine("text-xs", get('text', 'secondary'))}>
                                <FaCalendarAlt className="inline mr-1 text-xs" />
                                {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 md:mt-0 flex items-center justify-between md:justify-end gap-4">
                          <div className="text-right">
                            <div className="flex items-center">
                              <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                              <span className={combine("font-bold text-base", get('text', 'primary'))}>
                                {payment.amount_paid.toLocaleString('en-IN')}
                              </span>
                            </div>
                            {payment.balance_due > 0 && (
                              <div className="flex items-center text-xs text-amber-600 dark:text-amber-400">
                                <FaRupeeSign className="mr-1 text-xs" />
                                <span>Due: {payment.balance_due.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handlePrintReceipt(payment)}
                              className={combine(
                                "p-2 rounded-lg transition-all hover:text-blue-500 hover:bg-blue-500/10",
                                get('icon', 'primary')
                              )}
                              title="Print Receipt"
                            >
                              <FaPrint className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDownloadReceipt(payment)}
                              className={combine(
                                "p-2 rounded-lg transition-all hover:text-green-500 hover:bg-green-500/10",
                                get('icon', 'primary')
                              )}
                              title="Download Receipt"
                            >
                              <FaDownload className="text-sm" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedReceipt(payment);
                                setShowReceiptModal(true);
                              }}
                              className={combine(
                                "p-2 rounded-lg transition-all hover:text-purple-500 hover:bg-purple-500/10",
                                get('icon', 'primary')
                              )}
                              title="View Receipt"
                            >
                              <FaEye className="text-sm" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={combine(
                    "inline-block p-4 rounded-full mb-4",
                    theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                  )}>
                    <FaHistory className={combine(
                      "text-3xl",
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    )} />
                  </div>
                  <h3 className={combine("text-lg font-medium mb-2", get('text', 'primary'))}>
                    No payment history
                  </h3>
                  <p className={combine("text-sm mb-6 max-w-md mx-auto", get('text', 'secondary'))}>
                    You haven't made any payments yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className={getCardGradientClass('amber', true)}>
              <div className="flex items-center gap-3 mb-6">
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaWallet className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
                <div>
                  <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                    Quick Actions
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                {/* Get Receipt */}
                <div className={combine(
                  "p-4 rounded-xl border",
                  theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                )}>
                  <h3 className={combine("font-medium mb-3 flex items-center gap-2 text-sm", get('text', 'primary'))}>
                    <FaReceipt className={combine("text-sm", get('icon', 'secondary'))} />
                    Get Receipt
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={searchTransactionId}
                      onChange={(e) => setSearchTransactionId(e.target.value)}
                      placeholder="Enter Transaction ID"
                      className={getInputClass()}
                    />
                    <button
                      onClick={handleGetReceipt}
                      className={combine(getPrimaryButtonClass('amber'), "w-full flex items-center justify-center gap-2 text-sm py-2.5")}
                    >
                      <FaReceipt className="text-xs" />
                      <span>Get Receipt</span>
                    </button>
                  </div>
                </div>

                {/* Payment Methods Info */}
                <div className={getStatsCardClass('blue')}>
                  <h3 className={combine("font-medium mb-3 flex items-center gap-2 text-sm", get('text', 'primary'))}>
                    <FaShieldAlt className={combine("text-sm", get('icon', 'secondary'))} />
                    Secure Payment
                  </h3>
                  <ul className="text-xs space-y-2">
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-green-500 text-xs" />
                      <span className={get('text', 'secondary')}>128-bit SSL Encryption</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-green-500 text-xs" />
                      <span className={get('text', 'secondary')}>PCI DSS Compliant</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-green-500 text-xs" />
                      <span className={get('text', 'secondary')}>Multiple Payment Options</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCheckCircle className="text-green-500 text-xs" />
                      <span className={get('text', 'secondary')}>UPI, Card, NetBanking</span>
                    </li>
                  </ul>
                </div>

                {/* Payment Tips */}
                <div className={getStatsCardClass('purple')}>
                  <h3 className={combine("font-medium mb-3 flex items-center gap-2 text-sm", get('text', 'primary'))}>
                    <FaLock className={combine("text-sm text-green-500", get('icon', 'secondary'))} />
                    Payment Tips
                  </h3>
                  <ul className="text-xs space-y-2">
                    <li className={get('text', 'secondary')}>• Save transaction IDs for reference</li>
                    <li className={get('text', 'secondary')}>• Pay before due date to avoid late fees</li>
                    <li className={get('text', 'secondary')}>• Download receipts for your records</li>
                    <li className={get('text', 'secondary')}>• Contact support for payment issues</li>
                    <li className={get('text', 'secondary')}>• Partial payments are accepted</li>
                  </ul>
                </div>

                {/* Support Info */}
                <div className={getStatsCardClass('indigo')}>
                  <h3 className={combine("font-medium mb-3 flex items-center gap-2 text-sm", get('text', 'primary'))}>
                    <FaInfoCircle className={combine("text-sm", get('icon', 'secondary'))} />
                    Need Help?
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <FaPhone className="text-blue-500 text-xs" />
                      <span className={get('text', 'secondary')}>+91 1234567890</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaEnvelope className="text-blue-500 text-xs" />
                      <span className={get('text', 'secondary')}>accounts@school.com</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Due Summary */}
            {calculateBalanceDue() > 0 && (
              <div className={getStatsCardClass('red')}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                  )}>
                    <FaExclamationTriangle className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    )} />
                  </div>
                  <div>
                    <h3 className={combine("text-base font-bold", get('text', 'primary'))}>
                      Payment Due
                    </h3>
                    <p className={combine("text-2xl font-bold text-red-600 dark:text-red-400")}>
                      ₹{calculateBalanceDue().toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <p className={combine("text-xs mb-4", get('text', 'secondary'))}>
                  Please make payment before the due date to avoid late fees.
                </p>
                <button
                  onClick={() => {
                    setSelectedFeeType('');
                    setPaymentChoice('INSTALLMENT');
                    setShowPaymentModal(true);
                  }}
                  className={combine(getPrimaryButtonClass('red'), "w-full flex items-center justify-center gap-2")}
                >
                  <FaCreditCard className="text-sm" />
                  <span>Pay Now</span>
                </button>
              </div>
            )}

            {/* All Paid Message */}
            {calculateBalanceDue() === 0 && calculateTotalFees() > 0 && (
              <div className={getStatsCardClass('green')}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                  )}>
                    <FaCheckCircle className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    )} />
                  </div>
                  <div>
                    <h3 className={combine("text-base font-bold", get('text', 'primary'))}>
                      All Paid
                    </h3>
                    <p className={combine("text-2xl font-bold text-green-600 dark:text-green-400")}>
                      ₹{calculateTotalPaid().toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <p className={combine("text-xs", get('text', 'secondary'))}>
                  You have cleared all your fee dues. Thank you!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ MODALS ============ */}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-md w-full shadow-2xl"}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Make Payment
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedFeeType('');
                  setPaymentChoice('INSTALLMENT');
                }}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            <p className={combine("text-sm mb-6", get('text', 'secondary'))}>
              Complete your fee payment securely
            </p>

            <div className="space-y-5">
              {/* Fee Type Selection */}
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Select Fee Type
                </label>
                <select
                  value={selectedFeeType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setSelectedFeeType(nextType);
                    if (!nextType || !feeSummary) {
                      setPaymentChoice('INSTALLMENT');
                      return;
                    }
                    const selectedFee = feeSummary.fee_records.find(f => f.fee_type === nextType);
                    if (selectedFee && !canChooseFullDuePayment(selectedFee)) {
                      setPaymentChoice('INSTALLMENT');
                    }
                  }}
                  className={getInputClass()}
                >
                  <option value="">Choose a fee type</option>
                  {feeSummary?.fee_records
                    .filter(record => record.status !== 'PAID')
                    .map(record => (
                      <option key={record.fee_id} value={record.fee_type}>
                        {record.fee_type} - Due: ₹{getFullDueAmount(record).toLocaleString('en-IN')}
                      </option>
                    ))}
                </select>
              </div>

              {/* Payment Summary */}
              {selectedFeeType && (
                <div className={getStatsCardClass('blue')}>
                  <h3 className={combine("font-medium mb-3 text-sm", get('text', 'primary'))}>
                    Payment Summary
                  </h3>
                  {(() => {
                    const selectedFee = feeSummary?.fee_records.find(f => f.fee_type === selectedFeeType);
                    if (!selectedFee) return null;

                    const amountToPay = paymentChoice === 'FULL'
                      ? getFullDueAmount(selectedFee)
                      : getNextPayableAmount(selectedFee);
                    const isBelowMinimum = amountToPay < MIN_PAYMENT_AMOUNT;

                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className={get('text', 'tertiary')}>Fee Type</span>
                          <span className={combine("font-medium", get('text', 'primary'))}>
                            {selectedFee.fee_type}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={get('text', 'tertiary')}>Total Fee</span>
                          <span className={combine("font-medium", get('text', 'primary'))}>
                            ₹{selectedFee.total_amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {(selectedFee.installment_count || 1) > 1 && (
                          <>
                            <div className="flex justify-between">
                              <span className={get('text', 'tertiary')}>Installment Plan</span>
                              <span className={combine("font-medium", get('text', 'primary'))}>
                                {selectedFee.installments_paid_count || 0}/{selectedFee.installment_count} paid
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={get('text', 'tertiary')}>Next Installment</span>
                              <span className={combine("font-medium", get('text', 'primary'))}>
                                #{selectedFee.next_installment_number || 1} of {selectedFee.installment_count}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className={get('text', 'tertiary')}>Remaining Installments</span>
                              <span className={combine("font-medium", get('text', 'primary'))}>
                                {selectedFee.installments_remaining_count || 0}
                              </span>
                            </div>
                          </>
                        )}
                        {canChooseFullDuePayment(selectedFee) && (
                          <div className="pt-2">
                            <span className={combine("text-xs font-medium", get('text', 'tertiary'))}>
                              Payment Option
                            </span>
                            <div className="mt-2 grid grid-cols-1 gap-2">
                              <button
                                type="button"
                                onClick={() => setPaymentChoice('INSTALLMENT')}
                                className={combine(
                                  'rounded-xl border px-3 py-2 text-left transition-all',
                                  paymentChoice === 'INSTALLMENT'
                                    ? 'border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-900/20 dark:text-green-300'
                                    : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                )}
                              >
                                Pay Installment: ₹{getNextPayableAmount(selectedFee).toLocaleString('en-IN')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentChoice('FULL')}
                                className={combine(
                                  'rounded-xl border px-3 py-2 text-left transition-all',
                                  paymentChoice === 'FULL'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                )}
                              >
                                Pay Full Due: ₹{getFullDueAmount(selectedFee).toLocaleString('en-IN')}
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedFee.concession > 0 && (
                          <div className="flex justify-between text-green-600 dark:text-green-400">
                            <span>Concession</span>
                            <span>- ₹{selectedFee.concession.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className={get('text', 'tertiary')}>Total Due</span>
                          <span className={combine("font-medium", get('text', 'primary'))}>
                            ₹{selectedFee.due_amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300 dark:border-gray-600">
                          <span className={get('text', 'primary')}>Amount to Pay</span>
                          <span className="text-blue-600 dark:text-blue-400">
                            ₹{amountToPay.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {(selectedFee.installment_count || 1) > 1 && paymentChoice === 'INSTALLMENT' && (
                          <p className={combine("text-xs pt-1", get('text', 'secondary'))}>
                            Paying installment mode for this transaction.
                          </p>
                        )}
                        {(selectedFee.installment_count || 1) > 1 && paymentChoice === 'FULL' && (
                          <p className={combine("text-xs pt-1", get('text', 'secondary'))}>
                            Paying full due amount will close all pending installments for this fee.
                          </p>
                        )}
                        {isBelowMinimum && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 pt-1">
                            Minimum online payment is ₹{MIN_PAYMENT_AMOUNT}. Please contact school office for this amount.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedFeeType('');
                  setPaymentChoice('INSTALLMENT');
                }}
                className={combine(getSecondaryButtonClass(), "flex-1")}
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                onClick={handleRazorpayPayment}
                disabled={
                  processingPayment ||
                  !selectedFeeType ||
                  ((() => {
                    const selectedFee = feeSummary?.fee_records.find(f => f.fee_type === selectedFeeType);
                    if (!selectedFee) return true;
                    const amountToPay = paymentChoice === 'FULL'
                      ? getFullDueAmount(selectedFee)
                      : getNextPayableAmount(selectedFee);
                    return amountToPay < MIN_PAYMENT_AMOUNT;
                  })())
                }
                className={combine(getPrimaryButtonClass('green'), "flex-1 flex items-center justify-center gap-2")}
              >
                {processingPayment ? (
                  <>
                    <FaSpinner className="animate-spin text-sm" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FaCreditCard className="text-sm" />
                    <span>Pay</span>
                  </>
                )}
              </button>
            </div>

            {/* Security Notice */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs">
              <FaLock className="text-green-500" />
              <span className={get('text', 'tertiary')}>Secure payment powered by Razorpay</span>
              <FaExternalLinkAlt className="text-xs text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"}>
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-inherit z-10 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className={combine("text-xl font-bold", get('text', 'primary'))}>
                  Payment Receipt
                </h2>
                <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                  Transaction ID: {selectedReceipt.transaction_id}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrintReceipt(selectedReceipt)}
                  className={combine(getSecondaryButtonClass(), "p-3")}
                  title="Print"
                >
                  <FaPrint className="text-sm" />
                </button>
                <button
                  onClick={() => handleDownloadReceipt(selectedReceipt)}
                  className={combine(getSecondaryButtonClass(), "p-3")}
                  title="Download"
                >
                  <FaDownload className="text-sm" />
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className={combine(
                    "p-3 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                    get('icon', 'secondary')
                  )}
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 rounded-xl">
              {/* Receipt Header */}
              <div className="text-center mb-8">
                <h1 className={combine("text-2xl font-bold mb-2", get('text', 'primary'))}>
                  SCHOOL FEES RECEIPT
                </h1>
                <p className={combine("text-sm", get('text', 'secondary'))}>
                  Payment Confirmation
                </p>
              </div>

              {/* Receipt Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className={combine(
                  "p-4 rounded-xl border",
                  theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                )}>
                  <h3 className={combine("text-sm font-semibold mb-3", get('text', 'primary'))}>
                    Student Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Student ID:</span>
                      <span className={combine("font-medium text-xs", get('text', 'primary'))}>
                        {selectedReceipt.student_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Name:</span>
                      <span className={combine("font-medium text-xs", get('text', 'primary'))}>
                        {selectedReceipt.student_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Class:</span>
                      <span className={combine("font-medium text-xs", get('text', 'primary'))}>
                        {selectedReceipt.student_class} - {selectedReceipt.student_section}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={combine(
                  "p-4 rounded-xl border",
                  theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                )}>
                  <h3 className={combine("text-sm font-semibold mb-3", get('text', 'primary'))}>
                    Payment Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Date:</span>
                      <span className={combine("font-medium text-xs", get('text', 'primary'))}>
                        {format(new Date(selectedReceipt.payment_date), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Mode:</span>
                      {getPaymentModeBadge(selectedReceipt.payment_mode)}
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Fee Type:</span>
                      <span className={combine("font-medium text-xs", get('text', 'primary'))}>
                        {selectedReceipt.fee_type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-xs", get('text', 'tertiary'))}>Academic Year:</span>
                      <span className={combine("font-medium text-xs", get('text', 'primary'))}>
                        {selectedReceipt.academic_year}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee Details Table */}
              <div className="mb-8">
                <h3 className={combine("text-sm font-semibold mb-3", get('text', 'primary'))}>
                  Fee Details
                </h3>
                <div className={combine(
                  "rounded-xl overflow-hidden border",
                  get('border', 'primary')
                )}>
                  <table className="min-w-full">
                    <thead className={combine(
                      "bg-gray-50 dark:bg-gray-800",
                      get('border', 'primary')
                    )}>
                      <tr>
                        <th className={combine("px-4 py-2 text-left text-xs font-medium", get('text', 'tertiary'))}>
                          Description
                        </th>
                        <th className={combine("px-4 py-2 text-right text-xs font-medium", get('text', 'tertiary'))}>
                          Amount (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={combine("border-t", get('border', 'primary'))}>
                        <td className="px-4 py-2">
                          <div className={combine("font-medium text-xs", get('text', 'primary'))}>
                            {selectedReceipt.fee_type} Fee
                          </div>
                          <div className={combine("text-xs", get('text', 'tertiary'))}>
                            Base Fee Amount
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end">
                            <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                            <span className={combine("font-bold text-xs", get('text', 'primary'))}>
                              {selectedReceipt.total_fee.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {selectedReceipt.concession_amount > 0 && (
                        <tr className={combine("border-t", get('border', 'primary'))}>
                          <td className="px-4 py-2">
                            <div className={combine("font-medium text-xs text-green-600 dark:text-green-400")}>
                              Concession
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end text-green-600 dark:text-green-400">
                              <FaRupeeSign className="mr-1 text-xs" />
                              <span className="font-bold text-xs">
                                -{selectedReceipt.concession_amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}

                      <tr className={combine("border-t border-b", get('border', 'primary'))}>
                        <td className="px-4 py-2">
                          <div className={combine("font-medium text-xs", get('text', 'primary'))}>
                            Amount Paid
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end">
                            <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                            <span className={combine("font-bold text-sm text-green-600 dark:text-green-400")}>
                              {selectedReceipt.amount_paid.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td className="px-4 py-2">
                          <div className={combine("font-medium text-xs", get('text', 'primary'))}>
                            Balance Due
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end">
                            <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                            <span className={combine("font-bold text-xs", get('accent', 'warning'))}>
                              {selectedReceipt.balance_due.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2">
                  {getStatusBadge(selectedReceipt.status)}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs">
                <p className={get('text', 'tertiary')}>
                  This is a computer-generated receipt and does not require a signature.
                </p>
                <p className={combine("mt-1", get('text', 'tertiary'))}>
                  For any queries, contact accounts@school.com
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-md w-full shadow-2xl"}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Filter Fees
              </h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Academic Year
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className={getInputClass()}
                >
                  <option value="all">All Years</option>
                  {uniqueYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={getInputClass()}
                >
                  <option value="all">All Status</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setFilterYear('all');
                  setFilterStatus('all');
                }}
                className={combine(getSecondaryButtonClass(), "flex-1")}
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className={combine(getPrimaryButtonClass('blue'), "flex-1")}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

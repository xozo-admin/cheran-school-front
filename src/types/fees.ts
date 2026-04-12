// types/fees.ts
export interface FeeStructure {
  id: number;
  academic_year: string;
  fee_type: string;
  class_name: string;
  amount: number;
  due_date: string;
  is_active: boolean;
}

export interface StudentFeeSummary {
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

export interface StudentFeeRecord {
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
  due_date: string;
  last_payment_date: string | null;
  payments: PaymentSummary[];
}

export interface PaymentSummary {
  id?: number;
  date: string;
  amount: number;
  mode: string;
  transaction_id: string;
}

export interface FeeReceipt {
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
  payment_status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED';
  payment_status_display: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  remarks?: string;
}

export interface PaymentInitiationResponse {
  status: number;
  payment_id: number;
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  student_name: string;
  student_email?: string;
  student_phone?: string;
  description: string;
  gateway_mode: 'DUMMY' | 'REAL';
  return_url?: string;
}

export interface PaymentVerificationResponse {
  status: number;
  message: string;
  receipt: FeeReceipt;
  gateway_mode: 'DUMMY' | 'REAL';
}

export interface StudentProfile {
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
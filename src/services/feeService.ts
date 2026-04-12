// services/feeService.ts
import { studentApi } from '@/lib/api';
import { loadRazorpayScript, openRazorpayCheckout, RazorpayOptions } from '@/lib/razorpay';
import { toastError, toastSuccess, toastInfo, toastPromise, toast } from '@/lib/toast';
import { 
  PaymentInitiationResponse, 
  FeeReceipt, 
  StudentFeeSummary,
  PaymentVerificationResponse 
} from '@/types/fees';

export class FeeService {
  private static instance: FeeService;

  static getInstance(): FeeService {
    if (!FeeService.instance) {
      FeeService.instance = new FeeService();
    }
    return FeeService.instance;
  }

  async getFeeSummary(academicYear?: string, student_id?:any): Promise<StudentFeeSummary> {
    try {
      const response = await studentApi.fees.summary({ academic_year: academicYear, student_id:student_id });
      return response.data;
    } catch (error) {
      console.error('Error fetching fee summary:', error);
      throw error;
    }
  }

  async initiateRazorpayPayment(
    studentId: string,
    className: string,
    feeType: string,
    amount: number
  ): Promise<PaymentInitiationResponse> {
    try {
      const response = await studentApi.fees.initiatePayment({
        student_id: studentId,
        class_name: className,
        fee_type: feeType,
        amount: amount,
        payment_mode: 'RAZORPAY',
        return_url: window.location.href,
      });
      return response.data;
    } catch (error) {
      console.error('Error initiating payment:', error);
      throw error;
    }
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<PaymentVerificationResponse> {
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
  }

  async getReceipt(transactionId?: string, paymentId?: string): Promise<FeeReceipt> {
    try {
      const params: any = {};
      if (transactionId) params.transaction_id = transactionId;
      if (paymentId) params.payment_id = paymentId;
      
      const response = await studentApi.fees.receipt(params);
      return response.data.receipt;
    } catch (error) {
      console.error('Error fetching receipt:', error);
      throw error;
    }
  }

  async getFeeTypes(): Promise<string[]> {
    try {
      const response = await studentApi.fees.feeTypes();
      return response.data.fee_types;
    } catch (error) {
      console.error('Error fetching fee types:', error);
      throw error;
    }
  }

  async getStudentProfile() {
    try {
      const response = await studentApi.profile.get();
      return response.data;
    } catch (error) {
      console.error('Error fetching student profile:', error);
      throw error;
    }
  }

  async processRazorpayPayment(
    studentId: string,
    className: string,
    feeType: string,
    amount: number,
    studentName: string,
    studentEmail?: string,
    studentPhone?: string,
    onSuccess?: (receipt: FeeReceipt) => void,
    onDismiss?: () => void
  ): Promise<void> {
    let loadingToast: string | number | undefined | any;
    let processingToast: string | number | undefined | any;

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toastError('Failed to load payment gateway. Please try again.');
        return;
      }

      // Show loading toast
      loadingToast = toastInfo('Initializing payment...');

      // Initiate payment on server
      const paymentData = await this.initiateRazorpayPayment(
        studentId,
        className,
        feeType,
        amount
      );

      // Dismiss loading toast
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }

      // Configure Razorpay options
      const options: RazorpayOptions = {
        key: paymentData.key_id,
        amount: paymentData.amount * 100, // Convert to paise
        currency: paymentData.currency,
        name: 'School Fee Payment',
        description: paymentData.description || `${feeType} Fee Payment`,
        image: '/school-logo.png', // Add your school logo path
        order_id: paymentData.order_id,
        handler: async (response: any) => {
          try {
            // Show processing toast
            processingToast = toastInfo('Verifying payment...');

            // Verify payment on server
            const verificationResult = await this.verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            // Dismiss processing toast
            if (processingToast) {
              toast.dismiss(processingToast);
            }

            if (verificationResult.status === 200) {
              toastSuccess('Payment successful!');
              if (onSuccess) {
                onSuccess(verificationResult.receipt);
              }
            } else {
              toastError('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification failed:', error);
            if (processingToast) {
              toast.dismiss(processingToast);
            }
            toastError('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: studentName,
          email: studentEmail || '',
          contact: studentPhone || '',
        },
        notes: {
          student_id: studentId,
          fee_type: feeType,
          class: className,
        },
        theme: {
          color: '#3B82F6', // Blue color matching your theme
        },
        modal: {
          ondismiss: () => {
            if (loadingToast) {
              toast.dismiss(loadingToast);
            }
            if (processingToast) {
              toast.dismiss(processingToast);
            }
            if (onDismiss) {
              onDismiss();
            }
            toastInfo('Payment cancelled');
          },
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        remember_customer: true,
      };

      // Open Razorpay checkout
      openRazorpayCheckout(options);
    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      // Dismiss any pending toasts
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      if (processingToast) {
        toast.dismiss(processingToast);
      }
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to process payment. Please try again.';
      toastError(errorMessage);
      
      if (onDismiss) {
        onDismiss();
      }
    }
  }

  async downloadReceipt(receipt: FeeReceipt): Promise<void> {
    try {
      // In a real app, you would generate PDF and trigger download
      // For now, we'll simulate a download
      await toastPromise(
        new Promise((resolve) => setTimeout(resolve, 1500)),
        {
          pending: 'Generating receipt...',
          success: 'Receipt downloaded successfully',
          error: 'Failed to download receipt',
        }
      );
      
      // Create a dummy PDF blob and download
      // This is just a placeholder - implement actual PDF generation
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
  }
}

export const feeService = FeeService.getInstance();
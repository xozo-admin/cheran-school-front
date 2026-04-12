// lib/razorpay.ts

import { toastInfo } from "./toast";

// lib/razorpay.ts
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  remember_customer?: boolean;
  readonly?: {
    email?: boolean;
    contact?: boolean;
  };
  method?:any
}

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// In your razorpay.ts file
// In lib/razorpay.ts
export const openRazorpayCheckout = (options: RazorpayOptions) => {
  // Ensure we're not passing undefined image
  const razorpayOptions: any = {
    key: options.key,
    amount: options.amount,
    currency: options.currency,
    name: options.name,
    description: options.description,
    order_id: options.order_id,
    handler: async (response: any) => {
      if (options.handler) {
        await options.handler(response);
      }
    },
    prefill: options.prefill,
    notes: options.notes,
    theme: options.theme,
    modal: {
      ondismiss: () => {
        if (options.modal?.ondismiss) {
          options.modal.ondismiss();
        }
        toastInfo('Payment cancelled');
      },
    },
    retry: options.retry,
    remember_customer: options.remember_customer,
  };

  // Only add image if it exists and is a valid URL
  if (options.image && options.image.startsWith('http')) {
    razorpayOptions.image = options.image;
  }

  const razorpay = new (window as any).Razorpay(razorpayOptions);
  
  razorpay.open();
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const convertPaiseToRupees = (paise: number): number => {
  return paise / 100;
};

export const convertRupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};
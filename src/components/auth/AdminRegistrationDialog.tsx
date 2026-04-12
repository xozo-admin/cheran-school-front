'use client';

import { useState } from 'react';
import { User, Phone, Mail, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { InputField } from '../ui/InputField';
import { Dialog } from '../ui/Dialog';
import { api } from '@/lib/api';
import { AdminRegistrationData } from '@/types';

interface AdminRegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminRegistrationDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: AdminRegistrationDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<AdminRegistrationData>({
    admin_name: '',
    admin_phone: '',
    admin_email: '',
    admin_password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.admin.register(formData);
      const payload = response.data;

      if (payload?.success || payload?.status === 200 || payload?.status === 201) {
        onSuccess();
        onClose();
      } else {
        alert('Admin registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof AdminRegistrationData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Registration"
      subtitle="Setup your administrator account"
      icon={<User className="h-6 w-6 text-white" />}
      gradientFrom="blue-600"
      gradientTo="blue-700"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 sm:space-y-5">
          <InputField
            label="Admin Name"
            leftIcon={<User className="h-5 w-5 text-gray-400" />}
            placeholder="Enter your full name"
            value={formData.admin_name}
            onChange={handleInputChange('admin_name')}
            required
          />

          <InputField
            label="Phone Number"
            leftIcon={<Phone className="h-5 w-5 text-gray-400" />}
            placeholder="Enter phone number"
            value={formData.admin_phone}
            onChange={handleInputChange('admin_phone')}
            required
          />

          <InputField
            label="Email Address"
            type="email"
            leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
            placeholder="Enter email address"
            value={formData.admin_email}
            onChange={handleInputChange('admin_email')}
            required
          />

          <InputField
            label="Password"
            type="password"
            leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
            placeholder="Create a strong password"
            value={formData.admin_password}
            onChange={handleInputChange('admin_password')}
            required
          />
          
          <p className="text-xs text-gray-500 mt-2">
            Use at least 8 characters with letters and numbers
          </p>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            fullWidth
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            fullWidth
            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
          >
            Register Admin
          </Button>
        </div>

        <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs sm:text-sm text-blue-800">
            <span className="font-semibold">Note:</span> This is the first-time setup. 
            You'll be creating the primary administrator account for the school management system.
          </p>
        </div>
      </form>
    </Dialog>
  );
};

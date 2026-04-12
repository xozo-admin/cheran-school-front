'use client';

import { useState } from 'react';
import { School, Building } from 'lucide-react';
import { Button } from '../ui/Button';
import { InputField } from '../ui/InputField';
import { Dialog } from '../ui/Dialog';
import { api } from '@/lib/api';
import { SchoolRegistrationData } from '@/types';

interface SchoolRegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SchoolRegistrationDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: SchoolRegistrationDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<SchoolRegistrationData>({
    school_name: '',
    total_students: 0,
    total_staffs: 0,
    total_teachers: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.school.register(formData);
      const payload = response.data;

      if (payload?.success || payload?.status === 200 || payload?.status === 201) {
        onSuccess();
        onClose();
      } else {
        alert('School registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof SchoolRegistrationData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      [field]: field.startsWith('total_') ? parseInt(value) || 0 : value 
    }));
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="School Registration"
      subtitle="Setup your school information"
      icon={<School className="h-6 w-6 text-white" />}
      gradientFrom="emerald-600"
      gradientTo="emerald-700"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 sm:space-y-5">
          <InputField
            label="School Name"
            leftIcon={<Building className="h-5 w-5 text-gray-400" />}
            placeholder="Enter school name"
            value={formData.school_name}
            onChange={handleInputChange('school_name')}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <InputField
              label="Total Students"
              type="number"
              min="1"
              placeholder="e.g., 500"
              value={formData.total_students || ''}
              onChange={handleInputChange('total_students')}
              required
              containerClassName="text-center"
            />

            <InputField
              label="Total Staff"
              type="number"
              min="1"
              placeholder="e.g., 50"
              value={formData.total_staffs || ''}
              onChange={handleInputChange('total_staffs')}
              required
              containerClassName="text-center"
            />

            <InputField
              label="Total Teachers"
              type="number"
              min="1"
              placeholder="e.g., 30"
              value={formData.total_teachers || ''}
              onChange={handleInputChange('total_teachers')}
              required
              containerClassName="text-center"
            />
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          <Button
            type="submit"
            variant="secondary"
            isLoading={isLoading}
            fullWidth
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
          >
            Complete Setup
          </Button>
        </div>

        <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-xs sm:text-sm text-emerald-800">
            <span className="font-semibold">Note:</span> These numbers can be updated later. 
            They help in initial resource allocation and planning.
          </p>
        </div>
      </form>
    </Dialog>
  );
};

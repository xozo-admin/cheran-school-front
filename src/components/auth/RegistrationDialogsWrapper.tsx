'use client';

import { AdminRegistrationDialog } from './AdminRegistrationDialog';
import { SchoolRegistrationDialog } from './SchoolRegistrationDialog';

interface RegistrationDialogsWrapperProps {
  showAdminDialog: boolean;
  showSchoolDialog: boolean;
  onAdminClose: () => void;
  onSchoolClose: () => void;
  onAdminSuccess: () => void;
  onSchoolSuccess: () => void;
}

export const RegistrationDialogsWrapper = ({
  showAdminDialog,
  showSchoolDialog,
  onAdminClose,
  onSchoolClose,
  onAdminSuccess,
  onSchoolSuccess,
}: RegistrationDialogsWrapperProps) => {
  return (
    <>
      <AdminRegistrationDialog
        isOpen={showAdminDialog}
        onClose={onAdminClose}
        onSuccess={onAdminSuccess}
      />
      
      <SchoolRegistrationDialog
        isOpen={showSchoolDialog}
        onClose={onSchoolClose}
        onSuccess={onSchoolSuccess}
      />
    </>
  );
};
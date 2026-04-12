import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  icon: ReactNode;
  gradientFrom: string;
  gradientTo: string;
}

export const Dialog = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  icon,
  gradientFrom,
  gradientTo,
}: DialogProps) => {
  if (!isOpen) return null;

  const gradientMap: Record<string, string> = {
    'blue-600': '#2563eb',
    'blue-700': '#1d4ed8',
    'emerald-600': '#059669',
    'emerald-700': '#047857',
  };

  const fromColor = gradientMap[gradientFrom] || '#2563eb';
  const toColor = gradientMap[gradientTo] || '#1d4ed8';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"></div>
      
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative transform overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-white to-blue-50 shadow-2xl transition-all w-full max-w-lg border border-blue-100">
          <div
            className="px-4 py-3 sm:px-6 sm:py-4"
            style={{ background: `linear-gradient(to right, ${fromColor}, ${toColor})` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  {icon}
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
                  {subtitle && (
                    <p className="text-blue-100 text-sm">{subtitle}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

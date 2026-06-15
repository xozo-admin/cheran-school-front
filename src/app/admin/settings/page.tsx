'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  BookOpen,
  Bus,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Hotel,
  IndianRupee,
  Layers,
  Loader2,
  Send,
  Package,
  School,
  Settings,
  Smartphone,
  UserCheck,
  Users,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

interface WhatsAppAlertSetting {
  alert_type: string;
  label: string;
  enabled: boolean;
  updated_at: string;
}

const implementedWhatsAppAlertTypes = new Set(['attendance', 'transport', 'fees']);

const getApiMessage = (error: any, fallback: string) =>
  error?.response?.data?.error ||
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  fallback;

const settingGroups = [
  {
    title: 'Academic Setup',
    description: 'Manage the academic structure already available in this ERP.',
    items: [
      {
        title: 'Attendance Config',
        description: 'Configure attendance rules used by admin, teachers and students.',
        href: '/admin/academics/attendance',
        icon: <ClipboardCheck className="h-5 w-5" />,
      },
      {
        title: 'Classes & Sections',
        description: 'Create and maintain classes, sections and class structure.',
        href: '/admin/academics/classes',
        icon: <School className="h-5 w-5" />,
      },
      {
        title: 'Subjects',
        description: 'Manage subjects used for classes, teachers and assessments.',
        href: '/admin/academics/subjects',
        icon: <BookOpen className="h-5 w-5" />,
      },
      {
        title: 'Teacher Allocations',
        description: 'Assign teachers to classes, sections and subjects.',
        href: '/admin/teachers/allocations',
        icon: <Layers className="h-5 w-5" />,
      },
      {
        title: 'Timetable',
        description: 'Maintain class schedules and academic timetable setup.',
        href: '/admin/academics/timetable',
        icon: <CalendarDays className="h-5 w-5" />,
      },
      {
        title: 'Examinations',
        description: 'Manage exam setup, marks and approval workflow.',
        href: '/admin/academics/examination',
        icon: <GraduationCap className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'People & Attendance',
    description: 'Open implemented student, teacher and staff management areas.',
    items: [
      {
        title: 'Students',
        description: 'Manage student records and admissions.',
        href: '/admin/students/allstudents',
        icon: <Users className="h-5 w-5" />,
      },
      {
        title: 'Student Attendance',
        description: 'View and maintain student attendance records.',
        href: '/admin/students/attendance',
        icon: <UserCheck className="h-5 w-5" />,
      },
      {
        title: 'Teachers',
        description: 'Manage teacher directory and profiles.',
        href: '/admin/teachers/allteachers',
        icon: <Users className="h-5 w-5" />,
      },
      {
        title: 'Teacher Attendance',
        description: 'Track teacher attendance.',
        href: '/admin/teachers/attendance',
        icon: <CalendarCheck className="h-5 w-5" />,
      },
      {
        title: 'Staff',
        description: 'Manage staff directory and roles.',
        href: '/admin/staff/directory',
        icon: <Users className="h-5 w-5" />,
      },
      {
        title: 'Staff Attendance',
        description: 'Track staff attendance.',
        href: '/admin/staff/attendance',
        icon: <CalendarCheck className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Finance',
    description: 'Access finance modules already present in the ERP.',
    items: [
      {
        title: 'Fee Dashboard',
        description: 'Review fee collection and dashboard metrics.',
        href: '/admin/finance/fees',
        icon: <IndianRupee className="h-5 w-5" />,
      },
      {
        title: 'Fees Management',
        description: 'Manage fee records and collections.',
        href: '/admin/fees',
        icon: <IndianRupee className="h-5 w-5" />,
      },
      {
        title: 'Fee Reports',
        description: 'Open implemented fee reporting tools.',
        href: '/admin/finance/feereports',
        icon: <IndianRupee className="h-5 w-5" />,
      },
      {
        title: 'Salary Dashboard',
        description: 'Review salary overview and payroll metrics.',
        href: '/admin/salary/dashboard',
        icon: <IndianRupee className="h-5 w-5" />,
      },
      {
        title: 'Salary Management',
        description: 'Manage payroll and salary processing.',
        href: '/admin/salary',
        icon: <IndianRupee className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Operations',
    description: 'Open operational modules that are already built.',
    items: [
      {
        title: 'Transport Management',
        description: 'Manage routes, buses and transport data.',
        href: '/admin/operations/transport',
        icon: <Bus className="h-5 w-5" />,
      },
      {
        title: 'Transport Live Tracking',
        description: 'View live transport tracking.',
        href: '/admin/operations/transport/live',
        icon: <Bus className="h-5 w-5" />,
      },
      {
        title: 'Hostel Management',
        description: 'Manage hostel records and allocation areas.',
        href: '/admin/operations/hostel',
        icon: <Hotel className="h-5 w-5" />,
      },
      {
        title: 'Inventory',
        description: 'Manage school resources and inventory.',
        href: '/admin/staff/resources',
        icon: <Package className="h-5 w-5" />,
      },
      {
        title: 'Leave Management',
        description: 'Review and manage leave requests.',
        href: '/admin/operations/leave',
        icon: <CalendarDays className="h-5 w-5" />,
      },
      {
        title: 'Holidays',
        description: 'Maintain the holiday calendar.',
        href: '/admin/operations/holidays',
        icon: <CalendarDays className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Communication',
    description: 'Use communication workflows already implemented.',
    items: [
      {
        title: 'Announcements',
        description: 'Create and manage school announcements.',
        href: '/admin/communications/announcements',
        icon: <Bell className="h-5 w-5" />,
      },
      {
        title: 'Meetings',
        description: 'Review and manage meeting requests.',
        href: '/admin/meetings',
        icon: <CalendarCheck className="h-5 w-5" />,
      },
    ],
  },
];

export default function AdminSettingsPage() {
  const schoolScope = useSchoolScope({ storageKey: 'settings_school_scope' });
  const totalItems = settingGroups.reduce((count, group) => count + group.items.length, 0);
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppAlertSetting[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [updatingAlert, setUpdatingAlert] = useState<string | null>(null);
  const [sendingFeeReminders, setSendingFeeReminders] = useState(false);

  const loadWhatsAppSettings = async () => {
    try {
      setLoadingAlerts(true);
      const response = await adminApi.notification.whatsappAlertSettings.list(schoolScope.scopeParams);
      const settings = (response.data?.data || []) as WhatsAppAlertSetting[];
      setWhatsappSettings(
        settings.filter((setting) => implementedWhatsAppAlertTypes.has(setting.alert_type))
      );
    } catch (error: any) {
      toastError(getApiMessage(error, 'Failed to load WhatsApp alert settings'));
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    loadWhatsAppSettings();
  }, [schoolScope.selectedSchoolId]);

  const handleToggleWhatsAppAlert = async (setting: WhatsAppAlertSetting) => {
    try {
      setUpdatingAlert(setting.alert_type);
      const nextEnabled = !setting.enabled;
      const response = await adminApi.notification.whatsappAlertSettings.update({
        alert_type: setting.alert_type,
        enabled: nextEnabled,
        ...schoolScope.scopeParams,
      });
      const updated = response.data?.data;
      setWhatsappSettings((current) =>
        current.map((item) =>
          item.alert_type === updated.alert_type ? updated : item
        )
      );
      toastSuccess(`${updated.label} ${updated.enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toastError(getApiMessage(error, 'Failed to update WhatsApp alert setting'));
    } finally {
      setUpdatingAlert(null);
    }
  };

  const handleSendFeeReminders = async () => {
    try {
      setSendingFeeReminders(true);
      const response = await adminApi.fees.sendReminders({ days: 7, ...schoolScope.scopeParams });
      const data = response.data?.data || {};
      toastSuccess(
        `Fee reminders sent. WhatsApp: ${data.whatsapp_sent || 0}, Email: ${data.email_sent || 0}, Skipped: ${data.skipped_count || 0}`
      );
    } catch (error: any) {
      toastError(getApiMessage(error, 'Failed to send fee reminders'));
    } finally {
      setSendingFeeReminders(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50 px-3 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto space-y-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Settings</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                  Quick access to configuration and management pages already implemented in this ERP.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
              <div className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200">
                {totalItems} available areas
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">WhatsApp Alerts</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Control WhatsApp messages for attendance, transport and fee reminder flows.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {loadingAlerts ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[92px] animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
              ))
            ) : (
              whatsappSettings.length === 0 ? (
                <div className="col-span-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No implemented WhatsApp alert settings found.
                </div>
              ) : whatsappSettings.map((setting) => (
                <div
                  key={setting.alert_type}
                  className={`flex min-h-[104px] items-center justify-between gap-4 rounded-lg border p-4 transition-all ${
                    setting.enabled
                      ? 'border-emerald-200 bg-emerald-50/40 shadow-sm'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{setting.label}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          setting.enabled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {setting.enabled ? 'On' : 'Off'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-gray-500">
                      {setting.enabled ? 'WhatsApp messages will be sent' : 'WhatsApp messages are paused'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleWhatsAppAlert(setting)}
                    disabled={updatingAlert === setting.alert_type}
                    aria-pressed={setting.enabled}
                    className={`group relative h-8 w-14 shrink-0 rounded-full p-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-wait ${
                      setting.enabled
                        ? 'bg-emerald-600 shadow-inner shadow-emerald-900/20'
                        : 'bg-gray-200 shadow-inner shadow-gray-400/20'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ${
                        setting.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    >
                      {updatingAlert === setting.alert_type ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
                      ) : (
                        <span
                          className={`h-2 w-2 rounded-full ${
                            setting.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </span>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Fee Reminders</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Send due-date reminders for unpaid fees due within the next 7 days.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSendFeeReminders}
              disabled={sendingFeeReminders}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-wait disabled:bg-amber-400"
            >
              {sendingFeeReminders ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Reminders
            </button>
          </div>
        </section>

        <div className="space-y-5">
          {settingGroups.map((group) => (
            <section key={group.title} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
                <h2 className="text-base font-semibold text-gray-900">{group.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{group.description}</p>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex min-h-[116px] items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 transition group-hover:bg-blue-600 group-hover:text-white">
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-gray-500">{item.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

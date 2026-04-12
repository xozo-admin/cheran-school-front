'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addSeconds,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle2,
  CalendarDays,
  CalendarCheck2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Info,
  IndianRupee,
  Megaphone,
  WalletCards,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  School,
  Stethoscope,
  Users,
  X,
  Zap,
} from 'lucide-react';

type Category = 'school' | 'college' | 'medical';
type Severity = 'High' | 'Medium' | 'Low';
type HealthBand = 'Stable' | 'Watch' | 'Critical';

type Institution = {
  id: string;
  name: string;
  category: Category;
  subType: string;
  location: string;
  state: string;
  students: number;
  staff: number;
  attendance: number;
  feeCollected: number;
  feePending: number;
  staffAvailability: number;
  complaints: number;
  healthScore: number;
};

type Alert = {
  id: string;
  institutionId: string;
  issue: string;
  severity: Severity;
  detail: string;
};

type ActivityEvent = {
  id: string;
  institutionId: string;
  type: 'Fee' | 'Attendance' | 'Admission' | 'Complaint';
  detail: string;
};

type UiAlertLevel = 'success' | 'error' | 'warning' | 'info';

type UiAlert = {
  id: string;
  level: UiAlertLevel;
  message: string;
};

type SchoolCalendarEntry = {
  id: string;
  date: string;
  title: string;
  type: 'Event' | 'Announcement';
  campus: string;
  detail: string;
};

type InstitutionBase = {
  id: string;
  name: string;
  category: Category;
  subType: string;
  location: string;
  state: string;
};

const BASE_INSTITUTIONS: InstitutionBase[] = [
  // School Education
  {
    id: 'SCH-001',
    name: 'Vaels International School - Neelankarai',
    category: 'school',
    subType: 'International School',
    location: 'Neelankarai, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-002',
    name: 'Vaels International School - Injambakkam',
    category: 'school',
    subType: 'International School',
    location: 'Injambakkam, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-003',
    name: 'Vels Vidyashram - Pallavaram',
    category: 'school',
    subType: 'CBSE',
    location: 'Pallavaram, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-004',
    name: 'Vels Vidyashram Kindergarten - Cantonment',
    category: 'school',
    subType: 'Kindergarten',
    location: 'Cantonment, Pallavaram',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-005',
    name: 'Vels Vidyashram - Darga Road',
    category: 'school',
    subType: 'CBSE',
    location: 'Darga Road, Pallavaram',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-006',
    name: 'Vels Vidyashram - Thalambur',
    category: 'school',
    subType: 'CBSE',
    location: 'Thalambur, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-007',
    name: 'Vels Global School - Tambaram',
    category: 'school',
    subType: 'Global School',
    location: 'Tambaram, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-008',
    name: 'Vels Global School - Nerkundram',
    category: 'school',
    subType: 'Global School',
    location: 'Nerkundram, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-009',
    name: 'Vels Global School - Nandambakkam',
    category: 'school',
    subType: 'Global School',
    location: 'Nandambakkam, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-010',
    name: 'Vels Global School - Mogappair',
    category: 'school',
    subType: 'Global School',
    location: 'Mogappair, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-011',
    name: 'Vels Global School - Medavakkam',
    category: 'school',
    subType: 'Global School',
    location: 'Medavakkam, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-012',
    name: 'Vels Global School - Keelkattalai',
    category: 'school',
    subType: 'Global School',
    location: 'Keelkattalai, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-013',
    name: 'Vels Global School - Kollampalayam',
    category: 'school',
    subType: 'Global School',
    location: 'Kollampalayam, Erode',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-014',
    name: 'Vels Global School - HSR Layout',
    category: 'school',
    subType: 'Global School',
    location: 'HSR Layout, Bengaluru',
    state: 'Karnataka',
  },
  {
    id: 'SCH-015',
    name: 'Vels Global School - Horamavu',
    category: 'school',
    subType: 'Global School',
    location: 'Horamavu, Bengaluru',
    state: 'Karnataka',
  },
  {
    id: 'SCH-016',
    name: 'Vels Global School - Marathahalli',
    category: 'school',
    subType: 'Global School',
    location: 'Marathahalli, Bengaluru',
    state: 'Karnataka',
  },
  {
    id: 'SCH-017',
    name: 'Vels Global School - Arakere',
    category: 'school',
    subType: 'Global School',
    location: 'Arakere, Bengaluru',
    state: 'Karnataka',
  },
  {
    id: 'SCH-018',
    name: 'Vels Global School - New Town Campus',
    category: 'school',
    subType: 'Global School',
    location: 'New Town',
    state: 'West Bengal',
  },
  {
    id: 'SCH-019',
    name: 'Vels Global School - Howrah',
    category: 'school',
    subType: 'Global School',
    location: 'Howrah',
    state: 'West Bengal',
  },
  {
    id: 'SCH-020',
    name: 'Vels Global School - Ludhiana',
    category: 'school',
    subType: 'Global School',
    location: 'Ludhiana',
    state: 'Punjab',
  },
  {
    id: 'SCH-021',
    name: 'Vels Global School - Haryana Campus',
    category: 'school',
    subType: 'Global School',
    location: 'Haryana',
    state: 'Haryana',
  },
  {
    id: 'SCH-022',
    name: 'Vels Global School - Chennai Main Campus',
    category: 'school',
    subType: 'Global School',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-023',
    name: 'Vels Global School - Campus 17',
    category: 'school',
    subType: 'Global School',
    location: 'India',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-024',
    name: 'Paripoorna Prajna International School',
    category: 'school',
    subType: 'International School',
    location: 'K R Puram, Bengaluru',
    state: 'Karnataka',
  },
  {
    id: 'SCH-025',
    name: 'Vels Higher Secondary School',
    category: 'school',
    subType: 'Higher Secondary School',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-026',
    name: 'Vels International Preschool',
    category: 'school',
    subType: 'Preschool',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-027',
    name: 'Vels Kinder Kids',
    category: 'school',
    subType: 'Early Childhood Education',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-028',
    name: 'Vels Football Residential Academy',
    category: 'school',
    subType: 'Residential Sports School',
    location: 'Thalambur, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-029',
    name: 'Vels Swimming School',
    category: 'school',
    subType: 'Sports School',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'SCH-030',
    name: 'Kindle Kids International School (KKIS)',
    category: 'school',
    subType: 'International School',
    location: 'Singapore',
    state: 'Singapore',
  },
  {
    id: 'SCH-031',
    name: 'Bright Learners Private School',
    category: 'school',
    subType: 'International School',
    location: 'Al Rashidia, Dubai',
    state: 'United Arab Emirates',
  },

  // Higher Education
  {
    id: 'COL-001',
    name: 'Vels Institute of Science, Technology & Advanced Studies (VISTAS)',
    category: 'college',
    subType: 'University / Higher Education',
    location: 'Pallavaram, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-002',
    name: 'Vels High Tech Campus',
    category: 'college',
    subType: 'Higher Education Campus',
    location: 'Thiruvanmiyur, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-003',
    name: 'Vels College of Pharmacy',
    category: 'college',
    subType: 'Professional Degree College',
    location: 'Pallavaram, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-004',
    name: 'Vels College of Physiotherapy',
    category: 'college',
    subType: 'Professional Degree College',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-005',
    name: 'Vels College of Science',
    category: 'college',
    subType: 'Arts & Science College',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-006',
    name: 'Vels Institute of Hotel Management',
    category: 'college',
    subType: 'Professional Degree College',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-007',
    name: 'Vels Institute of Business Administration',
    category: 'college',
    subType: 'Management College',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-008',
    name: 'Vels Srinivasa College of Engineering and Technology',
    category: 'college',
    subType: 'Engineering College',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-009',
    name: 'Vels Teacher Training Institute',
    category: 'college',
    subType: 'Teacher Education',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-010',
    name: 'Vinayaga College of Education',
    category: 'college',
    subType: 'Teacher Education',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-011',
    name: 'Vels Agriculture College',
    category: 'college',
    subType: 'Agriculture College',
    location: 'Dindivanam',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-012',
    name: 'Vels Academy of Maritime Studies',
    category: 'college',
    subType: 'Specialized Professional College',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'COL-013',
    name: "Cambridge Tutors College",
    category: 'college',
    subType: 'International College',
    location: 'London',
    state: 'United Kingdom',
  },
  {
    id: 'COL-014',
    name: 'MDIS VELS',
    category: 'college',
    subType: 'International Higher Education',
    location: 'Singapore',
    state: 'Singapore',
  },

  // Professional / Medical Education
  {
    id: 'MED-001',
    name: 'Vels Medical College & Hospital (VMCH)',
    category: 'medical',
    subType: 'Medical & Health Sciences',
    location: 'Tiruvallur',
    state: 'Tamil Nadu',
  },
  {
    id: 'MED-002',
    name: 'Vel Nursing College',
    category: 'medical',
    subType: 'Medical & Health Sciences',
    location: 'Tiruvallur',
    state: 'Tamil Nadu',
  },
  {
    id: 'MED-003',
    name: 'Vels School of Allied Health Sciences',
    category: 'medical',
    subType: 'Medical & Health Sciences',
    location: 'Tiruvallur',
    state: 'Tamil Nadu',
  },
  {
    id: 'MED-004',
    name: 'Sri Venkateswara Dental College & Hospital',
    category: 'medical',
    subType: 'Dental',
    location: 'Thalambur, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'MED-005',
    name: 'Meghna Institute of Dental Sciences (MIDS)',
    category: 'medical',
    subType: 'Dental',
    location: 'Nizamabad',
    state: 'Telangana',
  },
  {
    id: 'MED-006',
    name: 'Mahavir Institute of Medical Sciences (MIMS)',
    category: 'medical',
    subType: 'Medical (External Institution)',
    location: 'Hyderabad',
    state: 'Telangana',
  },
  {
    id: 'MED-007',
    name: 'Vels School of Maritime Studies',
    category: 'medical',
    subType: 'Specialized / Professional',
    location: 'Thalambur, Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'MED-008',
    name: 'Venkateswara Nursing College',
    category: 'medical',
    subType: 'Medical & Health Sciences',
    location: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    id: 'MED-009',
    name: 'Vels College of Allied Health Sciences',
    category: 'medical',
    subType: 'Medical & Health Sciences',
    location: 'Periyapalayam, Tiruvallur',
    state: 'Tamil Nadu',
  },
];

const INSTITUTIONS: Institution[] = (() => {
  const categoryIndex: Record<Category, number> = { school: 0, college: 0, medical: 0 };

  return BASE_INSTITUTIONS.map((base) => {
    const idx = categoryIndex[base.category];
    categoryIndex[base.category] += 1;

    const profileByCategory = {
      school: {
        studentsBase: 860,
        staffBase: 88,
        attendanceBase: 90,
        feePerStudent: 72000,
        pendingRate: 0.16,
        complaintsBase: 6,
      },
      college: {
        studentsBase: 4100,
        staffBase: 360,
        attendanceBase: 86,
        feePerStudent: 110000,
        pendingRate: 0.13,
        complaintsBase: 12,
      },
      medical: {
        studentsBase: 1280,
        staffBase: 155,
        attendanceBase: 83,
        feePerStudent: 145000,
        pendingRate: 0.2,
        complaintsBase: 10,
      },
    }[base.category];

    const students = profileByCategory.studentsBase + ((idx % 6) * 95 + Math.floor(idx / 2) * 35);
    const staff = profileByCategory.staffBase + ((idx % 5) * 9 + Math.floor(idx / 3) * 4);
    const attendance = Math.max(74, profileByCategory.attendanceBase - (idx % 4) * 2 + (idx % 2));
    const feeCollected = students * profileByCategory.feePerStudent;
    const feePending = Math.round(
      feeCollected * (profileByCategory.pendingRate + ((idx % 3) - 1) * 0.03)
    );
    const staffAvailability = Math.max(76, 95 - (idx % 6) * 2);
    const complaints = profileByCategory.complaintsBase + (idx % 5) * 2;
    const healthScore = Math.max(
      58,
      Math.min(
        95,
        Math.round(
          0.45 * attendance +
            0.25 * staffAvailability +
            0.2 * (100 - Math.min(35, Math.round((feePending / feeCollected) * 100))) +
            0.1 * (100 - Math.min(30, complaints * 2))
        )
      )
    );

    return {
      ...base,
      students,
      staff,
      attendance,
      feeCollected,
      feePending,
      staffAvailability,
      complaints,
      healthScore,
    };
  });
})();

const ALERTS: Alert[] = [
  {
    id: 'AL-01',
    institutionId: 'MED-001',
    issue: 'High Fee Pending',
    severity: 'High',
    detail: 'Pending fee trend exceeded monthly threshold for medical programs.',
  },
  {
    id: 'AL-02',
    institutionId: 'SCH-018',
    issue: 'Attendance Drop',
    severity: 'Medium',
    detail: 'Attendance dipped for three consecutive weekly cycles.',
  },
  {
    id: 'AL-03',
    institutionId: 'MED-006',
    issue: 'Complaint Increase',
    severity: 'Medium',
    detail: 'Student support complaints increased by 19% this month.',
  },
  {
    id: 'AL-04',
    institutionId: 'COL-002',
    issue: 'Staff Capacity',
    severity: 'Low',
    detail: 'Academic scheduling pressure flagged for two departments.',
  },
];

const BASE_ACTIVITY_EVENTS: ActivityEvent[] = [
  {
    id: 'EV-01',
    institutionId: 'SCH-003',
    type: 'Attendance',
    detail: 'Morning attendance synced for Grades 6 to 10.',
  },
  {
    id: 'EV-02',
    institutionId: 'COL-001',
    type: 'Fee',
    detail: 'Tuition payment batch posted for engineering stream.',
  },
  {
    id: 'EV-03',
    institutionId: 'MED-004',
    type: 'Complaint',
    detail: 'Clinical posting grievance raised by 3 students.',
  },
  {
    id: 'EV-04',
    institutionId: 'SCH-011',
    type: 'Admission',
    detail: 'New admission confirmations completed for academic year 2026.',
  },
  {
    id: 'EV-05',
    institutionId: 'MED-001',
    type: 'Attendance',
    detail: 'Intern duty attendance registered for all hospital blocks.',
  },
  {
    id: 'EV-06',
    institutionId: 'COL-008',
    type: 'Fee',
    detail: 'Semester fee reminder triggered for pending accounts.',
  },
  {
    id: 'EV-07',
    institutionId: 'SCH-018',
    type: 'Complaint',
    detail: 'Parent support ticket volume crossed daily baseline.',
  },
  {
    id: 'EV-08',
    institutionId: 'MED-006',
    type: 'Admission',
    detail: 'Lateral admission applications moved to verification stage.',
  },
];

const SCHOOL_CALENDAR_ENTRIES: SchoolCalendarEntry[] = [
  {
    id: 'SC-01',
    date: '2026-04-12',
    title: 'Term 1 Parent Orientation',
    type: 'Event',
    campus: 'Vels Vidyashram - Pallavaram',
    detail: 'Orientation for parents of Grades 1 to 5 at the main auditorium (10:00 AM).',
  },
  {
    id: 'SC-02',
    date: '2026-04-12',
    title: 'Transport Route Update',
    type: 'Announcement',
    campus: 'Vels Global School - Medavakkam',
    detail: 'Morning pickup timing updated for Zones 2 and 3 from Monday.',
  },
  {
    id: 'SC-03',
    date: '2026-04-13',
    title: 'Inter-School Science Expo',
    type: 'Event',
    campus: 'Vaels International School - Neelankarai',
    detail: 'Selected students will present STEM projects; jury visit at 11:30 AM.',
  },
  {
    id: 'SC-04',
    date: '2026-04-13',
    title: 'Fee Due Reminder (Quarter 1)',
    type: 'Announcement',
    campus: 'Vels Vidyashram - Thalambur',
    detail: 'Fee payment window closes on April 20, 2026.',
  },
  {
    id: 'SC-05',
    date: '2026-04-14',
    title: 'Primary Sports Trials',
    type: 'Event',
    campus: 'Vels Global School - Tambaram',
    detail: 'House-wise athletics trials for Grades 4-6 at 8:30 AM.',
  },
  {
    id: 'SC-06',
    date: '2026-04-14',
    title: 'Holiday Circular Released',
    type: 'Announcement',
    campus: 'Vaels International School - Injambakkam',
    detail: 'Circular published for festival holiday and compensatory working day.',
  },
  {
    id: 'SC-07',
    date: '2026-04-15',
    title: 'Staff Training: Inclusive Classroom',
    type: 'Event',
    campus: 'Vels Global School - Mogappair',
    detail: 'Teacher training workshop in seminar hall from 2:00 PM to 4:30 PM.',
  },
  {
    id: 'SC-08',
    date: '2026-04-15',
    title: 'Library Week Announcement',
    type: 'Announcement',
    campus: 'Vels Global School - Nerkundram',
    detail: 'Book fair and reading challenge details shared to students and parents.',
  },
];

const OFFICIAL_TOTAL_STUDENTS = 51000;
const OFFICIAL_TOTAL_STAFF = 7700;
const OFFICIAL_OVERALL_ATTENDANCE = 88;
const GLOBAL_RAW_ATTENDANCE = Math.round(
  INSTITUTIONS.reduce((sum, item) => sum + item.attendance, 0) / INSTITUTIONS.length
);
const ATTENDANCE_OFFSET = OFFICIAL_OVERALL_ATTENDANCE - GLOBAL_RAW_ATTENDANCE;

function allocateOfficialTotals(
  institutions: Institution[],
  key: 'students' | 'staff',
  officialTotal: number
) {
  const totalRaw = institutions.reduce((sum, institution) => sum + institution[key], 0);
  if (totalRaw <= 0) return Object.fromEntries(institutions.map((i) => [i.id, 0]));

  const withFractions = institutions.map((institution) => {
    const exact = (institution[key] / totalRaw) * officialTotal;
    const base = Math.floor(exact);
    return {
      id: institution.id,
      base,
      fraction: exact - base,
    };
  });

  let remainder = officialTotal - withFractions.reduce((sum, item) => sum + item.base, 0);
  const sorted = withFractions.slice().sort((a, b) => b.fraction - a.fraction);
  const allocated = Object.fromEntries(withFractions.map((item) => [item.id, item.base]));

  for (let index = 0; index < sorted.length && remainder > 0; index += 1) {
    allocated[sorted[index].id] += 1;
    remainder -= 1;
  }

  return allocated;
}

const OFFICIAL_STUDENTS_BY_ID = allocateOfficialTotals(
  INSTITUTIONS,
  'students',
  OFFICIAL_TOTAL_STUDENTS
);
const OFFICIAL_STAFF_BY_ID = allocateOfficialTotals(INSTITUTIONS, 'staff', OFFICIAL_TOTAL_STAFF);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const shortName = (value: string) => (value.length <= 28 ? value : `${value.slice(0, 28)}...`);

const getHealthBand = (score: number): HealthBand => {
  if (score >= 80) return 'Stable';
  if (score >= 70) return 'Watch';
  return 'Critical';
};

export default function InstitutionsDashboardPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Category>('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState<'all' | HealthBand>('all');
  const [monitoringPeriod, setMonitoringPeriod] = useState<'week' | 'month' | 'date'>('month');
  const [monitoringMonth, setMonitoringMonth] = useState('all');
  const [monitoringDate, setMonitoringDate] = useState('');
  const [monitoringCategory, setMonitoringCategory] = useState<'all' | Category>('all');
  const [monitoringInstitution, setMonitoringInstitution] = useState('all');
  const [monitoringSubType, setMonitoringSubType] = useState('all');
  const [monitoringLocation, setMonitoringLocation] = useState('all');
  const [revenuePeriod, setRevenuePeriod] = useState<'week' | 'month' | 'date'>('month');
  const [revenueYear, setRevenueYear] = useState('all');
  const [revenueMonth, setRevenueMonth] = useState('all');
  const [revenueDate, setRevenueDate] = useState('');
  const [revenueCategory, setRevenueCategory] = useState<'all' | Category>('all');
  const [revenueInstitution, setRevenueInstitution] = useState('all');
  const [revenueSubType, setRevenueSubType] = useState('all');
  const [revenueLocation, setRevenueLocation] = useState('all');
  const [schoolCalendarDate, setSchoolCalendarDate] = useState('2026-04-12');
  const [schoolCalendarMonth, setSchoolCalendarMonth] = useState(new Date(2026, 3, 1));
  const [liveNow, setLiveNow] = useState(new Date());
  const [activityTick, setActivityTick] = useState(0);
  const [actionMessage, setActionMessage] = useState('');
  const [uiAlerts, setUiAlerts] = useState<UiAlert[]>([]);

  const pushAlert = (message: string, level: UiAlertLevel = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setUiAlerts((prev) => [{ id, level, message }, ...prev].slice(0, 5));
    setTimeout(() => {
      setUiAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, 4500);
  };

  const removeAlert = (id: string) => {
    setUiAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const stateOptions = useMemo(
    () => ['all', ...Array.from(new Set(INSTITUTIONS.map((i) => i.state))).sort()],
    []
  );

  const filteredInstitutions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return INSTITUTIONS.filter((institution) => {
      const searchMatch =
        !normalizedSearch ||
        institution.name.toLowerCase().includes(normalizedSearch) ||
        institution.location.toLowerCase().includes(normalizedSearch) ||
        institution.subType.toLowerCase().includes(normalizedSearch);
      const categoryMatch = categoryFilter === 'all' || institution.category === categoryFilter;
      const stateMatch = stateFilter === 'all' || institution.state === stateFilter;
      const healthMatch =
        healthFilter === 'all' || getHealthBand(institution.healthScore) === healthFilter;
      return searchMatch && categoryMatch && stateMatch && healthMatch;
    });
  }, [search, categoryFilter, stateFilter, healthFilter]);

  const visibleIds = useMemo(
    () => new Set(filteredInstitutions.map((institution) => institution.id)),
    [filteredInstitutions]
  );

  const filteredAlerts = useMemo(
    () => ALERTS.filter((alert) => visibleIds.has(alert.institutionId)),
    [visibleIds]
  );

  const institutionsById = useMemo(
    () => Object.fromEntries(INSTITUTIONS.map((institution) => [institution.id, institution])),
    []
  );

  const liveActivityEvents = useMemo(
    () => BASE_ACTIVITY_EVENTS.filter((event) => visibleIds.has(event.institutionId)),
    [visibleIds]
  );

  const summary = useMemo(() => {
    const count = filteredInstitutions.length;
    const students = filteredInstitutions.reduce(
      (sum, item) => sum + (OFFICIAL_STUDENTS_BY_ID[item.id] || 0),
      0
    );
    const staff = filteredInstitutions.reduce(
      (sum, item) => sum + (OFFICIAL_STAFF_BY_ID[item.id] || 0),
      0
    );
    const rawAttendance =
      count > 0
        ? Math.round(filteredInstitutions.reduce((sum, item) => sum + item.attendance, 0) / count)
        : 0;
    const attendance =
      count > 0
        ? Math.max(60, Math.min(100, rawAttendance + ATTENDANCE_OFFSET))
        : 0;
    const collected = filteredInstitutions.reduce((sum, item) => sum + item.feeCollected, 0);
    const pending = filteredInstitutions.reduce((sum, item) => sum + item.feePending, 0);
    const complaints = filteredInstitutions.reduce((sum, item) => sum + item.complaints, 0);
    const health =
      count > 0
        ? Math.round(filteredInstitutions.reduce((sum, item) => sum + item.healthScore, 0) / count)
        : 0;

    return { count, students, staff, attendance, collected, pending, complaints, health };
  }, [filteredInstitutions]);

  const groupedInstitutions = useMemo(
    () => ({
      school: filteredInstitutions.filter((item) => item.category === 'school'),
      college: filteredInstitutions.filter((item) => item.category === 'college'),
      medical: filteredInstitutions.filter((item) => item.category === 'medical'),
    }),
    [filteredInstitutions]
  );

  const prioritizedAlerts = useMemo(() => {
    const severityRank: Record<Severity, number> = { High: 3, Medium: 2, Low: 1 };
    return [...filteredAlerts].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  }, [filteredAlerts]);

  const liveInsights = useMemo(() => {
    const lowAttendance = filteredInstitutions.filter(
      (institution) => institution.attendance + ATTENDANCE_OFFSET < 82
    ).length;
    const highPending = filteredInstitutions.filter(
      (institution) => institution.feePending / institution.feeCollected > 0.2
    ).length;
    const complaintRise = filteredInstitutions.filter((institution) => institution.complaints >= 14).length;
    const staffRisk = filteredInstitutions.filter((institution) => institution.staffAvailability < 84).length;

    return [
      { id: 'INS-01', label: 'Attendance Risk', value: `${lowAttendance} institutions below 82% attendance.` },
      { id: 'INS-02', label: 'Fee Delay', value: `${highPending} institutions crossing 20% pending fees.` },
      { id: 'INS-03', label: 'Complaint Trend', value: `${complaintRise} institutions showing complaint rise.` },
      { id: 'INS-04', label: 'Staff Pressure', value: `${staffRisk} institutions with staff availability risk.` },
    ];
  }, [filteredInstitutions]);

  const institutionsNeedingAttention = useMemo(
    () =>
      [...filteredInstitutions]
        .sort((a, b) => a.healthScore - b.healthScore)
        .slice(0, 6)
        .map((item) => ({
          id: item.id,
          name: item.name,
          location: item.location,
          healthScore: item.healthScore,
          reason:
            item.attendance + ATTENDANCE_OFFSET < 82
              ? 'Low attendance trend'
              : item.feePending / item.feeCollected > 0.2
                ? 'High pending fee'
                : item.complaints >= 14
                  ? 'Complaint increase'
                  : 'Operational review required',
        })),
    [filteredInstitutions]
  );

  const performanceTrendData = useMemo(() => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const attendanceBase = summary.attendance;
    const collectedBase = Math.round(summary.collected / 10000000);
    const pendingBase = Math.round(summary.pending / 10000000);
    return labels.map((label, index) => ({
      month: label,
      attendance: Math.max(60, Math.min(100, attendanceBase - 2 + ((index + 1) % 4))),
      collected: Math.max(0, collectedBase - 2 + index * 2),
      pending: Math.max(0, pendingBase + (index % 3) - 1),
    }));
  }, [summary.attendance, summary.collected, summary.pending]);

  const predictiveInsights = useMemo(
    () =>
      [...filteredInstitutions]
        .map((institution) => {
          const attendanceRisk = Math.max(0, 85 - (institution.attendance + ATTENDANCE_OFFSET));
          const pendingRisk = Math.round((institution.feePending / institution.feeCollected) * 100);
          const complaintRisk = institution.complaints;
          const riskScore = attendanceRisk * 1.8 + pendingRisk * 1.1 + complaintRisk * 1.4;
          return {
            id: institution.id,
            name: institution.name,
            riskScore: Math.round(riskScore),
            note:
              attendanceRisk > 6
                ? 'Possible attendance drop in next cycle.'
                : pendingRisk > 22
                  ? 'Revenue target risk due to pending fee trend.'
                  : 'Operational issue growth likely if unresolved.',
          };
        })
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 5),
    [filteredInstitutions]
  );

  const rotatingLiveFeed = useMemo(() => {
    if (liveActivityEvents.length === 0) return [];
    const startIndex = activityTick % liveActivityEvents.length;
    const rotated = [
      ...liveActivityEvents.slice(startIndex),
      ...liveActivityEvents.slice(0, startIndex),
    ];
    return rotated.slice(0, 6).map((event, index) => ({
      ...event,
      time: format(addSeconds(liveNow, -(index * 95 + 10)), 'hh:mm:ss a'),
    }));
  }, [liveActivityEvents, activityTick, liveNow]);

  const schoolCalendarItems = useMemo(
    () => SCHOOL_CALENDAR_ENTRIES.filter((item) => item.date === schoolCalendarDate),
    [schoolCalendarDate]
  );

  const schoolCalendarEventsInMonth = useMemo(
    () =>
      SCHOOL_CALENDAR_ENTRIES.filter((item) => {
        const eventDate = new Date(`${item.date}T00:00:00`);
        return (
          eventDate.getFullYear() === schoolCalendarMonth.getFullYear() &&
          eventDate.getMonth() === schoolCalendarMonth.getMonth()
        );
      }),
    [schoolCalendarMonth]
  );

  const schoolCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(schoolCalendarMonth);
    const monthEnd = endOfMonth(schoolCalendarMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [schoolCalendarMonth]);

  const revenueCategoryBase = useMemo(
    () =>
      INSTITUTIONS.filter(
        (institution) => revenueCategory === 'all' || institution.category === revenueCategory
      ),
    [revenueCategory]
  );

  const revenueInstitutionOptions = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          revenueCategoryBase
            .filter(
              (institution) =>
                (revenueSubType === 'all' || institution.subType === revenueSubType) &&
                (revenueLocation === 'all' || institution.location === revenueLocation)
            )
            .map((institution) => institution.name)
        )
      ).sort(),
    ],
    [revenueCategoryBase, revenueSubType, revenueLocation]
  );

  const revenueSubTypeOptions = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          revenueCategoryBase
            .filter(
              (institution) =>
                (revenueInstitution === 'all' || institution.name === revenueInstitution) &&
                (revenueLocation === 'all' || institution.location === revenueLocation)
            )
            .map((institution) => institution.subType)
        )
      ).sort(),
    ],
    [revenueCategoryBase, revenueInstitution, revenueLocation]
  );

  const revenueLocationOptions = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          revenueCategoryBase
            .filter(
              (institution) =>
                (revenueInstitution === 'all' || institution.name === revenueInstitution) &&
                (revenueSubType === 'all' || institution.subType === revenueSubType)
            )
            .map((institution) => institution.location)
        )
      ).sort(),
    ],
    [revenueCategoryBase, revenueInstitution, revenueSubType]
  );

  const revenuePeriodCollectedMultiplier = useMemo(() => {
    const yearFactor =
      revenueYear === 'all'
        ? 1
        : revenueYear === '2026'
          ? 1
          : revenueYear === '2025'
            ? 0.95
            : revenueYear === '2024'
              ? 0.9
              : 0.85;

    if (revenuePeriod === 'week') return 0.24 * yearFactor;
    if (revenuePeriod === 'month') {
      if (revenueMonth === 'all') return 1;
      const month = parseInt(revenueMonth, 10);
      return (0.88 + (month % 5) * 0.04) * yearFactor;
    }
    const day = revenueDate ? new Date(revenueDate).getDate() : NaN;
    if (!Number.isNaN(day)) return (0.9 + (day % 5) * 0.02) * yearFactor;
    return 1 * yearFactor;
  }, [revenuePeriod, revenueMonth, revenueDate, revenueYear]);

  const revenuePeriodPendingMultiplier = useMemo(() => {
    const yearFactor =
      revenueYear === 'all'
        ? 1
        : revenueYear === '2026'
          ? 1.02
          : revenueYear === '2025'
            ? 0.98
            : revenueYear === '2024'
              ? 0.94
              : 0.9;

    if (revenuePeriod === 'week') return 0.28 * yearFactor;
    if (revenuePeriod === 'month') {
      if (revenueMonth === 'all') return 1;
      const month = parseInt(revenueMonth, 10);
      return (0.92 + (month % 4) * 0.03) * yearFactor;
    }
    const day = revenueDate ? new Date(revenueDate).getDate() : NaN;
    if (!Number.isNaN(day)) return (0.94 + (day % 4) * 0.02) * yearFactor;
    return 1 * yearFactor;
  }, [revenuePeriod, revenueMonth, revenueDate, revenueYear]);

  useEffect(() => {
    if (revenueInstitution !== 'all' && !revenueInstitutionOptions.includes(revenueInstitution)) {
      setRevenueInstitution('all');
    }
  }, [revenueInstitution, revenueInstitutionOptions]);

  useEffect(() => {
    if (revenueSubType !== 'all' && !revenueSubTypeOptions.includes(revenueSubType)) {
      setRevenueSubType('all');
    }
  }, [revenueSubType, revenueSubTypeOptions]);

  useEffect(() => {
    if (revenueLocation !== 'all' && !revenueLocationOptions.includes(revenueLocation)) {
      setRevenueLocation('all');
    }
  }, [revenueLocation, revenueLocationOptions]);

  const revenueFilteredInstitutions = useMemo(
    () =>
      revenueCategoryBase.filter((institution) => {
        const institutionMatch =
          revenueInstitution === 'all' || institution.name === revenueInstitution;
        const subTypeMatch = revenueSubType === 'all' || institution.subType === revenueSubType;
        const locationMatch =
          revenueLocation === 'all' || institution.location === revenueLocation;
        return institutionMatch && subTypeMatch && locationMatch;
      }),
    [
      revenueCategoryBase,
      revenueInstitution,
      revenueSubType,
      revenueLocation,
    ]
  );

  const revenueData = useMemo(
    () =>
      [...revenueFilteredInstitutions]
        .sort((a, b) => b.feeCollected - a.feeCollected)
        .map((item) => ({
          name: shortName(item.name),
          collected: Math.round((item.feeCollected * revenuePeriodCollectedMultiplier) / 100000),
          pending: Math.round((item.feePending * revenuePeriodPendingMultiplier) / 100000),
        })),
    [
      revenueFilteredInstitutions,
      revenuePeriodCollectedMultiplier,
      revenuePeriodPendingMultiplier,
    ]
  );

  const categoryPerformanceData = useMemo(() => {
    const buckets: { key: Category; label: string }[] = [
      { key: 'school', label: 'School' },
      { key: 'college', label: 'College' },
      { key: 'medical', label: 'Medical' },
    ];

    return buckets.map((bucket) => {
      const items = filteredInstitutions.filter((institution) => institution.category === bucket.key);
      const students = items.reduce(
        (sum, item) => sum + (OFFICIAL_STUDENTS_BY_ID[item.id] || 0),
        0
      );
      const staff = items.reduce(
        (sum, item) => sum + (OFFICIAL_STAFF_BY_ID[item.id] || 0),
        0
      );
      const rawAttendance =
        items.length > 0
          ? Math.round(items.reduce((sum, item) => sum + item.attendance, 0) / items.length)
          : 0;
      const attendance =
        items.length > 0
          ? Math.max(60, Math.min(100, rawAttendance + ATTENDANCE_OFFSET))
          : 0;

      return {
        category: bucket.label,
        students,
        staff,
        attendance,
      };
    });
  }, [filteredInstitutions]);

  const monitoringCategoryBase = useMemo(
    () =>
      INSTITUTIONS.filter(
        (institution) =>
          monitoringCategory === 'all' || institution.category === monitoringCategory
      ),
    [monitoringCategory]
  );

  const monitoringInstitutionOptions = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          monitoringCategoryBase
            .filter(
              (institution) =>
                (monitoringSubType === 'all' || institution.subType === monitoringSubType) &&
                (monitoringLocation === 'all' || institution.location === monitoringLocation)
            )
            .map((institution) => institution.name)
        )
      ).sort(),
    ],
    [monitoringCategoryBase, monitoringSubType, monitoringLocation]
  );

  const monitoringSubTypeOptions = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          monitoringCategoryBase
            .filter(
              (institution) =>
                (monitoringInstitution === 'all' ||
                  institution.name === monitoringInstitution) &&
                (monitoringLocation === 'all' || institution.location === monitoringLocation)
            )
            .map((institution) => institution.subType)
        )
      ).sort(),
    ],
    [monitoringCategoryBase, monitoringInstitution, monitoringLocation]
  );

  const monitoringLocationOptions = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          monitoringCategoryBase
            .filter(
              (institution) =>
                (monitoringInstitution === 'all' ||
                  institution.name === monitoringInstitution) &&
                (monitoringSubType === 'all' || institution.subType === monitoringSubType)
            )
            .map((institution) => institution.location)
        )
      ).sort(),
    ],
    [monitoringCategoryBase, monitoringInstitution, monitoringSubType]
  );

  const monitoringAttendanceShift = useMemo(() => {
    if (monitoringPeriod === 'week') return -1;
    if (monitoringPeriod === 'month') {
      if (monitoringMonth === 'all') return 0;
      const month = parseInt(monitoringMonth, 10);
      return (month % 3) - 1;
    }
    const day = monitoringDate ? new Date(monitoringDate).getDate() : NaN;
    if (!Number.isNaN(day)) return (day % 3) - 1;
    return 0;
  }, [monitoringPeriod, monitoringMonth, monitoringDate]);

  useEffect(() => {
    if (monitoringInstitution !== 'all' && !monitoringInstitutionOptions.includes(monitoringInstitution)) {
      setMonitoringInstitution('all');
    }
  }, [monitoringInstitution, monitoringInstitutionOptions]);

  useEffect(() => {
    if (monitoringSubType !== 'all' && !monitoringSubTypeOptions.includes(monitoringSubType)) {
      setMonitoringSubType('all');
    }
  }, [monitoringSubType, monitoringSubTypeOptions]);

  useEffect(() => {
    if (monitoringLocation !== 'all' && !monitoringLocationOptions.includes(monitoringLocation)) {
      setMonitoringLocation('all');
    }
  }, [monitoringLocation, monitoringLocationOptions]);

  const monitoringFilteredInstitutions = useMemo(
    () =>
      monitoringCategoryBase.filter((institution) => {
        const categoryMatch =
          monitoringCategory === 'all' || institution.category === monitoringCategory;
        const institutionMatch =
          monitoringInstitution === 'all' || institution.name === monitoringInstitution;
        const subTypeMatch =
          monitoringSubType === 'all' || institution.subType === monitoringSubType;
        const locationMatch =
          monitoringLocation === 'all' || institution.location === monitoringLocation;
        return categoryMatch && institutionMatch && subTypeMatch && locationMatch;
      }),
    [
      monitoringCategoryBase,
      monitoringCategory,
      monitoringInstitution,
      monitoringSubType,
      monitoringLocation,
    ]
  );

  useEffect(() => {
    if (monitoringCategory === 'all') {
      setMonitoringInstitution('all');
      setMonitoringSubType('all');
      setMonitoringLocation('all');
    }
  }, [monitoringCategory]);

  useEffect(() => {
    const timeInterval = setInterval(() => setLiveNow(new Date()), 1000);
    const activityInterval = setInterval(() => setActivityTick((value) => value + 1), 10000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(activityInterval);
    };
  }, []);

  const institutionMonitoringData = useMemo(
    () =>
      monitoringFilteredInstitutions
        .slice()
        .sort((a, b) => b.students - a.students)
        .map((item) => ({
          name: shortName(item.name),
          students: OFFICIAL_STUDENTS_BY_ID[item.id] || 0,
          staff: OFFICIAL_STAFF_BY_ID[item.id] || 0,
          attendance: Math.max(
            60,
            Math.min(100, item.attendance + ATTENDANCE_OFFSET + monitoringAttendanceShift)
          ),
        })),
    [
      monitoringFilteredInstitutions,
      monitoringAttendanceShift,
    ]
  );

  const monitoringAxisScale = useMemo(() => {
    if (institutionMonitoringData.length === 0) {
      return {
        people: { min: 0, mid: 0, max: 0 },
        attendance: { min: 60, mid: 80, max: 100 },
      };
    }

    const peopleValues = institutionMonitoringData.flatMap((item) => [item.students, item.staff]);
    const attendanceValues = institutionMonitoringData.map((item) => item.attendance);

    const peopleMin = Math.min(...peopleValues);
    const peopleMax = Math.max(...peopleValues);
    const attendanceMin = Math.min(...attendanceValues);
    const attendanceMax = Math.max(...attendanceValues);

    return {
      people: {
        min: peopleMin,
        mid: Math.round((peopleMin + peopleMax) / 2),
        max: peopleMax,
      },
      attendance: {
        min: attendanceMin,
        mid: Math.round((attendanceMin + attendanceMax) / 2),
        max: attendanceMax,
      },
    };
  }, [institutionMonitoringData]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <AlertStack alerts={uiAlerts} onClose={removeAlert} />
      <div className="w-full space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-700 to-blue-900 text-white p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-cyan-100 text-sm">VELS INSTITUTIONS CONTROL CENTER</p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">
                School, Higher Education & Professional/Medical Dashboard
              </h1>
              <p className="text-cyan-100 mt-2 text-sm sm:text-base max-w-4xl">
                Includes all India campuses from your classification model with clean filters and
                real-time style monitoring cards/charts.
              </p>
              <p className="text-cyan-100 mt-2 text-xs sm:text-sm">
                Official VELS snapshot: {OFFICIAL_TOTAL_STUDENTS.toLocaleString('en-IN')} students
                | {OFFICIAL_TOTAL_STAFF.toLocaleString('en-IN')} staff |{' '}
                {OFFICIAL_OVERALL_ATTENDANCE}% attendance
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-indigo-100 bg-white p-5 shadow-[0_10px_28px_rgba(79,70,229,0.10)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Full Control System Dashboard - Overview</h2>
              <p className="text-sm text-slate-600 mt-1">
                Centralized command center to monitor institutions, detect issues early, and enable fast action.
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Clock3 className="h-4 w-4" />
                Live Time: {format(liveNow, 'dd MMM yyyy, hh:mm:ss a')}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
              <p className="text-sm font-semibold text-cyan-900">Smooth Operations</p>
              <p className="text-xs text-cyan-800 mt-1">Track every institution from one dashboard.</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">Issue Detection</p>
              <p className="text-xs text-amber-800 mt-1">Prioritize low attendance and fee risks instantly.</p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
              <p className="text-sm font-semibold text-violet-900">Data-Driven Decisions</p>
              <p className="text-xs text-violet-800 mt-1">Use trends and predictions to plan corrective actions.</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">Admin Control</p>
              <p className="text-xs text-emerald-800 mt-1">Trigger reminders, notifications, and review actions.</p>
            </div>
          </div>
        </section>

        

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <MetricCard
              label="Total Institutions"
              value={String(summary.count)}
              icon={<Building2 className="h-5 w-5" />}
              tone="cyan"
            />
            <MetricCard
              label="Students / Staff"
              value={`${summary.students.toLocaleString('en-IN')} / ${summary.staff.toLocaleString('en-IN')}`}
              icon={<Users className="h-5 w-5" />}
              tone="indigo"
            />
            <MetricCard
              label="Overall Attendance"
              value={`${summary.attendance}%`}
              icon={<Activity className="h-5 w-5" />}
              tone="emerald"
            />
            <MetricCard
              label="Revenue Collected"
              value={formatCurrency(summary.collected)}
              icon={<IndianRupee className="h-5 w-5" />}
              tone="cyan"
            />
            <MetricCard
              label="Revenue Pending"
              value={formatCurrency(summary.pending)}
              alert
              icon={<IndianRupee className="h-5 w-5" />}
              tone="rose"
            />
            <MetricCard
              label="Active Alerts"
              value={String(filteredAlerts.length)}
              alert
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="amber"
            />
          </div>

          <ChartCard
            title="Students & Staff with Attendance %"
            className="w-full"
            icon={<BarChart3 className="h-4 w-4" />}
            tone="indigo"
          >
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={categoryPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[60, 100]} />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="students"
                  stroke="#0ea5e9"
                  fill="#bae6fd"
                  name="Students"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="staff"
                  stroke="#2563eb"
                  fill="#bfdbfe"
                  name="Staff"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="attendance"
                  stroke="#dc2626"
                  strokeWidth={2}
                  name="Attendance %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white border-2 border-cyan-100 rounded-2xl shadow-[0_10px_28px_rgba(8,145,178,0.12)] p-5 max-h-[860px] overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <h2 className="font-semibold text-slate-900">Institution Calendar</h2>
              </div>
              <div>
                <p className="text-xs text-slate-500 mt-1">
                  Events and announcements by date.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-3">
              <div className="grid grid-cols-3 items-center mb-3 gap-2">
                <div />
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSchoolCalendarMonth((prev) => subMonths(prev, 1))}
                    className="h-8 w-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                    aria-label="Previous month"
                  >
                    &#8249;
                  </button>
                  <p className="text-sm font-semibold text-slate-900 min-w-[130px] text-center">
                    {format(schoolCalendarMonth, 'MMMM yyyy')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSchoolCalendarMonth((prev) => addMonths(prev, 1))}
                    className="h-8 w-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                    aria-label="Next month"
                  >
                    &#8250;
                  </button>
                </div>
                <input
                  type="date"
                  value={schoolCalendarDate}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setSchoolCalendarDate(nextDate);
                    if (nextDate) {
                      setSchoolCalendarMonth(startOfMonth(new Date(`${nextDate}T00:00:00`)));
                    }
                  }}
                  className="justify-self-end rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
                />
              </div>

              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="rounded-md bg-white border border-slate-200 py-1 text-center text-[10px] font-semibold text-slate-600"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: startOfMonth(schoolCalendarMonth).getDay() }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-12 rounded-md" />
                ))}
                {schoolCalendarDays.map((day) => {
                  const dayString = format(day, 'yyyy-MM-dd');
                  const dayEvents = SCHOOL_CALENDAR_ENTRIES.filter((item) => item.date === dayString);
                  const hasEvents = dayEvents.length > 0;
                  const isSelected = dayString === schoolCalendarDate;

                  return (
                    <button
                      type="button"
                      key={day.toISOString()}
                      onClick={() => setSchoolCalendarDate(dayString)}
                      className={`h-12 rounded-md border p-1 text-left transition ${
                        isSelected
                          ? 'border-cyan-600 bg-cyan-100'
                          : hasEvents
                            ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                            : 'border-slate-200 bg-white hover:bg-slate-100'
                      } ${!isSameMonth(day, schoolCalendarMonth) ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            isToday(day) ? 'text-cyan-700' : 'text-slate-700'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        {hasEvents && (
                          <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] text-white">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
                <p className="text-[11px] text-slate-500">Selected Date</p>
                <p className="text-sm font-semibold text-slate-900">{schoolCalendarItems.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
                <p className="text-[11px] text-slate-500">This Month</p>
                <p className="text-sm font-semibold text-slate-900">{schoolCalendarEventsInMonth.length}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[210px] overflow-auto pr-1">
              {schoolCalendarItems.length === 0 ? (
                <p className="text-sm text-slate-500">No school events or announcements on this date.</p>
              ) : (
                schoolCalendarItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <span
                        className={`text-xs rounded-full px-2 py-1 ${
                          item.type === 'Event'
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{item.campus}</p>
                    <p className="text-xs text-slate-500 mt-2">{item.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border-2 border-violet-100 rounded-2xl shadow-[0_10px_28px_rgba(76,29,149,0.12)] p-5 max-h-[860px] overflow-y-auto">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <Building2 className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">Institution Categories</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              All category-wise institution cards in one container.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <CategoryPanel
                title="School Education"
                count={groupedInstitutions.school.length}
                items={groupedInstitutions.school}
                accent="teal"
              />
              <CategoryPanel
                title="Higher Education"
                count={groupedInstitutions.college.length}
                items={groupedInstitutions.college}
                accent="blue"
              />
              <CategoryPanel
                title="Professional / Medical"
                count={groupedInstitutions.medical.length}
                items={groupedInstitutions.medical}
                accent="red"
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4">
          <div className="bg-white border-2 border-emerald-100 rounded-2xl shadow-[0_10px_28px_rgba(5,150,105,0.12)] p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Activity className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">Institution Monitoring</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Filters below apply only to this monitoring chart.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3 mb-4">
              <select
                value={monitoringPeriod}
                onChange={(e) =>
                  setMonitoringPeriod(e.target.value as 'week' | 'month' | 'date')
                }
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="date">Date</option>
              </select>

              <select
                value={monitoringMonth}
                onChange={(e) => setMonitoringMonth(e.target.value)}
                disabled={monitoringPeriod !== 'month'}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="all">All Months</option>
                <option value="01">Jan</option>
                <option value="02">Feb</option>
                <option value="03">Mar</option>
                <option value="04">Apr</option>
                <option value="05">May</option>
                <option value="06">Jun</option>
                <option value="07">Jul</option>
                <option value="08">Aug</option>
                <option value="09">Sep</option>
                <option value="10">Oct</option>
                <option value="11">Nov</option>
                <option value="12">Dec</option>
              </select>

              <input
                type="date"
                value={monitoringDate}
                onChange={(e) => setMonitoringDate(e.target.value)}
                disabled={monitoringPeriod !== 'date'}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />

              <select
                value={monitoringCategory}
                onChange={(e) => setMonitoringCategory(e.target.value as 'all' | Category)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                <option value="all">All Categories</option>
                <option value="school">School</option>
                <option value="college">College</option>
                <option value="medical">Medical</option>
              </select>

              <select
                value={monitoringInstitution}
                onChange={(e) => setMonitoringInstitution(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                {monitoringInstitutionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Institutions' : option}
                  </option>
                ))}
              </select>

              <select
                value={monitoringSubType}
                onChange={(e) => setMonitoringSubType(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                {monitoringSubTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Sub Types' : option}
                  </option>
                ))}
              </select>

              <select
                value={monitoringLocation}
                onChange={(e) => setMonitoringLocation(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                {monitoringLocationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Locations' : option}
                  </option>
                ))}
              </select>
            </div>

            {institutionMonitoringData.length === 0 ? (
              <p className="text-sm text-slate-500">No institutions match monitoring filters.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 text-xs mb-2 text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-cyan-500" />
                    Students
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-blue-600" />
                    Staff
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-4 h-0.5 bg-red-600" />
                    Attendance %
                  </span>
                </div>

                <div className="h-[460px] overflow-y-auto pr-1 border-y border-slate-100">
                  <div style={{ height: `${Math.max(460, institutionMonitoringData.length * 56)}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={institutionMonitoringData}
                        layout="vertical"
                        margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" xAxisId="left" hide />
                        <XAxis type="number" xAxisId="right" hide domain={[60, 100]} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={220}
                          tick={{ fontSize: 11, fill: '#0f172a' }}
                          interval={0}
                        />
                        <Tooltip />
                        <Bar xAxisId="left" dataKey="students" fill="#0891b2" name="Students" />
                        <Bar xAxisId="left" dataKey="staff" fill="#2563eb" name="Staff" />
                        <Line
                          xAxisId="right"
                          type="monotone"
                          dataKey="attendance"
                          stroke="#dc2626"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          name="Attendance %"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-2 border border-slate-200 rounded-md bg-white p-2">
                  <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-700">
                    <div>
                      <p className="font-medium text-slate-600 mb-1">Students / Staff Axis (fixed)</p>
                      <div className="flex items-center justify-between">
                        <span>{monitoringAxisScale.people.min.toLocaleString('en-IN')}</span>
                        <span>{monitoringAxisScale.people.mid.toLocaleString('en-IN')}</span>
                        <span>{monitoringAxisScale.people.max.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-600 mb-1">Attendance Axis (fixed)</p>
                      <div className="flex items-center justify-between">
                        <span>{monitoringAxisScale.attendance.min}%</span>
                        <span>{monitoringAxisScale.attendance.mid}%</span>
                        <span>{monitoringAxisScale.attendance.max}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4">
          <ChartCard
            title="Revenue Details"
            className="shadow-[0_12px_30px_rgba(15,23,42,0.14)]"
            icon={<IndianRupee className="h-4 w-4" />}
            tone="rose"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-8 gap-3 mb-4">
              <select
                value={revenuePeriod}
                onChange={(e) => setRevenuePeriod(e.target.value as 'week' | 'month' | 'date')}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="date">Date</option>
              </select>

              <select
                value={revenueYear}
                onChange={(e) => setRevenueYear(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                <option value="all">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>

              <select
                value={revenueMonth}
                onChange={(e) => setRevenueMonth(e.target.value)}
                disabled={revenuePeriod !== 'month'}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="all">All Months</option>
                <option value="01">Jan</option>
                <option value="02">Feb</option>
                <option value="03">Mar</option>
                <option value="04">Apr</option>
                <option value="05">May</option>
                <option value="06">Jun</option>
                <option value="07">Jul</option>
                <option value="08">Aug</option>
                <option value="09">Sep</option>
                <option value="10">Oct</option>
                <option value="11">Nov</option>
                <option value="12">Dec</option>
              </select>

              <input
                type="date"
                value={revenueDate}
                onChange={(e) => setRevenueDate(e.target.value)}
                disabled={revenuePeriod !== 'date'}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />

              <select
                value={revenueCategory}
                onChange={(e) => setRevenueCategory(e.target.value as 'all' | Category)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                <option value="all">All Categories</option>
                <option value="school">School</option>
                <option value="college">College</option>
                <option value="medical">Medical</option>
              </select>

              <select
                value={revenueInstitution}
                onChange={(e) => setRevenueInstitution(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                {revenueInstitutionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Institutions' : option}
                  </option>
                ))}
              </select>

              <select
                value={revenueSubType}
                onChange={(e) => setRevenueSubType(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                {revenueSubTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Sub Types' : option}
                  </option>
                ))}
              </select>

              <select
                value={revenueLocation}
                onChange={(e) => setRevenueLocation(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
              >
                {revenueLocationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Locations' : option}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <div style={{ minWidth: `${Math.max(900, revenueData.length * 88)}px` }}>
                <ResponsiveContainer width="100%" height={420}>
                  <LineChart data={revenueData} margin={{ left: 10, right: 20, top: 10, bottom: 60 }}>
                    <defs>
                      <filter id="revenueCollectedShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#0ea5e9" floodOpacity="0.35" />
                      </filter>
                      <filter id="revenuePendingShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#dc2626" floodOpacity="0.35" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      tick={{ fontSize: 11 }}
                      height={70}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="collected"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      dot={{ r: 2 }}
                      filter="url(#revenueCollectedShadow)"
                      name="Collected (Lakhs)"
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      stroke="#dc2626"
                      strokeWidth={3}
                      dot={{ r: 2 }}
                      filter="url(#revenuePendingShadow)"
                      name="Pending (Lakhs)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartCard>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white border-2 border-amber-100 rounded-2xl shadow-[0_10px_28px_rgba(245,158,11,0.10)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <BellRing className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">Issue Tracking & Alert System</h2>
            </div>
            <div className="space-y-3">
              {prioritizedAlerts.length === 0 ? (
                <p className="text-sm text-slate-500">No active alerts for current filters.</p>
              ) : (
                prioritizedAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{alert.issue}</p>
                      <span
                        className={`text-xs rounded-full px-2 py-1 ${
                          alert.severity === 'High'
                            ? 'bg-rose-100 text-rose-700'
                            : alert.severity === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      {institutionsById[alert.institutionId]?.name ?? 'Unknown Institution'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{alert.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border-2 border-sky-100 rounded-2xl shadow-[0_10px_28px_rgba(14,165,233,0.10)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">What&apos;s Going On (Live Insights)</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {liveInsights.map((insight) => (
                <div key={insight.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">{insight.label}</p>
                  <p className="text-xs text-slate-600 mt-1">{insight.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-white border-2 border-indigo-100 rounded-2xl shadow-[0_10px_28px_rgba(99,102,241,0.10)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <UserCheck className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">Who Needs Attention / Meeting</h2>
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {institutionsNeedingAttention.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-600 mt-1">{item.location}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">
                      {item.reason}
                    </span>
                    <span className="font-semibold text-slate-700">Health: {item.healthScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border-2 border-emerald-100 rounded-2xl shadow-[0_10px_28px_rgba(16,185,129,0.10)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Zap className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">Action Control Panel</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setActionMessage(`Notifications sent at ${format(liveNow, 'hh:mm:ss a')}`);
                  pushAlert('Notifications sent to institution heads.', 'success');
                }}
                className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-3 text-left hover:bg-cyan-100 transition-colors"
              >
                <span className="flex items-start gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                    <Megaphone className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Send Notifications</span>
                    <span className="block text-xs text-slate-600 mt-0.5">Broadcast updates to heads and staff.</span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionMessage(`Fee reminders triggered at ${format(liveNow, 'hh:mm:ss a')}`);
                  pushAlert('Fee reminders triggered for pending accounts.', 'warning');
                }}
                className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-3 text-left hover:bg-orange-100 transition-colors"
              >
                <span className="flex items-start gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                    <WalletCards className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Trigger Fee Reminders</span>
                    <span className="block text-xs text-slate-600 mt-0.5">Push pending-fee reminders instantly.</span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionMessage(`Corrective tasks assigned at ${format(liveNow, 'hh:mm:ss a')}`);
                  pushAlert('Corrective tasks assigned to relevant teams.', 'info');
                }}
                className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-left hover:bg-violet-100 transition-colors"
              >
                <span className="flex items-start gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <ClipboardCheck className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Assign Corrective Tasks</span>
                    <span className="block text-xs text-slate-600 mt-0.5">Create and assign response actions.</span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionMessage(`Review meeting scheduled at ${format(liveNow, 'hh:mm:ss a')}`);
                  pushAlert('Review meeting scheduled with priority institutions.', 'success');
                }}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left hover:bg-emerald-100 transition-colors"
              >
                <span className="flex items-start gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <CalendarCheck2 className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Schedule Review Meeting</span>
                    <span className="block text-xs text-slate-600 mt-0.5">Set immediate intervention meetings.</span>
                  </span>
                </span>
              </button>
            </div>
            <p className="text-xs text-slate-700 mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              {actionMessage || 'Choose an action to simulate control-center operations.'}
            </p>
          </div>

          <div className="bg-white border-2 border-cyan-100 rounded-2xl shadow-[0_10px_28px_rgba(6,182,212,0.10)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                <Activity className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">Live Activity Monitoring</h2>
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {rotatingLiveFeed.length === 0 ? (
                <p className="text-sm text-slate-500">No live activity for current filters.</p>
              ) : (
                rotatingLiveFeed.map((event) => (
                  <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{event.detail}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {institutionsById[event.institutionId]?.name ?? 'Unknown Institution'}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] rounded-full bg-cyan-100 px-2 py-1 text-cyan-700">
                        {event.type}
                      </span>
                      <span className="text-[11px] text-slate-500">{event.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 w-full max-w-[1500px] mx-auto items-start">
          <ChartCard
            title="Performance & Trend Analysis"
            icon={<TrendingUp className="h-4 w-4" />}
            tone="emerald"
            className="w-full min-w-0"
          >
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={performanceTrendData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="trendAttendanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[60, 100]} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'Attendance %') return [`${value}%`, name];
                    return [`${value} Cr`, name];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="collected"
                  fill="#0ea5e9"
                  name="Collected (Cr)"
                  radius={[6, 6, 0, 0]}
                  barSize={20}
                />
                <Bar
                  yAxisId="left"
                  dataKey="pending"
                  fill="#f97316"
                  name="Pending (Cr)"
                  radius={[6, 6, 0, 0]}
                  barSize={20}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="attendance"
                  stroke="#dc2626"
                  strokeWidth={2}
                  fill="url(#trendAttendanceFill)"
                  name="Attendance %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="bg-white border-2 border-fuchsia-100 rounded-2xl shadow-[0_10px_28px_rgba(217,70,239,0.10)] p-5 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-700">
                <Target className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">Predictive Insights</h2>
            </div>
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {predictiveInsights.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <span className="text-xs rounded-full bg-fuchsia-100 px-2 py-1 text-fuchsia-700">
                      Risk Score: {item.riskScore}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  alert = false,
  icon,
  tone = 'cyan',
}: {
  label: string;
  value: string;
  alert?: boolean;
  icon?: React.ReactNode;
  tone?: 'cyan' | 'indigo' | 'emerald' | 'rose' | 'amber';
}) {
  const toneStyles = {
    cyan: 'border-cyan-200 bg-cyan-50/40',
    indigo: 'border-indigo-200 bg-indigo-50/40',
    emerald: 'border-emerald-200 bg-emerald-50/40',
    rose: 'border-rose-200 bg-rose-50/40',
    amber: 'border-amber-200 bg-amber-50/40',
  }[tone];

  const iconStyles = {
    cyan: 'bg-cyan-100 text-cyan-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
  }[tone];

  return (
    <div className={`rounded-xl border shadow-sm p-4 ${toneStyles}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-600">{label}</p>
        {icon ? (
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${iconStyles}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className={`mt-2 text-2xl font-bold ${alert ? 'text-red-600' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

function AlertStack({
  alerts,
  onClose,
}: {
  alerts: UiAlert[];
  onClose: (id: string) => void;
}) {
  const styles: Record<UiAlertLevel, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  };

  const icons: Record<UiAlertLevel, React.ReactNode> = {
    success: <CheckCircle2 className="h-4 w-4" />,
    error: <AlertTriangle className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] w-[min(92vw,360px)] space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-xl border px-3 py-2 shadow-md ${styles[alert.level]}`}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5">{icons[alert.level]}</span>
            <p className="text-sm font-medium flex-1">{alert.message}</p>
            <button
              type="button"
              onClick={() => onClose(alert.id)}
              className="rounded-md p-0.5 hover:bg-white/40"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryPanel({
  title,
  count,
  items,
  accent,
}: {
  title: string;
  count: number;
  items: Institution[];
  accent: 'teal' | 'blue' | 'red';
}) {
  const accentStyles = {
    teal: 'bg-teal-50 border-teal-200 text-teal-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    red: 'bg-rose-50 border-rose-200 text-rose-900',
  }[accent];

  const panelStyles = {
    teal: 'border-teal-100 shadow-[0_8px_20px_rgba(13,148,136,0.12)]',
    blue: 'border-blue-100 shadow-[0_8px_20px_rgba(37,99,235,0.12)]',
    red: 'border-rose-100 shadow-[0_8px_20px_rgba(225,29,72,0.12)]',
  }[accent];

  const accentIcon = {
    teal: <School className="h-4 w-4" />,
    blue: <GraduationCap className="h-4 w-4" />,
    red: <Stethoscope className="h-4 w-4" />,
  }[accent];

  return (
    <div className={`bg-white border rounded-2xl p-5 ${panelStyles}`}>
      <div className={`rounded-lg border px-3 py-2 ${accentStyles}`}>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/70">
            {accentIcon}
          </span>
          <p className="font-semibold">{title}</p>
        </div>
        <p className="text-sm mt-1">{count} institutions</p>
      </div>
      <div className="mt-3 max-h-72 overflow-auto space-y-2 pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No institutions in this filter.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-sm font-medium text-slate-800">{item.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {item.subType} | {item.location}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = '',
  icon,
  tone = 'cyan',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  tone?: 'cyan' | 'indigo' | 'emerald' | 'rose';
}) {
  const toneStyles = {
    cyan: 'border-cyan-100',
    indigo: 'border-indigo-100',
    emerald: 'border-emerald-100',
    rose: 'border-rose-100',
  }[tone];

  return (
    <div className={`bg-white border-2 rounded-2xl shadow-sm p-5 ${toneStyles} ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
            {icon}
          </span>
        ) : null}
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

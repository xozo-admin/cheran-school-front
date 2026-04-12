import dynamic from 'next/dynamic';

const AttendanceConfigPageClient = dynamic(
  () => import('./AttendanceConfigPageClient'),
  { ssr: false }
);

export default function AttendanceConfigPage() {
  return <AttendanceConfigPageClient />;
}

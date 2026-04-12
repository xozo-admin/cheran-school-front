import dynamic from 'next/dynamic';

const LiveTrackingClient = dynamic(
  () => import('./LiveTrackingClient'),
  { ssr: false }
);

export default function LiveTrackingPage() {
  return <LiveTrackingClient />;
}

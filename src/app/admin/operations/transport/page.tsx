import dynamic from 'next/dynamic';

const TransportManagementClient = dynamic(
  () => import('./TransportManagementClient'),
  { ssr: false }
);

export default function TransportManagementPage() {
  return <TransportManagementClient />;
}

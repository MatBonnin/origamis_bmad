import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PaymentCheckout } from '@/features/bookings/PaymentCheckout';

interface Props {
  searchParams: Promise<{ bookingId?: string }>;
}

export default async function PaiementPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/paiement');
  }

  const { bookingId } = await searchParams;
  if (!bookingId) {
    redirect('/bookings');
  }

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto', padding: '0 1rem' }}>
      <PaymentCheckout accessToken={session.accessToken} bookingId={bookingId} />
    </div>
  );
}

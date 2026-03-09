import Link from 'next/link';

export default function PaiementCancelPage() {
  return (
    <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
        Paiement annule
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Le paiement a ete annule. Votre session n&apos;a pas ete confirmee.
      </p>
      <Link
        href="/bookings"
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: '#6b7280',
          color: '#fff',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        Retour aux rendez-vous
      </Link>
    </div>
  );
}

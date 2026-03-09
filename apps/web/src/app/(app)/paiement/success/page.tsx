import Link from 'next/link';

export default function PaiementSuccessPage() {
  return (
    <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
        Paiement confirme !
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Votre paiement a ete accepte et votre session est maintenant confirmee.
      </p>
      <Link
        href="/sessions/history"
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: '#4f46e5',
          color: '#fff',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        Voir mes sessions
      </Link>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import styles from './PaymentCheckout.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Props {
  accessToken: string;
  bookingId: string;
}

export function PaymentCheckout({ accessToken, bookingId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/payments/bookings/${bookingId}/checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Impossible de creer la session de paiement');
        return;
      }
      const checkoutUrl = result.data?.checkoutUrl as string | undefined;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [accessToken, bookingId]);

  useEffect(() => {
    void handleCheckout();
  }, [handleCheckout]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redirection vers le paiement</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={styles.info}>
          Vous allez etre redirige vers Stripe pour finaliser le paiement de votre session.
        </p>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        <Button
          type="button"
          onClick={() => void handleCheckout()}
          isLoading={loading}
          aria-busy={loading}
        >
          {loading ? 'Redirection...' : 'Reessayer'}
        </Button>
      </CardContent>
    </Card>
  );
}

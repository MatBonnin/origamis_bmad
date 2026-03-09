'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import styles from './BillingSection.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Invoice {
  id: string;
  amount_cents: number;
  invoice_pdf_url: string | null;
  created_at: string;
}

interface Subscription {
  plan: string;
  status: string;
  invoices: Invoice[];
}

interface PaymentRecord {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  booking: {
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
  };
}

interface Props {
  accessToken: string;
}

export function BillingSection({ accessToken }: Props) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers = { Authorization: `Bearer ${accessToken}` };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [subRes, payRes] = await Promise.all([
        fetch(`${API_URL}/payments/subscription`, { headers, cache: 'no-store' }),
        fetch(`${API_URL}/payments/history`, { headers, cache: 'no-store' }),
      ]);

      const subResult = await subRes.json();
      const payResult = await payRes.json();

      if (subRes.ok && !subResult.error) {
        setSubscription(subResult.data as Subscription);
      }
      if (payRes.ok && !payResult.error) {
        setPayments((payResult.data as PaymentRecord[]) ?? []);
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleUpgrade = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/payments/subscription`, {
        method: 'POST',
        headers,
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
      setError('Erreur de connexion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Confirmer l\'annulation de votre abonnement premium ?')) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/payments/subscription`, {
        method: 'DELETE',
        headers,
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Impossible d\'annuler l\'abonnement');
        return;
      }
      setSuccess('Abonnement annule');
      void loadData();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setActionLoading(false);
    }
  };

  const formatAmount = (cents: number) =>
    (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    succeeded: 'Paye',
    failed: 'Echoue',
    refunded: 'Rembourse',
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.success} role="status">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mon abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.planBadge} data-plan={subscription?.plan ?? 'free'}>
            Plan {subscription?.plan === 'premium' ? 'Premium' : 'Gratuit'}
          </div>
          {subscription?.status && (
            <p className={styles.planStatus}>Statut : {subscription.status}</p>
          )}
          <div className={styles.planActions}>
            {subscription?.plan !== 'premium' ? (
              <Button
                type="button"
                onClick={() => void handleUpgrade()}
                isLoading={actionLoading}
              >
                Passer a Premium
              </Button>
            ) : (
              <Button
                variant="outline"
                type="button"
                onClick={() => void handleCancel()}
                isLoading={actionLoading}
              >
                Annuler l&apos;abonnement
              </Button>
            )}
          </div>

          {(subscription?.invoices ?? []).length > 0 && (
            <div className={styles.invoices}>
              <h3 className={styles.invoicesTitle}>Factures</h3>
              <ul className={styles.invoiceList}>
                {(subscription?.invoices ?? []).map((inv) => (
                  <li key={inv.id} className={styles.invoiceItem}>
                    <span>{formatDate(inv.created_at)}</span>
                    <span>{formatAmount(inv.amount_cents)}</span>
                    {inv.invoice_pdf_url && (
                      <a
                        href={inv.invoice_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.pdfLink}
                      >
                        PDF
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className={styles.empty}>Aucun paiement pour le moment.</p>
          ) : (
            <ul className={styles.paymentList}>
              {payments.map((payment) => (
                <li key={payment.id} className={styles.paymentItem}>
                  <span className={styles.paymentDate}>
                    {formatDate(payment.booking.booking_date)}
                  </span>
                  <span className={styles.paymentTime}>
                    {payment.booking.start_time} - {payment.booking.end_time}
                  </span>
                  <span className={styles.paymentAmount}>
                    {formatAmount(payment.amount_cents)}
                  </span>
                  <span
                    className={styles.paymentStatus}
                    data-status={payment.status}
                  >
                    {STATUS_LABELS[payment.status] ?? payment.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui';
import styles from './AnalyticsDashboard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type DashboardType = 'matching' | 'usage' | 'incidents';

export function AnalyticsDashboard({ accessToken }: { accessToken: string }) {
  const [dashboardType, setDashboardType] = useState<DashboardType>('usage');
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [reportUrl, setReportUrl] = useState('');
  const [error, setError] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  const loadDashboard = async () => {
    setError('');
    const response = await fetch(`${API_URL}/analytics/dashboard?type=${dashboardType}`, {
      headers,
      cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      setError(result.error?.message || 'Impossible de charger le dashboard');
      return;
    }
    setMetrics((result.data.metrics ?? {}) as Record<string, number>);
  };

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardType]);

  const generateReport = async (format: 'csv' | 'pdf') => {
    const create = await fetch(`${API_URL}/analytics/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: dashboardType, format }),
    });
    const createResult = await create.json();
    if (!create.ok || createResult.error) {
      setError(createResult.error?.message || 'Generation de rapport impossible');
      return;
    }

    const reportId = createResult.data.reportId as string;
    const report = await fetch(`${API_URL}/analytics/reports/${reportId}`, {
      headers,
      cache: 'no-store',
    });
    const reportResult = await report.json();
    if (!report.ok || reportResult.error) {
      setError(reportResult.error?.message || 'Recuperation rapport impossible');
      return;
    }

    setReportUrl((reportResult.data.report?.downloadUrl ?? '') as string);
  };

  return (
    <section className={styles.container} aria-labelledby="analytics-dashboard-title">
      <header className={styles.header}>
        <h1 id="analytics-dashboard-title" className={styles.title}>Dashboard analytics</h1>
        <p className={styles.subtitle}>Suivi matching, usage et incidents.</p>
      </header>

      <div className={styles.toolbar}>
        <Select
          aria-label="Type dashboard"
          value={dashboardType}
          options={[
            { value: 'usage', label: 'usage' },
            { value: 'matching', label: 'matching' },
            { value: 'incidents', label: 'incidents' },
          ]}
          onChange={(event) => setDashboardType(event.target.value as DashboardType)}
        />
        <Button type="button" size="sm" onClick={() => void generateReport('csv')}>Export CSV</Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => void generateReport('pdf')}>Export PDF</Button>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.grid}>
        {Object.entries(metrics).map(([key, value]) => (
          <Card key={key} variant="outlined">
            <CardHeader>
              <CardTitle>{key}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={styles.metricValue}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {reportUrl && (
        <a href={reportUrl} className={styles.downloadLink} aria-label="Telecharger le rapport">
          Telecharger le rapport
        </a>
      )}
    </section>
  );
}

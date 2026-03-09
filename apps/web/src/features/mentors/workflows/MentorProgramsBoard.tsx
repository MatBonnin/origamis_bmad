'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';
import styles from './MentorProgramsBoard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type MilestoneStatus = 'planned' | 'in_progress' | 'review' | 'done' | 'blocked';

interface ProgramMilestone {
  milestoneId: string;
  title: string;
  description?: string | null;
  order: number;
  deadlineAt: string;
  status: MilestoneStatus;
}

interface ProgramItem {
  programId: string;
  templateId?: string | null;
  mentorId: string;
  studentId: string;
  studentName?: string;
  title: string;
  status: string;
  startAt: string;
  milestones: ProgramMilestone[];
}

interface TemplateItem {
  templateId: string;
  title: string;
}

interface ProgramDocument {
  documentId: string;
  type: string;
  fileName?: string | null;
  createdAt: string;
  downloadUrl: string;
}

interface Props {
  accessToken: string;
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planifie' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'review', label: 'En validation' },
  { value: 'done', label: 'Termine' },
  { value: 'blocked', label: 'Bloque' },
];

export function MentorProgramsBoard({ accessToken }: Props) {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [documents, setDocuments] = useState<ProgramDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignTemplateId, setAssignTemplateId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [programRes, templateRes] = await Promise.all([
        fetch(`${API_URL}/mentor/programs`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
        fetch(`${API_URL}/mentor/program-templates`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
      ]);

      const programResult = await programRes.json();
      const templateResult = await templateRes.json();

      if (!programRes.ok || programResult.error) {
        setError(programResult.error?.message || 'Impossible de charger les parcours');
        return;
      }
      if (!templateRes.ok || templateResult.error) {
        setError(templateResult.error?.message || 'Impossible de charger les templates');
        return;
      }

      const nextPrograms = (programResult.data?.programs ?? []) as ProgramItem[];
      const nextTemplates = (templateResult.data?.templates ?? []) as TemplateItem[];
      setPrograms(nextPrograms);
      setTemplates(nextTemplates);

      if (nextTemplates.length > 0 && !assignTemplateId) {
        setAssignTemplateId(nextTemplates[0].templateId);
      }
      if (nextPrograms.length > 0 && !selectedProgramId) {
        setSelectedProgramId(nextPrograms[0].programId);
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [accessToken, assignTemplateId, selectedProgramId]);

  useEffect(() => {
    void loadPrograms();
  }, [loadPrograms]);

  const selectedProgram = programs.find((program) => program.programId === selectedProgramId) ?? null;

  const loadDocuments = useCallback(async () => {
    if (!selectedProgramId) {
      setDocuments([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/programs/${selectedProgramId}/documents`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        return;
      }
      setDocuments((result.data?.documents ?? []) as ProgramDocument[]);
    } catch {
      // Non-blocking
    }
  }, [accessToken, selectedProgramId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const updateMilestoneStatus = async (milestoneId: string, status: MilestoneStatus) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/mentor/program-milestones/${milestoneId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Mise a jour impossible');
        return;
      }
      await loadPrograms();
      await loadDocuments();
    } catch {
      setError('Erreur de connexion');
    }
  };

  const assignProgram = async () => {
    if (!assignStudentId || !assignTemplateId) {
      setError('Renseignez studentId et template');
      return;
    }
    setError('');
    try {
      const res = await fetch(`${API_URL}/students/${assignStudentId}/programs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          templateId: assignTemplateId,
          title: assignTitle || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Assignation impossible');
        return;
      }
      setAssignStudentId('');
      setAssignTitle('');
      await loadPrograms();
    } catch {
      setError('Erreur de connexion');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const templateOptions = templates.map((template) => ({
    value: template.templateId,
    label: template.title,
  }));

  return (
    <section className={styles.container} aria-labelledby="mentor-programs-title">
      <header className={styles.header}>
        <h1 id="mentor-programs-title" className={styles.title}>
          Parcours etudiants
        </h1>
        <p className={styles.subtitle}>
          Gerez les jalons, les deadlines et les documents de suivi.
        </p>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Assigner un parcours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.assignGrid}>
            <Input
              name="studentId"
              label="Student ID"
              value={assignStudentId}
              onChange={(e) => setAssignStudentId(e.target.value)}
            />
            <Select
              name="templateId"
              label="Template"
              value={assignTemplateId}
              options={templateOptions}
              onChange={(e) => setAssignTemplateId(e.target.value)}
            />
            <Input
              name="title"
              label="Titre (optionnel)"
              value={assignTitle}
              onChange={(e) => setAssignTitle(e.target.value)}
            />
            <Button type="button" onClick={() => void assignProgram()}>
              Assigner
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className={styles.loading} aria-busy="true">
          Chargement...
        </p>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent>
            <p className={styles.empty}>Aucun parcours actif.</p>
          </CardContent>
        </Card>
      ) : (
        <div className={styles.grid}>
          <Card>
            <CardHeader>
              <CardTitle>Liste des parcours</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className={styles.programList}>
                {programs.map((program) => (
                  <li key={program.programId}>
                    <button
                      type="button"
                      className={
                        selectedProgramId === program.programId
                          ? styles.programButtonActive
                          : styles.programButton
                      }
                      onClick={() => setSelectedProgramId(program.programId)}
                    >
                      <span>{program.title}</span>
                      <span>{program.studentName || program.studentId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {selectedProgram && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedProgram.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={styles.meta}>
                  Etudiant: {selectedProgram.studentName || selectedProgram.studentId}
                </p>
                <p className={styles.meta}>
                  Debut: {formatDate(selectedProgram.startAt)}
                </p>
                <p className={styles.meta}>Statut: {selectedProgram.status}</p>
                <p className={styles.meta}>
                  <Link href={`/mentor/progression?studentId=${selectedProgram.studentId}`}>
                    Ouvrir le suivi mentor
                  </Link>
                </p>

                <h3 className={styles.sectionTitle}>Jalons</h3>
                <ul className={styles.milestoneList}>
                  {selectedProgram.milestones.map((milestone) => (
                    <li key={milestone.milestoneId} className={styles.milestoneItem}>
                      <div>
                        <p className={styles.milestoneTitle}>{milestone.title}</p>
                        <p className={styles.meta}>Deadline: {formatDate(milestone.deadlineAt)}</p>
                      </div>
                      <Select
                        name={`status-${milestone.milestoneId}`}
                        label="Statut"
                        value={milestone.status}
                        options={STATUS_OPTIONS}
                        onChange={(e) =>
                          void updateMilestoneStatus(
                            milestone.milestoneId,
                            e.target.value as MilestoneStatus,
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>

                <h3 className={styles.sectionTitle}>Documents</h3>
                {documents.length === 0 ? (
                  <p className={styles.meta}>Aucun document.</p>
                ) : (
                  <ul className={styles.docsList}>
                    {documents.map((doc) => (
                      <li key={doc.documentId}>
                        <a href={doc.downloadUrl} target="_blank" rel="noreferrer">
                          {doc.fileName || doc.type}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}


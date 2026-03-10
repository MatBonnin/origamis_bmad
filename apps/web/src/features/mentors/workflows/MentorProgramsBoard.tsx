'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CircleDashed,
  FileText,
  Flag,
  LayoutTemplate,
  Sparkles,
  UserRound,
} from 'lucide-react';
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

interface MentorStudentOption {
  studentId: string;
  fullName: string;
  avatarUrl?: string | null;
  relationSource: 'request' | 'booking';
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

const STATUS_META: Record<MilestoneStatus, { label: string; tone: string }> = {
  planned: { label: 'Planifie', tone: 'planned' },
  in_progress: { label: 'En cours', tone: 'inProgress' },
  review: { label: 'En validation', tone: 'review' },
  done: { label: 'Termine', tone: 'done' },
  blocked: { label: 'Bloque', tone: 'blocked' },
};

export function MentorProgramsBoard({ accessToken }: Props) {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [students, setStudents] = useState<MentorStudentOption[]>([]);
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

  const formatDate = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    [],
  );

  const isPastDeadline = useCallback((iso: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(iso);
    deadline.setHours(0, 0, 0, 0);
    return deadline < today;
  }, []);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [programRes, templateRes, studentRes] = await Promise.all([
        fetch(`${API_URL}/mentor/programs`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
        fetch(`${API_URL}/mentor/program-templates`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
        fetch(`${API_URL}/mentor/students`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
      ]);

      const programResult = await programRes.json();
      const templateResult = await templateRes.json();
      const studentsResult = await studentRes.json();

      if (!programRes.ok || programResult.error) {
        setError(programResult.error?.message || 'Impossible de charger les parcours');
        return;
      }
      if (!templateRes.ok || templateResult.error) {
        setError(templateResult.error?.message || 'Impossible de charger les templates');
        return;
      }
      if (!studentRes.ok || studentsResult.error) {
        setError(studentsResult.error?.message || 'Impossible de charger les etudiants');
        return;
      }

      const nextPrograms = (programResult.data?.programs ?? []) as ProgramItem[];
      const nextTemplates = (templateResult.data?.templates ?? []) as TemplateItem[];
      const nextStudents = (studentsResult.data?.students ?? []) as MentorStudentOption[];
      setPrograms(nextPrograms);
      setTemplates(nextTemplates);
      setStudents(nextStudents);

      if (nextTemplates.length > 0 && !assignTemplateId) {
        setAssignTemplateId(nextTemplates[0].templateId);
      }
      if (nextStudents.length === 0) {
        setAssignStudentId('');
      } else if (!nextStudents.some((student) => student.studentId === assignStudentId)) {
        setAssignStudentId(nextStudents[0].studentId);
      }

      if (nextPrograms.length === 0) {
        setSelectedProgramId('');
      } else if (!nextPrograms.some((program) => program.programId === selectedProgramId)) {
        setSelectedProgramId(nextPrograms[0].programId);
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [accessToken, assignStudentId, assignTemplateId, selectedProgramId]);

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
      setError('Selectionnez un etudiant et un template');
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

  const templateOptions = templates.map((template) => ({
    value: template.templateId,
    label: template.title,
  }));

  const studentOptions = students.map((student) => ({
    value: student.studentId,
    label:
      student.fullName +
      (programs.some((program) => program.studentId === student.studentId) ? ' · deja actif' : ''),
  }));

  const programsSummary = useMemo(() => {
    const uniqueStudents = new Set(programs.map((program) => program.studentId));
    const milestones = programs.flatMap((program) => program.milestones);
    const completedMilestones = milestones.filter((milestone) => milestone.status === 'done').length;
    const overdueMilestones = milestones.filter(
      (milestone) => milestone.status !== 'done' && isPastDeadline(milestone.deadlineAt),
    ).length;

    return {
      programsCount: programs.length,
      studentsCount: uniqueStudents.size,
      completedMilestones,
      overdueMilestones,
      totalMilestones: milestones.length,
    };
  }, [isPastDeadline, programs]);

  const selectedSummary = useMemo(() => {
    if (!selectedProgram) {
      return null;
    }

    const completed = selectedProgram.milestones.filter((milestone) => milestone.status === 'done').length;
    const pendingReview = selectedProgram.milestones.filter((milestone) => milestone.status === 'review').length;
    const blocked = selectedProgram.milestones.filter((milestone) => milestone.status === 'blocked').length;
    const nextDeadline = [...selectedProgram.milestones]
      .filter((milestone) => milestone.status !== 'done')
      .sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime())[0];

    return {
      completed,
      pendingReview,
      blocked,
      progress:
        selectedProgram.milestones.length > 0
          ? Math.round((completed / selectedProgram.milestones.length) * 100)
          : 0,
      nextDeadline,
    };
  }, [selectedProgram]);

  return (
    <section className={styles.page} aria-labelledby="mentor-programs-title">
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <Sparkles size={16} aria-hidden="true" />
            Pilotage mentor
          </span>
          <h1 id="mentor-programs-title" className={styles.title}>
            Parcours etudiants
          </h1>
          <p className={styles.subtitle}>
            Centralisez l&apos;assignation, le suivi des jalons et les documents de progression
            dans une vue plus claire pour vos accompagnements en cours.
          </p>
        </div>

        <div className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Parcours actifs</span>
            <strong className={styles.metricValue}>{programsSummary.programsCount}</strong>
            <span className={styles.metricHint}>programmes actuellement suivis</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Etudiants engages</span>
            <strong className={styles.metricValue}>{programsSummary.studentsCount}</strong>
            <span className={styles.metricHint}>mentores distincts relies a ces parcours</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Jalons termines</span>
            <strong className={styles.metricValue}>
              {programsSummary.completedMilestones}
              <span className={styles.metricUnit}>/{programsSummary.totalMilestones}</span>
            </strong>
            <span className={styles.metricHint}>avancement global de vos cohortes</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Deadlines a surveiller</span>
            <strong className={styles.metricValue}>{programsSummary.overdueMilestones}</strong>
            <span className={styles.metricHint}>jalons en retard a relancer</span>
          </article>
        </div>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <strong>Attention</strong>
          <span>{error}</span>
        </div>
      )}

      <Card className={styles.assignCard} variant="elevated">
        <CardContent className={styles.assignCardContent}>
          <div className={styles.assignIntro}>
            <span className={styles.assignIcon}>
              <LayoutTemplate size={18} aria-hidden="true" />
            </span>
            <div>
              <p className={styles.assignEyebrow}>Nouvelle assignation</p>
              <h2 className={styles.assignTitle}>Lancer un parcours sans quitter votre board</h2>
              <p className={styles.assignDescription}>
                Associez un template existant a un etudiant, personnalisez le titre si besoin,
                puis commencez le suivi des jalons depuis cette meme interface.
              </p>
            </div>
          </div>

          <div className={styles.assignGrid}>
            <div className={styles.assignField}>
              <Select
                name="studentId"
                label="Etudiant"
                value={assignStudentId}
                options={studentOptions}
                placeholder={
                  students.length > 0
                    ? 'Selectionnez un etudiant'
                    : 'Aucun etudiant disponible'
                }
                disabled={students.length === 0}
                onChange={(e) => setAssignStudentId(e.target.value)}
              />
              <p className={styles.assignFieldHint}>
                {students.length > 0
                  ? 'Liste limitee a vos etudiants actuellement relies a votre mentorat.'
                  : 'Acceptez une demande ou finalisez un booking pour voir un etudiant ici.'}
              </p>
            </div>
            <div className={styles.assignField}>
              <Select
                name="templateId"
                label="Template"
                value={assignTemplateId}
                options={templateOptions}
                onChange={(e) => setAssignTemplateId(e.target.value)}
              />
            </div>
            <Input
              name="title"
              label="Titre personnalise"
              value={assignTitle}
              onChange={(e) => setAssignTitle(e.target.value)}
            />
            <div className={styles.assignAction}>
              <Button
                type="button"
                size="lg"
                disabled={students.length === 0 || !assignTemplateId}
                onClick={() => void assignProgram()}
              >
                Assigner le parcours
              </Button>
              <p className={styles.assignHint}>Les jalons seront crees a partir du template choisi.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className={styles.loadingPanel} aria-busy="true">
          <div className={styles.loadingPulse} />
          <p className={styles.loadingText}>Chargement des parcours en cours...</p>
        </div>
      ) : programs.length === 0 ? (
        <Card className={styles.emptyCard}>
          <CardContent className={styles.emptyContent}>
            <CircleDashed size={28} aria-hidden="true" />
            <h2 className={styles.emptyTitle}>Aucun parcours actif</h2>
            <p className={styles.emptyText}>
              Commencez par assigner un template a un etudiant pour structurer son accompagnement.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={styles.board}>
          <Card className={styles.sidebarCard}>
            <CardHeader className={styles.cardHeader}>
              <div>
                <CardTitle>Portefeuille mentor</CardTitle>
                <p className={styles.cardSubtitle}>
                  Selectionnez un parcours pour gerer ses jalons et ses ressources.
                </p>
              </div>
              <span className={styles.counterBadge}>{programs.length}</span>
            </CardHeader>
            <CardContent>
              <ul className={styles.programList}>
                {programs.map((program) => {
                  const completedMilestones = program.milestones.filter(
                    (milestone) => milestone.status === 'done',
                  ).length;
                  const overdueMilestones = program.milestones.filter(
                    (milestone) =>
                      milestone.status !== 'done' && isPastDeadline(milestone.deadlineAt),
                  ).length;
                  const progress =
                    program.milestones.length > 0
                      ? Math.round((completedMilestones / program.milestones.length) * 100)
                      : 0;
                  const isSelected = selectedProgramId === program.programId;

                  return (
                    <li key={program.programId}>
                      <button
                        type="button"
                        className={isSelected ? styles.programButtonActive : styles.programButton}
                        onClick={() => setSelectedProgramId(program.programId)}
                      >
                        <div className={styles.programTopRow}>
                          <span className={styles.programTitle}>{program.title}</span>
                          <span className={styles.programStatus}>{program.status}</span>
                        </div>
                        <div className={styles.programMetaRow}>
                          <span className={styles.programMeta}>
                            <UserRound size={14} aria-hidden="true" />
                            {program.studentName || program.studentId}
                          </span>
                          <span className={styles.programMeta}>
                            <CalendarClock size={14} aria-hidden="true" />
                            Debut {formatDate(program.startAt)}
                          </span>
                        </div>
                        <div className={styles.programProgressRow}>
                          <div className={styles.progressTrack} aria-hidden="true">
                            <span className={styles.progressFill} style={{ width: `${progress}%` }} />
                          </div>
                          <span className={styles.progressLabel}>{progress}% complete</span>
                        </div>
                        <div className={styles.programFootRow}>
                          <span>{completedMilestones}/{program.milestones.length} jalons finis</span>
                          <span>{overdueMilestones} en retard</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {selectedProgram && selectedSummary && (
            <div className={styles.detailColumn}>
              <Card className={styles.overviewCard}>
                <CardContent className={styles.overviewContent}>
                  <div className={styles.overviewTopRow}>
                    <div>
                      <p className={styles.overviewEyebrow}>Programme selectionne</p>
                      <h2 className={styles.overviewTitle}>{selectedProgram.title}</h2>
                    </div>
                    <Link
                      href={`/mentor/progression?studentId=${selectedProgram.studentId}`}
                      className={styles.progressionLink}
                    >
                      Ouvrir le suivi mentor
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>

                  <div className={styles.identityRow}>
                    <span className={styles.identityChip}>
                      <UserRound size={14} aria-hidden="true" />
                      Etudiant: {selectedProgram.studentName || selectedProgram.studentId}
                    </span>
                    <span className={styles.identityChip}>
                      <Flag size={14} aria-hidden="true" />
                      Statut: {selectedProgram.status}
                    </span>
                    <span className={styles.identityChip}>
                      <CalendarClock size={14} aria-hidden="true" />
                      Debut: {formatDate(selectedProgram.startAt)}
                    </span>
                  </div>

                  <div className={styles.summaryGrid}>
                    <article className={styles.summaryCard}>
                      <span className={styles.summaryLabel}>Progression</span>
                      <strong className={styles.summaryValue}>{selectedSummary.progress}%</strong>
                      <span className={styles.summaryHint}>jalons termines</span>
                    </article>
                    <article className={styles.summaryCard}>
                      <span className={styles.summaryLabel}>En validation</span>
                      <strong className={styles.summaryValue}>{selectedSummary.pendingReview}</strong>
                      <span className={styles.summaryHint}>retours a verifier</span>
                    </article>
                    <article className={styles.summaryCard}>
                      <span className={styles.summaryLabel}>Bloquants</span>
                      <strong className={styles.summaryValue}>{selectedSummary.blocked}</strong>
                      <span className={styles.summaryHint}>points a debloquer</span>
                    </article>
                    <article className={styles.summaryCard}>
                      <span className={styles.summaryLabel}>Prochaine echeance</span>
                      <strong className={styles.summaryValue}>
                        {selectedSummary.nextDeadline
                          ? formatDate(selectedSummary.nextDeadline.deadlineAt)
                          : 'Aucune'}
                      </strong>
                      <span className={styles.summaryHint}>
                        {selectedSummary.nextDeadline?.title || 'Tous les jalons sont termines'}
                      </span>
                    </article>
                  </div>
                </CardContent>
              </Card>

              <div className={styles.detailGrid}>
                <Card className={styles.milestonesCard}>
                  <CardHeader className={styles.cardHeader}>
                    <div>
                      <CardTitle>Jalons</CardTitle>
                      <p className={styles.cardSubtitle}>
                        Mettez a jour le statut au fil de l&apos;accompagnement.
                      </p>
                    </div>
                    <span className={styles.counterBadge}>{selectedProgram.milestones.length}</span>
                  </CardHeader>
                  <CardContent>
                    <ul className={styles.milestoneList}>
                      {selectedProgram.milestones.map((milestone) => {
                        const statusMeta = STATUS_META[milestone.status];
                        const overdue =
                          milestone.status !== 'done' && isPastDeadline(milestone.deadlineAt);

                        return (
                          <li key={milestone.milestoneId} className={styles.milestoneItem}>
                            <div className={styles.milestoneHeader}>
                              <div>
                                <p className={styles.milestoneTitle}>{milestone.title}</p>
                                {milestone.description ? (
                                  <p className={styles.milestoneDescription}>
                                    {milestone.description}
                                  </p>
                                ) : null}
                              </div>
                              <span
                                className={`${styles.statusPill} ${styles[`status${statusMeta.tone}`]}`}
                              >
                                {statusMeta.label}
                              </span>
                            </div>

                            <div className={styles.milestoneFooter}>
                              <p className={styles.deadlineText} data-overdue={overdue}>
                                Deadline: {formatDate(milestone.deadlineAt)}
                                {overdue ? ' · en retard' : ''}
                              </p>
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
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>

                <Card className={styles.documentsCard}>
                  <CardHeader className={styles.cardHeader}>
                    <div>
                      <CardTitle>Documents</CardTitle>
                      <p className={styles.cardSubtitle}>
                        Ressources generees et fichiers partages pour ce parcours.
                      </p>
                    </div>
                    <span className={styles.counterBadge}>{documents.length}</span>
                  </CardHeader>
                  <CardContent>
                    {documents.length === 0 ? (
                      <div className={styles.documentsEmpty}>
                        <FileText size={20} aria-hidden="true" />
                        <p>Aucun document disponible pour le moment.</p>
                      </div>
                    ) : (
                      <ul className={styles.docsList}>
                        {documents.map((doc) => (
                          <li key={doc.documentId}>
                            <a
                              href={doc.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.documentLink}
                            >
                              <div className={styles.documentIcon}>
                                <FileText size={18} aria-hidden="true" />
                              </div>
                              <div className={styles.documentBody}>
                                <span className={styles.documentName}>{doc.fileName || doc.type}</span>
                                <span className={styles.documentMeta}>
                                  Ajoute le {formatDate(doc.createdAt)}
                                </span>
                              </div>
                              <ArrowRight size={16} aria-hidden="true" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

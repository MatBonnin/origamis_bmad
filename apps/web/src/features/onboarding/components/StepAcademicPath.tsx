'use client';

import { domains, levels, graduationYears } from '../constants/academicOptions';
import styles from './StepAcademicPath.module.css';

interface StepAcademicPathProps {
  domain: string;
  level: string;
  graduationYear: string;
  onChangeDomain: (value: string) => void;
  onChangeLevel: (value: string) => void;
  onChangeGraduationYear: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepAcademicPath({
  domain,
  level,
  graduationYear,
  onChangeDomain,
  onChangeLevel,
  onChangeGraduationYear,
  onBack,
  onNext,
}: StepAcademicPathProps) {
  const canContinue = domain && level && graduationYear;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Votre parcours academique</h1>
      <p className={styles.subtitle}>
        Ces informations nous aident a trouver les mentors les plus adaptes
      </p>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Formation actuelle</h2>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="domain" className={styles.label}>
              Domaine d&apos;etudes
            </label>
            <select
              id="domain"
              className={styles.select}
              value={domain}
              onChange={(e) => onChangeDomain(e.target.value)}
            >
              <option value="">Selectionnez un domaine</option>
              {domains.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="level" className={styles.label}>
              Niveau d&apos;etudes
            </label>
            <select
              id="level"
              className={styles.select}
              value={level}
              onChange={(e) => onChangeLevel(e.target.value)}
            >
              <option value="">Selectionnez un niveau</option>
              {levels.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="graduationYear" className={styles.label}>
              Annee de diplome prevue
            </label>
            <select
              id="graduationYear"
              className={styles.select}
              value={graduationYear}
              onChange={(e) => onChangeGraduationYear(e.target.value)}
            >
              <option value="">Selectionnez une annee</option>
              {graduationYears.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.buttons}>
        <button type="button" className={styles.buttonOutline} onClick={onBack}>
          Retour
        </button>
        <button
          type="button"
          className={styles.buttonFilled}
          onClick={onNext}
          disabled={!canContinue}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

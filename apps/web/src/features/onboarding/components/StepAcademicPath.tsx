'use client';

import { Button, Select, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
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

      <Card className={styles.card}>
        <CardHeader>
          <CardTitle>Formation actuelle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.fields}>
            <Select
              label="Domaine d'etudes"
              options={domains}
              value={domain}
              onChange={(e) => onChangeDomain(e.target.value)}
              placeholder="Selectionnez un domaine"
            />
            <Select
              label="Niveau d'etudes"
              options={levels}
              value={level}
              onChange={(e) => onChangeLevel(e.target.value)}
              placeholder="Selectionnez un niveau"
            />
            <Select
              label="Annee de diplome prevue"
              options={graduationYears}
              value={graduationYear}
              onChange={(e) => onChangeGraduationYear(e.target.value)}
              placeholder="Selectionnez une annee"
            />
          </div>
        </CardContent>
      </Card>

      <div className={styles.buttons}>
        <Button variant="outline" size="lg" onClick={onBack}>
          Retour
        </Button>
        <Button size="lg" onClick={onNext} disabled={!canContinue}>
          Continuer
        </Button>
      </div>
    </div>
  );
}

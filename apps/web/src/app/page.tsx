import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap, Video, Users, Route } from 'lucide-react';
import logo from '@/app/assets/logo.png';
import styles from './page.module.css';

const steps = [
  {
    icon: GraduationCap,
    number: '1',
    title: 'Definis ton besoin',
    description: 'Onboarding guide pour clarifier niveau, objectifs et priorites.',
  },
  {
    icon: Users,
    number: '2',
    title: 'Trouve ton mentor',
    description: 'Recommandations et recherche ciblee selon ton profil.',
  },
  {
    icon: Route,
    number: '3',
    title: 'Passe a l\'action',
    description: 'Sessions, jalons et suivi de progression sur la duree.',
  },
];

const benefits = [
  {
    icon: GraduationCap,
    text: 'Un accompagnement personnalise pour etudiants et jeunes diplomes.',
  },
  {
    icon: Video,
    text: 'Des objectifs mesurables avec une progression visible.',
  },
  {
    icon: Users,
    text: 'Une plateforme centralisee: messagerie, rendez-vous, suivi.',
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logoWrapper}>
          <Image src={logo} alt="Orig'AMI" width={136} height={40} priority />
        </div>
        <nav className={styles.nav}>
          <Link href="/connexion" className={styles.navLink}>
            Connexion
          </Link>
          <Link href="/onboarding" className={styles.navCta}>
            Inscription
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.kicker}>Mentorat etudiant</p>
          <h1 className={styles.heroTitle}>
            Construis ton parcours avec un mentor adapte a tes objectifs.
          </h1>
          <p className={styles.heroDescription}>
            Orig&apos;AMI aide les etudiants a trouver un mentor, structurer leur progression
            et avancer avec des jalons concrets.
          </p>
          <div className={styles.ctas}>
            <Link href="/onboarding" className={styles.ctaPrimary}>
              Commencer maintenant
            </Link>
            <Link href="/connexion" className={styles.ctaSecondary}>
              J&apos;ai deja un compte
            </Link>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="how-it-works">
          <h2 id="how-it-works" className={styles.sectionTitle}>Comment ca marche</h2>
          <div className={styles.stepsGrid}>
            {steps.map((step) => (
              <article key={step.number} className={styles.stepCard}>
                <div className={styles.stepIconWrapper}>
                  <step.icon size={24} className={styles.stepIcon} />
                </div>
                <h3 className={styles.stepTitle}>{step.number}. {step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="benefits">
          <h2 id="benefits" className={styles.sectionTitle}>Pourquoi Orig&apos;AMI</h2>
          <ul className={styles.benefitsList}>
            {benefits.map((benefit, index) => (
              <li key={index} className={styles.benefitItem}>
                <div className={styles.benefitIcon}>
                  <benefit.icon size={20} />
                </div>
                <span>{benefit.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.finalCta} aria-labelledby="cta-title">
          <h2 id="cta-title" className={styles.sectionTitle}>
            Pret a accelerer ton parcours ?
          </h2>
          <p className={styles.finalCtaDescription}>
            Inscris-toi gratuitement et complete ton profil en quelques minutes.
          </p>
          <div className={styles.ctas}>
            <Link href="/onboarding" className={styles.ctaPrimary}>
              Creer mon compte
            </Link>
            <Link href="/connexion" className={styles.ctaSecondary}>
              Me connecter
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Orig&apos;AMI - Plateforme de mentorat etudiant</p>
      </footer>
    </div>
  );
}

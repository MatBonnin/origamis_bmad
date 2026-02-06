import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.brand}>Orig'AMI</p>
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
          <h1>Construis ton parcours avec un mentor adapte a tes objectifs.</h1>
          <p>
            Orig'AMI aide les etudiants a trouver un mentor, structurer leur progression
            et avancer avec des jalons concrets.
          </p>
          <div className={styles.ctas}>
            <Link href="/onboarding" className={styles.primary}>
              Commencer maintenant
            </Link>
            <Link href="/connexion" className={styles.secondary}>
              J'ai deja un compte
            </Link>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="how-it-works">
          <h2 id="how-it-works">Comment ca marche</h2>
          <div className={styles.steps}>
            <article className={styles.card}>
              <h3>1. Definis ton besoin</h3>
              <p>Onboarding guide pour clarifier niveau, objectifs et priorites.</p>
            </article>
            <article className={styles.card}>
              <h3>2. Trouve ton mentor</h3>
              <p>Recommandations et recherche ciblee selon ton profil.</p>
            </article>
            <article className={styles.card}>
              <h3>3. Passe a l'action</h3>
              <p>Sessions, jalons et suivi de progression sur la duree.</p>
            </article>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="benefits">
          <h2 id="benefits">Pourquoi Orig'AMI</h2>
          <ul className={styles.benefits}>
            <li>Un accompagnement personnalise pour etudiants et jeunes diplomes.</li>
            <li>Des objectifs mesurables avec une progression visible.</li>
            <li>Une plateforme centralisee: messagerie, rendez-vous, suivi.</li>
          </ul>
        </section>

        <section className={styles.finalCta} aria-labelledby="cta-title">
          <h2 id="cta-title">Pret a accelerer ton parcours ?</h2>
          <p>Inscris-toi gratuitement et complete ton profil en quelques minutes.</p>
          <div className={styles.ctas}>
            <Link href="/onboarding" className={styles.primary}>
              Creer mon compte
            </Link>
            <Link href="/connexion" className={styles.secondary}>
              Me connecter
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Orig'AMI - Plateforme de mentorat etudiant</p>
      </footer>
    </div>
  );
}

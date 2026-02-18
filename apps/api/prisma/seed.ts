import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Domains ─────────────────────────────────────────────────────────────────

const DOMAINS: { slug: string; label: string; category: string }[] = [
  // Développement
  { slug: 'dev-web', label: 'Développement web', category: 'Développement' },
  { slug: 'dev-mobile', label: 'Développement mobile', category: 'Développement' },
  { slug: 'ia-ml', label: 'Intelligence artificielle & Machine Learning', category: 'Développement' },
  { slug: 'data-science', label: 'Data Science & Analyse de données', category: 'Développement' },
  { slug: 'cybersecurite', label: 'Cybersécurité', category: 'Développement' },
  { slug: 'devops-cloud', label: 'DevOps & Cloud', category: 'Développement' },
  { slug: 'jeux-video', label: 'Développement jeux vidéo', category: 'Développement' },
  { slug: 'blockchain', label: 'Blockchain & Web3', category: 'Développement' },
  { slug: 'iot-embarque', label: 'IoT & Systèmes embarqués', category: 'Développement' },
  { slug: 'backend-api', label: 'Backend & APIs', category: 'Développement' },
  { slug: 'frontend-ui', label: 'Frontend & Interfaces', category: 'Développement' },
  { slug: 'architecture-logicielle', label: 'Architecture logicielle', category: 'Développement' },
  { slug: 'qa-tests', label: 'Qualité & Tests', category: 'Développement' },

  // Design
  { slug: 'ux-ui', label: 'UX/UI Design', category: 'Design' },
  { slug: 'graphisme', label: 'Graphisme & Identité visuelle', category: 'Design' },
  { slug: 'motion-design', label: 'Motion Design & Animation', category: 'Design' },
  { slug: 'design-produit', label: 'Design produit', category: 'Design' },
  { slug: 'design-industriel', label: 'Design industriel', category: 'Design' },
  { slug: 'direction-artistique', label: 'Direction artistique', category: 'Design' },
  { slug: 'game-design', label: 'Game Design', category: 'Design' },
  { slug: 'design-3d', label: 'Modélisation 3D & Impression 3D', category: 'Design' },

  // Marketing & Communication
  { slug: 'marketing-digital', label: 'Marketing digital', category: 'Marketing & Communication' },
  { slug: 'seo-sea', label: 'SEO / SEA & Référencement', category: 'Marketing & Communication' },
  { slug: 'community-management', label: 'Community management', category: 'Marketing & Communication' },
  { slug: 'ecommerce-growth', label: 'E-commerce & Growth hacking', category: 'Marketing & Communication' },
  { slug: 'inbound-content', label: 'Inbound marketing & Content', category: 'Marketing & Communication' },
  { slug: 'copywriting', label: 'Copywriting & Rédaction web', category: 'Marketing & Communication' },
  { slug: 'relations-presse', label: 'Relations presse & RP', category: 'Marketing & Communication' },
  { slug: 'communication-corporate', label: 'Communication corporate', category: 'Marketing & Communication' },
  { slug: 'journalisme', label: 'Journalisme & Médias', category: 'Marketing & Communication' },
  { slug: 'influence-sponsoring', label: 'Influence & Sponsoring', category: 'Marketing & Communication' },

  // Management & Business
  { slug: 'gestion-projet', label: 'Gestion de projet (Agile/Scrum)', category: 'Management & Business' },
  { slug: 'entrepreneuriat', label: 'Entrepreneuriat & Startup', category: 'Management & Business' },
  { slug: 'management', label: 'Management & Leadership', category: 'Management & Business' },
  { slug: 'strategie', label: "Stratégie d'entreprise", category: 'Management & Business' },
  { slug: 'innovation', label: 'Innovation & Design Thinking', category: 'Management & Business' },
  { slug: 'vente-bizdev', label: 'Vente & Business development', category: 'Management & Business' },
  { slug: 'achat-supply', label: 'Achats & Supply chain', category: 'Management & Business' },

  // Finance
  { slug: 'finance', label: "Finance d'entreprise", category: 'Finance & Comptabilité' },
  { slug: 'comptabilite-audit', label: 'Comptabilité & Audit', category: 'Finance & Comptabilité' },
  { slug: 'investissement', label: 'Investissement & Marchés financiers', category: 'Finance & Comptabilité' },
  { slug: 'fintech', label: 'Fintech & Finance digitale', category: 'Finance & Comptabilité' },
  { slug: 'controle-gestion', label: 'Contrôle de gestion', category: 'Finance & Comptabilité' },

  // Ressources humaines
  { slug: 'recrutement', label: 'Recrutement & Talent acquisition', category: 'Ressources humaines' },
  { slug: 'formation-rh', label: 'Formation & Développement RH', category: 'Ressources humaines' },
  { slug: 'droit-social', label: 'Droit social & Paie', category: 'Ressources humaines' },
  { slug: 'qvct', label: "QVCT & Culture d'entreprise", category: 'Ressources humaines' },

  // Médias & Arts
  { slug: 'photographie', label: 'Photographie', category: 'Médias & Arts' },
  { slug: 'video-cinema', label: 'Vidéo & Cinéma', category: 'Médias & Arts' },
  { slug: 'podcast-audio', label: 'Podcast & Production audio', category: 'Médias & Arts' },
  { slug: 'illustration', label: 'Illustration & Bande dessinée', category: 'Médias & Arts' },
  { slug: 'musique', label: 'Musique & Sound design', category: 'Médias & Arts' },
  { slug: 'art-numerique', label: 'Art numérique & NFT', category: 'Médias & Arts' },

  // Sciences & Ingénierie
  { slug: 'maths', label: 'Mathématiques appliquées', category: 'Sciences & Ingénierie' },
  { slug: 'physique', label: 'Sciences physiques', category: 'Sciences & Ingénierie' },
  { slug: 'biologie', label: 'Biologie & Sciences du vivant', category: 'Sciences & Ingénierie' },
  { slug: 'chimie', label: 'Chimie', category: 'Sciences & Ingénierie' },
  { slug: 'genie-civil', label: 'Génie civil & BTP', category: 'Sciences & Ingénierie' },
  { slug: 'energie-environnement', label: 'Énergie & Environnement', category: 'Sciences & Ingénierie' },

  // Droit
  { slug: 'droit-affaires', label: "Droit des affaires", category: 'Droit' },
  { slug: 'propriete-intellectuelle', label: 'Propriété intellectuelle & RGPD', category: 'Droit' },
  { slug: 'droit-civil', label: 'Droit civil & Contentieux', category: 'Droit' },
  { slug: 'droit-numerique', label: 'Droit du numérique', category: 'Droit' },

  // Santé & Bien-être
  { slug: 'psychologie-coaching', label: 'Psychologie & Coaching', category: 'Santé & Bien-être' },
  { slug: 'sante', label: 'Santé & Sciences médicales', category: 'Santé & Bien-être' },
  { slug: 'nutrition-sport', label: 'Nutrition & Sport', category: 'Santé & Bien-être' },

  // Langue & Pédagogie
  { slug: 'traduction', label: 'Traduction & Interprétation', category: 'Langue & Pédagogie' },
  { slug: 'enseignement-langues', label: 'Enseignement des langues', category: 'Langue & Pédagogie' },
  { slug: 'prise-parole', label: 'Prise de parole en public', category: 'Langue & Pédagogie' },
  { slug: 'pedagogie', label: 'Pédagogie & Formation', category: 'Langue & Pédagogie' },
];

// ─── Skills ──────────────────────────────────────────────────────────────────

const SKILLS: { slug: string; label: string; domain_slug?: string }[] = [
  // Développement web
  { slug: 'html-css', label: 'HTML / CSS', domain_slug: 'dev-web' },
  { slug: 'javascript', label: 'JavaScript', domain_slug: 'dev-web' },
  { slug: 'typescript', label: 'TypeScript', domain_slug: 'dev-web' },
  { slug: 'react', label: 'React', domain_slug: 'dev-web' },
  { slug: 'nextjs', label: 'Next.js', domain_slug: 'dev-web' },
  { slug: 'vuejs', label: 'Vue.js', domain_slug: 'dev-web' },
  { slug: 'angular', label: 'Angular', domain_slug: 'dev-web' },
  { slug: 'tailwindcss', label: 'Tailwind CSS', domain_slug: 'dev-web' },
  { slug: 'nodejs', label: 'Node.js', domain_slug: 'dev-web' },
  { slug: 'graphql', label: 'GraphQL', domain_slug: 'dev-web' },

  // Développement mobile
  { slug: 'react-native', label: 'React Native', domain_slug: 'dev-mobile' },
  { slug: 'flutter', label: 'Flutter', domain_slug: 'dev-mobile' },
  { slug: 'swift', label: 'Swift / iOS', domain_slug: 'dev-mobile' },
  { slug: 'kotlin', label: 'Kotlin / Android', domain_slug: 'dev-mobile' },
  { slug: 'expo', label: 'Expo', domain_slug: 'dev-mobile' },

  // IA / ML
  { slug: 'python-ml', label: 'Python (ML)', domain_slug: 'ia-ml' },
  { slug: 'pytorch', label: 'PyTorch', domain_slug: 'ia-ml' },
  { slug: 'tensorflow', label: 'TensorFlow', domain_slug: 'ia-ml' },
  { slug: 'nlp', label: 'NLP / Traitement du langage', domain_slug: 'ia-ml' },
  { slug: 'computer-vision', label: 'Computer Vision', domain_slug: 'ia-ml' },
  { slug: 'llm-prompt', label: 'LLM & Prompt Engineering', domain_slug: 'ia-ml' },
  { slug: 'mlops', label: 'MLOps', domain_slug: 'ia-ml' },

  // Data Science
  { slug: 'python-data', label: 'Python (Data)', domain_slug: 'data-science' },
  { slug: 'sql', label: 'SQL', domain_slug: 'data-science' },
  { slug: 'pandas', label: 'Pandas / NumPy', domain_slug: 'data-science' },
  { slug: 'dataviz', label: 'DataViz (Tableau, Power BI)', domain_slug: 'data-science' },
  { slug: 'spark', label: 'Apache Spark', domain_slug: 'data-science' },
  { slug: 'statistiques', label: 'Statistiques avancées', domain_slug: 'data-science' },

  // Cybersécurité
  { slug: 'pentest', label: 'Pentest & Red team', domain_slug: 'cybersecurite' },
  { slug: 'soc-siem', label: 'SOC & SIEM', domain_slug: 'cybersecurite' },
  { slug: 'cryptographie', label: 'Cryptographie', domain_slug: 'cybersecurite' },
  { slug: 'securite-web', label: 'Sécurité applicative (OWASP)', domain_slug: 'cybersecurite' },
  { slug: 'forensic', label: 'Forensic & Analyse d\'incidents', domain_slug: 'cybersecurite' },

  // DevOps / Cloud
  { slug: 'docker', label: 'Docker', domain_slug: 'devops-cloud' },
  { slug: 'kubernetes', label: 'Kubernetes', domain_slug: 'devops-cloud' },
  { slug: 'aws', label: 'AWS', domain_slug: 'devops-cloud' },
  { slug: 'gcp', label: 'Google Cloud', domain_slug: 'devops-cloud' },
  { slug: 'azure', label: 'Azure', domain_slug: 'devops-cloud' },
  { slug: 'terraform', label: 'Terraform / IaC', domain_slug: 'devops-cloud' },
  { slug: 'ci-cd', label: 'CI/CD (GitHub Actions, GitLab CI)', domain_slug: 'devops-cloud' },
  { slug: 'linux', label: 'Linux & Administration système', domain_slug: 'devops-cloud' },

  // Backend & APIs
  { slug: 'nestjs', label: 'NestJS', domain_slug: 'backend-api' },
  { slug: 'express', label: 'Express.js', domain_slug: 'backend-api' },
  { slug: 'django', label: 'Django / FastAPI', domain_slug: 'backend-api' },
  { slug: 'spring-boot', label: 'Spring Boot', domain_slug: 'backend-api' },
  { slug: 'rest-api', label: 'REST API Design', domain_slug: 'backend-api' },
  { slug: 'postgresql', label: 'PostgreSQL', domain_slug: 'backend-api' },
  { slug: 'mongodb', label: 'MongoDB', domain_slug: 'backend-api' },
  { slug: 'redis', label: 'Redis', domain_slug: 'backend-api' },
  { slug: 'prisma-orm', label: 'Prisma / ORM', domain_slug: 'backend-api' },

  // Architecture logicielle
  { slug: 'clean-architecture', label: 'Clean Architecture / DDD', domain_slug: 'architecture-logicielle' },
  { slug: 'microservices', label: 'Microservices', domain_slug: 'architecture-logicielle' },
  { slug: 'event-driven', label: 'Event-driven (Kafka, RabbitMQ)', domain_slug: 'architecture-logicielle' },
  { slug: 'design-patterns', label: 'Design Patterns', domain_slug: 'architecture-logicielle' },
  { slug: 'solid', label: 'SOLID & Clean Code', domain_slug: 'architecture-logicielle' },

  // QA & Tests
  { slug: 'tests-unitaires', label: 'Tests unitaires (Jest, Vitest)', domain_slug: 'qa-tests' },
  { slug: 'e2e-tests', label: 'Tests E2E (Playwright, Cypress)', domain_slug: 'qa-tests' },
  { slug: 'tdd', label: 'TDD / BDD', domain_slug: 'qa-tests' },

  // Jeux vidéo
  { slug: 'unity', label: 'Unity', domain_slug: 'jeux-video' },
  { slug: 'unreal', label: 'Unreal Engine', domain_slug: 'jeux-video' },
  { slug: 'godot', label: 'Godot', domain_slug: 'jeux-video' },
  { slug: 'c-sharp', label: 'C# (Unity)', domain_slug: 'jeux-video' },

  // UX/UI Design
  { slug: 'figma', label: 'Figma', domain_slug: 'ux-ui' },
  { slug: 'prototypage', label: 'Prototypage & Wireframing', domain_slug: 'ux-ui' },
  { slug: 'design-system', label: 'Design System', domain_slug: 'ux-ui' },
  { slug: 'recherche-ux', label: 'Recherche UX', domain_slug: 'ux-ui' },
  { slug: 'accessibilite', label: 'Accessibilité (WCAG)', domain_slug: 'ux-ui' },
  { slug: 'adobe-xd', label: 'Adobe XD', domain_slug: 'ux-ui' },

  // Graphisme
  { slug: 'illustrator', label: 'Adobe Illustrator', domain_slug: 'graphisme' },
  { slug: 'photoshop', label: 'Adobe Photoshop', domain_slug: 'graphisme' },
  { slug: 'indesign', label: 'Adobe InDesign', domain_slug: 'graphisme' },
  { slug: 'branding', label: 'Branding & Identité de marque', domain_slug: 'graphisme' },
  { slug: 'affinity', label: 'Affinity Suite', domain_slug: 'graphisme' },

  // Motion Design
  { slug: 'after-effects', label: 'Adobe After Effects', domain_slug: 'motion-design' },
  { slug: 'premiere-pro', label: 'Adobe Premiere Pro', domain_slug: 'motion-design' },
  { slug: 'lottie', label: 'Lottie / animations web', domain_slug: 'motion-design' },
  { slug: 'blender', label: 'Blender', domain_slug: 'motion-design' },

  // Marketing digital
  { slug: 'google-ads', label: 'Google Ads', domain_slug: 'marketing-digital' },
  { slug: 'meta-ads', label: 'Meta Ads (Facebook/Instagram)', domain_slug: 'marketing-digital' },
  { slug: 'email-marketing', label: 'Email marketing (Mailchimp, Brevo)', domain_slug: 'marketing-digital' },
  { slug: 'analytics-ga4', label: 'Google Analytics 4', domain_slug: 'marketing-digital' },
  { slug: 'marketing-automation', label: 'Marketing automation (HubSpot)', domain_slug: 'marketing-digital' },
  { slug: 'a-b-testing', label: 'A/B Testing & CRO', domain_slug: 'marketing-digital' },

  // SEO / SEA
  { slug: 'seo-technique', label: 'SEO technique', domain_slug: 'seo-sea' },
  { slug: 'seo-editorial', label: 'SEO éditorial & cocon sémantique', domain_slug: 'seo-sea' },
  { slug: 'netlinking', label: 'Netlinking & Linkbuilding', domain_slug: 'seo-sea' },
  { slug: 'semrush', label: 'SEMrush / Ahrefs', domain_slug: 'seo-sea' },

  // Community management
  { slug: 'instagram', label: 'Instagram & Reels', domain_slug: 'community-management' },
  { slug: 'tiktok', label: 'TikTok', domain_slug: 'community-management' },
  { slug: 'linkedin', label: 'LinkedIn', domain_slug: 'community-management' },
  { slug: 'planning-editorial', label: 'Planning éditorial', domain_slug: 'community-management' },
  { slug: 'moderation', label: 'Modération de communauté', domain_slug: 'community-management' },

  // Gestion de projet
  { slug: 'scrum', label: 'Scrum', domain_slug: 'gestion-projet' },
  { slug: 'kanban', label: 'Kanban', domain_slug: 'gestion-projet' },
  { slug: 'jira', label: 'Jira / Confluence', domain_slug: 'gestion-projet' },
  { slug: 'pmp-prince2', label: 'PMP / PRINCE2', domain_slug: 'gestion-projet' },
  { slug: 'gestion-risques', label: 'Gestion des risques', domain_slug: 'gestion-projet' },
  { slug: 'notion-management', label: 'Notion & Outils collaboratifs', domain_slug: 'gestion-projet' },

  // Entrepreneuriat
  { slug: 'business-plan', label: 'Business plan', domain_slug: 'entrepreneuriat' },
  { slug: 'lean-startup', label: 'Lean Startup & MVP', domain_slug: 'entrepreneuriat' },
  { slug: 'fundraising', label: 'Levée de fonds & Pitching', domain_slug: 'entrepreneuriat' },
  { slug: 'legal-startup', label: 'Aspects juridiques startup', domain_slug: 'entrepreneuriat' },

  // Finance
  { slug: 'excel-finance', label: 'Excel financier & Modélisation', domain_slug: 'finance' },
  { slug: 'analyse-financiere', label: 'Analyse financière', domain_slug: 'finance' },
  { slug: 'valorisation', label: 'Valorisation & M&A', domain_slug: 'finance' },
  { slug: 'trading', label: 'Trading & Analyse technique', domain_slug: 'investissement' },

  // Compétences transverses (sans domaine spécifique)
  { slug: 'git', label: 'Git & Versioning', domain_slug: undefined },
  { slug: 'agile', label: 'Méthodes Agiles', domain_slug: undefined },
  { slug: 'communication', label: 'Communication', domain_slug: undefined },
  { slug: 'prise-parole-skill', label: 'Prise de parole en public', domain_slug: undefined },
  { slug: 'pensee-critique', label: 'Pensée critique & Analyse', domain_slug: undefined },
  { slug: 'travail-equipe', label: 'Travail en équipe', domain_slug: undefined },
  { slug: 'gestion-temps', label: 'Gestion du temps', domain_slug: undefined },
  { slug: 'excel-general', label: 'Excel / Google Sheets', domain_slug: undefined },
  { slug: 'notion-general', label: 'Notion', domain_slug: undefined },
  { slug: 'prompt-engineering', label: 'Prompt Engineering (IA générative)', domain_slug: undefined },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding domain_refs...');
  await prisma.domain_refs.deleteMany();
  for (const domain of DOMAINS) {
    await prisma.domain_refs.upsert({
      where: { slug: domain.slug },
      update: { label: domain.label, category: domain.category },
      create: { id: crypto.randomUUID(), ...domain },
    });
  }
  console.log(`  ✓ ${DOMAINS.length} domaines insérés`);

  console.log('Seeding skill_refs...');
  await prisma.skill_refs.deleteMany();
  for (const skill of SKILLS) {
    await prisma.skill_refs.upsert({
      where: { slug: skill.slug },
      update: { label: skill.label, domain_slug: skill.domain_slug ?? null },
      create: { id: crypto.randomUUID(), slug: skill.slug, label: skill.label, domain_slug: skill.domain_slug ?? null },
    });
  }
  console.log(`  ✓ ${SKILLS.length} compétences insérées`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

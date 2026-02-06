export interface Objective {
  id: string;
  label: string;
  description: string;
}

export const objectives: Objective[] = [
  {
    id: 'academic-writing',
    label: 'Redaction academique',
    description: 'Ameliorez vos competences en redaction de memoires, rapports et articles',
  },
  {
    id: 'oral-preparation',
    label: 'Preparation aux oraux',
    description: 'Preparez vos soutenances et presentations orales',
  },
  {
    id: 'career-guidance',
    label: 'Orientation professionnelle',
    description: 'Definissez votre projet professionnel et votre parcours de carriere',
  },
  {
    id: 'stress-management',
    label: 'Gestion du stress',
    description: 'Apprenez a gerer le stress et la pression des examens',
  },
  {
    id: 'research-methodology',
    label: 'Methodologie de recherche',
    description: 'Maitrisez les techniques de recherche et de documentation',
  },
  {
    id: 'time-management',
    label: 'Gestion du temps',
    description: 'Optimisez votre organisation et votre productivite',
  },
  {
    id: 'networking',
    label: 'Networking',
    description: 'Developpez votre reseau professionnel et vos contacts',
  },
  {
    id: 'personal-development',
    label: 'Developpement personnel',
    description: 'Travaillez sur votre confiance et vos soft skills',
  },
];

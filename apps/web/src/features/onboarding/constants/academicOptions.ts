export interface Option {
  value: string;
  label: string;
}

export const domains: Option[] = [
  { value: 'informatique', label: 'Informatique / Tech' },
  { value: 'commerce', label: 'Commerce / Marketing' },
  { value: 'droit', label: 'Droit' },
  { value: 'sciences', label: 'Sciences' },
  { value: 'sante', label: 'Sante' },
  { value: 'art-design', label: 'Art / Design' },
  { value: 'communication', label: 'Communication / Medias' },
  { value: 'ingenierie', label: 'Ingenierie' },
  { value: 'lettres', label: 'Lettres / Langues' },
  { value: 'economie', label: 'Economie / Gestion' },
  { value: 'autre', label: 'Autre' },
];

export const levels: Option[] = [
  { value: 'licence-1', label: 'Licence 1 (Bac+1)' },
  { value: 'licence-2', label: 'Licence 2 (Bac+2)' },
  { value: 'licence-3', label: 'Licence 3 (Bac+3)' },
  { value: 'master-1', label: 'Master 1 (Bac+4)' },
  { value: 'master-2', label: 'Master 2 (Bac+5)' },
  { value: 'doctorat', label: 'Doctorat' },
  { value: 'bts-dut', label: 'BTS / DUT' },
  { value: 'prepa', label: 'Classe preparatoire' },
  { value: 'autre', label: 'Autre' },
];

export const graduationYears: Option[] = [
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
  { value: '2030', label: '2030+' },
];

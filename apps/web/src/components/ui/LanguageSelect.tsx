'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import styles from './LanguageSelect.module.css';

export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'Anglais' },
  { code: 'es', label: 'Espagnol' },
  { code: 'de', label: 'Allemand' },
  { code: 'it', label: 'Italien' },
  { code: 'pt', label: 'Portugais' },
  { code: 'ar', label: 'Arabe' },
  { code: 'zh', label: 'Chinois (mandarin)' },
  { code: 'ja', label: 'Japonais' },
  { code: 'ko', label: 'Coréen' },
  { code: 'ru', label: 'Russe' },
  { code: 'nl', label: 'Néerlandais' },
  { code: 'pl', label: 'Polonais' },
  { code: 'sv', label: 'Suédois' },
  { code: 'tr', label: 'Turc' },
  { code: 'hi', label: 'Hindi' },
];

interface Props {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export function LanguageSelect({ label, values, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = (code: string) => {
    if (values.includes(code)) {
      onChange(values.filter((v) => v !== code));
    } else {
      onChange([...values, code]);
    }
  };

  const remove = (code: string) => onChange(values.filter((v) => v !== code));

  const getLangLabel = (code: string) => LANGUAGES.find((l) => l.code === code)?.label ?? code;

  return (
    <div className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}

      <div
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${disabled ? styles.triggerDisabled : ''}`}
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (!disabled) setOpen((o) => !o); } }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className={styles.tags}>
          {values.length === 0 && <span className={styles.placeholder}>Sélectionner des langues</span>}
          {values.map((code) => (
            <span key={code} className={styles.tag}>
              {getLangLabel(code)}
              {!disabled && (
                <button
                  type="button"
                  className={styles.tagRemove}
                  onClick={(e) => { e.stopPropagation(); remove(code); }}
                  aria-label={`Supprimer ${getLangLabel(code)}`}
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
        <ChevronDown size={18} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </div>

      {open && (
        <div className={styles.dropdown} role="listbox" aria-multiselectable="true">
          {LANGUAGES.map((lang) => {
            const selected = values.includes(lang.code);
            return (
              <div
                key={lang.code}
                className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
                role="option"
                aria-selected={selected}
                onClick={() => toggle(lang.code)}
                onKeyDown={(e) => { if (e.key === 'Enter') toggle(lang.code); }}
                tabIndex={0}
              >
                {selected && <span className={styles.check}>✓</span>}
                {lang.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

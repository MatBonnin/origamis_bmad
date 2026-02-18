'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import styles from './MultiSearchSelect.module.css';

export interface MultiSelectOption {
  value: string;
  label: string;
  group?: string;
}

interface Props {
  label?: string;
  placeholder?: string;
  /** Path appended to API_URL. Accepts ?search= and optional ?domain= */
  fetchUrl: string;
  /** Optional extra query param (e.g. domain slug to filter skills) */
  domainFilter?: string;
  values: string[];
  onChange: (values: string[]) => void;
  name?: string;
  disabled?: boolean;
  maxItems?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function MultiSearchSelect({
  label,
  placeholder = 'Rechercher et ajouter…',
  fetchUrl,
  domainFilter,
  values,
  onChange,
  name,
  disabled,
  maxItems = 15,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<MultiSelectOption[]>([]);
  const [optionLabels, setOptionLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOptions = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const url = new URL(`${API_URL}${fetchUrl}`);
        if (q) url.searchParams.set('search', q);
        if (domainFilter) url.searchParams.set('domain', domainFilter);
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const json = await res.json() as { data: Array<{ slug: string; label: string; category?: string; domain_slug?: string }> };
        const items: MultiSelectOption[] = (json.data ?? []).map((item) => ({
          value: item.slug,
          label: item.label,
          group: item.category ?? item.domain_slug ?? undefined,
        }));
        setOptions(items);
        // build label cache for selected values
        setOptionLabels((prev) => {
          const next = { ...prev };
          for (const item of items) next[item.value] = item.label;
          return next;
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [fetchUrl, domainFilter],
  );

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchOptions(search);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, fetchOptions]);

  useEffect(() => {
    if (!open) return;
    void fetchOptions('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = (option: MultiSelectOption) => {
    if (values.includes(option.value)) {
      onChange(values.filter((v) => v !== option.value));
    } else if (values.length < maxItems) {
      setOptionLabels((prev) => ({ ...prev, [option.value]: option.label }));
      onChange([...values, option.value]);
    }
  };

  const handleRemove = (v: string) => {
    onChange(values.filter((val) => val !== v));
  };

  const handleInputFocus = () => {
    if (!disabled) setOpen(true);
  };

  const filtered = options.filter((o) => !values.includes(o.value));

  // Group options
  const grouped = filtered.reduce<Record<string, MultiSelectOption[]>>((acc, opt) => {
    const g = opt.group ?? '';
    if (!acc[g]) acc[g] = [];
    acc[g].push(opt);
    return acc;
  }, {});
  const groups = Object.keys(grouped).sort();

  return (
    <div className={styles.container} ref={containerRef}>
      {label && <span className={styles.label}>{label}</span>}

      <div className={`${styles.field} ${disabled ? styles.fieldDisabled : ''} ${open ? styles.fieldOpen : ''}`}>
        {/* Tags for selected values */}
        {values.map((v) => (
          <span key={v} className={styles.tag}>
            {optionLabels[v] ?? v}
            {!disabled && (
              <button
                type="button"
                className={styles.tagRemove}
                onClick={() => handleRemove(v)}
                aria-label={`Supprimer ${optionLabels[v] ?? v}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}

        {/* Search input */}
        {!disabled && values.length < maxItems && (
          <div className={styles.inputWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={styles.input}
              placeholder={values.length === 0 ? placeholder : 'Ajouter…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={handleInputFocus}
              aria-label={label ?? 'Sélectionner des options'}
            />
          </div>
        )}
      </div>

      {open && (
        <div className={styles.dropdown} role="listbox" aria-multiselectable="true">
          <div className={styles.optionList}>
            {loading && <div className={styles.hint}>Chargement…</div>}
            {!loading && filtered.length === 0 && (
              <div className={styles.hint}>
                {search ? 'Aucun résultat' : 'Toutes les options sont sélectionnées'}
              </div>
            )}
            {!loading &&
              groups.map((group) => (
                <div key={group}>
                  {group && <div className={styles.groupLabel}>{group}</div>}
                  {grouped[group].map((opt) => (
                    <div
                      key={opt.value}
                      className={styles.option}
                      role="option"
                      aria-selected={false}
                      onClick={() => handleToggle(opt)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleToggle(opt); }}
                      tabIndex={0}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>
      )}

      {name && <input type="hidden" name={name} value={values.join(',')} />}
    </div>
  );
}

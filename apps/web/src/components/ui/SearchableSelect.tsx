'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import styles from './SearchableSelect.module.css';

export interface SearchableOption {
  value: string;
  label: string;
  group?: string;
}

interface Props {
  label?: string;
  placeholder?: string;
  /** Full URL to fetch options from. Must accept ?search= query param. */
  fetchUrl: string;
  value: string;
  valueLabel?: string;
  onChange: (value: string, label: string) => void;
  name?: string;
  disabled?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function SearchableSelect({
  label,
  placeholder = 'Rechercher…',
  fetchUrl,
  value,
  valueLabel,
  onChange,
  name,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<SearchableOption[]>([]);
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
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const json = await res.json() as { data: Array<{ slug: string; label: string; category?: string }> };
        setOptions(
          (json.data ?? []).map((item) => ({
            value: item.slug,
            label: item.label,
            group: item.category,
          })),
        );
      } catch {
        // ignore network errors silently
      } finally {
        setLoading(false);
      }
    },
    [fetchUrl],
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

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (option: SearchableOption) => {
    onChange(option.value, option.label);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
  };

  // Group options
  const grouped = options.reduce<Record<string, SearchableOption[]>>((acc, opt) => {
    const g = opt.group ?? '';
    if (!acc[g]) acc[g] = [];
    acc[g].push(opt);
    return acc;
  }, {});
  const groups = Object.keys(grouped).sort();

  const displayLabel = valueLabel || (options.find((o) => o.value === value)?.label ?? value);

  return (
    <div className={styles.container} ref={containerRef}>
      {label && (
        <span className={styles.label} onClick={handleOpen}>
          {label}
        </span>
      )}
      <div
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${disabled ? styles.triggerDisabled : ''}`}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={handleOpen}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpen(); }}
      >
        {value ? (
          <span className={styles.selectedValue}>{displayLabel}</span>
        ) : (
          <span className={styles.triggerPlaceholder}>{placeholder}</span>
        )}
        <div className={styles.triggerIcons}>
          {value && !disabled && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
              aria-label="Effacer la sélection"
              tabIndex={-1}
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={18} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
        </div>
      </div>

      {open && (
        <div className={styles.dropdown} role="listbox">
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Rechercher une option"
            />
          </div>
          <div className={styles.optionList}>
            {loading && <div className={styles.hint}>Chargement…</div>}
            {!loading && options.length === 0 && <div className={styles.hint}>Aucun résultat</div>}
            {!loading &&
              groups.map((group) => (
                <div key={group}>
                  {group && <div className={styles.groupLabel}>{group}</div>}
                  {grouped[group].map((opt) => (
                    <div
                      key={opt.value}
                      className={`${styles.option} ${opt.value === value ? styles.optionSelected : ''}`}
                      role="option"
                      aria-selected={opt.value === value}
                      onClick={() => handleSelect(opt)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(opt); }}
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

      {/* Hidden input for form compat */}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}

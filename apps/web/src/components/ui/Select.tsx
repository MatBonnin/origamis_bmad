'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      options,
      placeholder = 'Selectionnez une option',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;
    const hasError = Boolean(error);

    return (
      <div className={`${styles.container} ${className}`}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={`${styles.selectWrapper} ${hasError ? styles.hasError : ''}`}>
          <select
            ref={ref}
            id={selectId}
            className={styles.select}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            {...props}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className={styles.icon} size={18} />
        </div>
        {hint && !error && (
          <span id={`${selectId}-hint`} className={styles.hint}>
            {hint}
          </span>
        )}
        {error && (
          <span id={`${selectId}-error`} className={styles.error} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

'use client';

import { useCallback, useRef, useState } from 'react';
import styles from './FileUpload.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface FileUploadProps {
  label: string;
  accept: 'image' | 'document';
  accessToken: string;
  value?: string;
  onChange: (url: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface UploadResult {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

const ACCEPT_MAP = {
  image: 'image/jpeg,image/png,image/webp,image/gif',
  document: 'application/pdf,image/jpeg,image/png',
};

const LABEL_MAP = {
  image: 'Glissez une image ou cliquez pour parcourir',
  document: 'Glissez un document (PDF, JPG, PNG) ou cliquez pour parcourir',
};

export function FileUpload({
  label,
  accept,
  accessToken,
  value,
  onChange,
  placeholder,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const endpoint = accept === 'image' ? '/upload/image' : '/upload/document';

  const uploadFile = useCallback(
    async (file: File) => {
      setError('');
      setUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        const result = await new Promise<UploadResult>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText);
              if (response.data) {
                resolve(response.data as UploadResult);
              } else {
                reject(new Error(response.error?.message || 'Upload echoue'));
              }
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                reject(new Error(errorResponse.error?.message || `Erreur HTTP ${xhr.status}`));
              } catch {
                reject(new Error(`Erreur HTTP ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => reject(new Error('Erreur de connexion'));

          xhr.open('POST', `${API_URL}${endpoint}`);
          xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
          xhr.send(formData);
        });

        onChange(result.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload echoue');
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [accessToken, endpoint, onChange],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || uploading) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        void uploadFile(file);
      }
    },
    [disabled, uploading, uploadFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void uploadFile(file);
      }
    },
    [uploadFile],
  );

  const handleClick = useCallback(() => {
    if (!disabled && !uploading) {
      inputRef.current?.click();
    }
  }, [disabled, uploading]);

  const handleRemove = useCallback(() => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onChange]);

  const isImage = accept === 'image';
  const hasValue = Boolean(value);

  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_MAP[accept]}
        onChange={handleChange}
        disabled={disabled || uploading}
        className={styles.hiddenInput}
      />

      {hasValue ? (
        <div className={styles.preview}>
          {isImage ? (
            <img src={value} alt="Preview" className={styles.previewImage} />
          ) : (
            <div className={styles.documentPreview}>
              <span className={styles.documentIcon}>PDF</span>
              <span className={styles.documentName}>{value?.split('/').pop()}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className={styles.removeButton}
            disabled={disabled}
          >
            Supprimer
          </button>
        </div>
      ) : (
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''} ${
            disabled ? styles.dropzoneDisabled : ''
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
          {uploading ? (
            <div className={styles.uploadingState}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <span className={styles.progressText}>{progress}%</span>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.uploadIcon}>
                {isImage ? '🖼️' : '📄'}
              </span>
              <span className={styles.uploadText}>
                {placeholder || LABEL_MAP[accept]}
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from '@livekit/components-react';
import { io, type Socket } from 'socket.io-client';
import { Button } from '@/components/ui';
import styles from './SessionRoom.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Participant {
  userId: string;
  fullName: string;
  role: 'mentor' | 'etudiant';
}

interface SessionDocument {
  documentId: string;
  url: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

interface SessionMessage {
  messageId: string;
  bookingId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  document: SessionDocument | null;
}

interface TranscriptData {
  bookingId: string;
  provider: string;
  status: string;
  language: string | null;
  fullText: string | null;
  summaryText: string | null;
  segments: Array<{ speaker?: string; start?: number; end?: number; text?: string }>;
  updatedAt: string | null;
}

interface RoomData {
  bookingId: string;
  sessionToken: string;
  sessionUrl: string;
  provider: {
    name: string;
    roomId: string | null;
    joinUrl: string | null;
    serverUrl?: string | null;
    token?: string | null;
  };
  roomStatus: string;
  bookingStatus: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  participants: Participant[];
  transcript: TranscriptData;
  transcriptConsentRequired: boolean;
}

interface Props {
  accessToken: string;
  currentUserId: string;
  token: string;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

export function SessionRoom({ accessToken, currentUserId, token }: Props) {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [consenting, setConsenting] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  const documents = useMemo(() => {
    const seen = new Set<string>();
    return messages
      .map((message) => message.document)
      .filter((document): document is SessionDocument => Boolean(document))
      .filter((document) => {
        if (seen.has(document.documentId)) return false;
        seen.add(document.documentId);
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadRoom = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/sessions/room/${token}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger la session');
        return;
      }
      setRoom(result.data as RoomData);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [accessToken, token]);

  const loadMessages = useCallback(async (bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${bookingId}/chat/messages`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger le chat');
        return;
      }
      const data = result.data as { messages: SessionMessage[] };
      setMessages(data.messages ?? []);
    } catch {
      setError('Erreur de connexion au serveur');
    }
  }, [accessToken]);

  const loadTranscript = useCallback(async (bookingId: string) => {
    setLoadingTranscript(true);
    try {
      const response = await fetch(`${API_URL}/sessions/${bookingId}/transcript`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger la transcription');
        return;
      }
      setRoom((previous) =>
        previous
          ? {
              ...previous,
              transcript: result.data as TranscriptData,
              transcriptConsentRequired:
                previous.transcriptConsentRequired &&
                !['queued', 'processing', 'completed'].includes((result.data as TranscriptData).status),
            }
          : previous,
      );
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoadingTranscript(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (!room) return;
    void loadMessages(room.bookingId);
    void loadTranscript(room.bookingId);
  }, [room?.bookingId, loadMessages, loadTranscript]);

  useEffect(() => {
    if (!room) return;

    const socket = io(`${API_URL}/session-room`, {
      auth: { userId: currentUserId },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('session.join', { bookingId: room.bookingId });
    });

    socket.on('session.chat.created', (payload: { bookingId: string; message: SessionMessage }) => {
      if (payload.bookingId !== room.bookingId) {
        return;
      }
      setMessages((previous) => {
        if (previous.some((message) => message.messageId === payload.message.messageId)) {
          return previous;
        }
        return [...previous, payload.message];
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, room?.bookingId]);

  const sendMessage = useCallback(async () => {
    if (!room) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/sessions/${room.bookingId}/chat/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible d’envoyer le message');
        return;
      }
      setMessages((previous) => [...previous, (result.data as { message: SessionMessage }).message]);
      setDraft('');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSending(false);
    }
  }, [draft, headers, room]);

  const uploadDocument = useCallback(async (file: File) => {
    if (!room) return;
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_URL}/upload/document`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok || uploadResult.error) {
        setError(uploadResult.error?.message || 'Upload impossible');
        return;
      }

      const uploaded = uploadResult.data as {
        url: string;
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
      };

      const documentResponse = await fetch(`${API_URL}/sessions/${room.bookingId}/documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: uploaded.url,
          fileName: uploaded.filename,
          originalName: uploaded.originalName,
          mimeType: uploaded.mimetype,
          sizeBytes: uploaded.size,
        }),
      });
      const documentResult = await documentResponse.json();
      if (!documentResponse.ok || documentResult.error) {
        setError(documentResult.error?.message || 'Impossible d’enregistrer le document');
        return;
      }

      const document = (documentResult.data as { document: SessionDocument }).document;
      const messageResponse = await fetch(`${API_URL}/sessions/${room.bookingId}/chat/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          body: `Document partage: ${document.originalName}`,
          documentId: document.documentId,
        }),
      });
      const messageResult = await messageResponse.json();
      if (!messageResponse.ok || messageResult.error) {
        setError(messageResult.error?.message || 'Document partage mais message non cree');
        return;
      }
      setMessages((previous) => [...previous, (messageResult.data as { message: SessionMessage }).message]);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [accessToken, headers, room]);

  const consentToTranscript = useCallback(async () => {
    if (!room) return;
    setConsenting(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/sessions/${room.bookingId}/transcription/consent`, {
        method: 'POST',
        headers,
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible d’enregistrer le consentement');
        return;
      }
      setRoom((previous) =>
        previous
          ? {
              ...previous,
              transcriptConsentRequired: false,
              transcript: {
                ...previous.transcript,
                status: (result.data as { transcriptStatus: string }).transcriptStatus,
              },
            }
          : previous,
      );
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setConsenting(false);
    }
  }, [headers, room]);

  if (loading) {
    return <div className={styles.loading}>Chargement de la salle…</div>;
  }

  if (!room) {
    return <div className={styles.errorBox}>{error || 'Session introuvable.'}</div>;
  }

  const counterpart = room.participants.find((participant) => participant.userId !== currentUserId);

  return (
    <section className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Session mentorat en direct</p>
          <h1 className={styles.title}>{counterpart?.fullName || 'Session privée'}</h1>
          <p className={styles.subtitle}>
            {formatDateTime(room.startsAt)} · {formatTime(room.startsAt)} à {formatTime(room.endsAt)}
          </p>
        </div>
        <div className={styles.statusCluster}>
          <span className={styles.statusPill}>{room.provider.name}</span>
          <span className={styles.statusPill}>Salle {room.roomStatus}</span>
          <span className={styles.statusPill}>Transcription {room.transcript.status}</span>
        </div>
      </header>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.grid}>
        <div className={styles.stage}>
          <div className={styles.videoCard}>
            <div className={styles.videoMeta}>
              <div>
                <p className={styles.videoEyebrow}>Provider vidéo tiers</p>
                <strong>{room.provider.roomId || 'Room sécurisée'}</strong>
              </div>
              <div className={styles.participants}>
                {room.participants.map((participant) => (
                  <span key={participant.userId} className={styles.participantBadge}>
                    {participant.fullName}
                  </span>
                ))}
              </div>
            </div>

            {room.provider.serverUrl && room.provider.token ? (
              <div className={styles.videoFrame}>
                <LiveKitRoom
                  token={room.provider.token}
                  serverUrl={room.provider.serverUrl}
                  connect
                  audio
                  video
                  className={styles.liveKitRoom}
                >
                  <VideoConference />
                  <RoomAudioRenderer />
                </LiveKitRoom>
              </div>
            ) : (
              <div className={styles.videoFallback}>
                Les informations de connexion LiveKit sont indisponibles.
              </div>
            )}
          </div>

          <div className={styles.infoBand}>
            <div>
              <span className={styles.infoLabel}>Accès valable jusqu’au</span>
              <strong>{formatDateTime(room.expiresAt)}</strong>
            </div>
            <div>
              <span className={styles.infoLabel}>Partage d’écran</span>
              <strong>Géré par LiveKit</strong>
            </div>
            <div>
              <span className={styles.infoLabel}>Transcription</span>
              <strong>{room.transcript.provider}</strong>
            </div>
          </div>
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Chat de session</h2>
              <span>{messages.length} message(s)</span>
            </div>
            <div className={styles.chatList}>
              {messages.length === 0 ? (
                <p className={styles.emptyState}>Le fil de session est vide pour l’instant.</p>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.messageId}
                    className={`${styles.chatMessage} ${
                      message.authorId === currentUserId ? styles.chatMine : ''
                    }`}
                  >
                    <div className={styles.chatMeta}>
                      <strong>{message.authorName}</strong>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    {message.body && <p>{message.body}</p>}
                    {message.document && (
                      <a
                        className={styles.documentLink}
                        href={message.document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {message.document.originalName} · {formatBytes(message.document.sizeBytes)}
                      </a>
                    )}
                  </article>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <div className={styles.composer}>
              <textarea
                className={styles.composerInput}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ecrire un message utile pour cette session…"
                rows={3}
              />
              <div className={styles.composerActions}>
                <input
                  ref={fileInputRef}
                  type="file"
                  className={styles.hiddenInput}
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void uploadDocument(file);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={uploading}
                >
                  Partager un document
                </Button>
                <Button type="button" onClick={() => void sendMessage()} isLoading={sending}>
                  Envoyer
                </Button>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Documents</h2>
              <span>{documents.length}</span>
            </div>
            <div className={styles.documentList}>
              {documents.length === 0 ? (
                <p className={styles.emptyState}>Aucun document partagé dans cette session.</p>
              ) : (
                documents.map((document) => (
                  <a
                    key={document.documentId}
                    className={styles.documentCard}
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>{document.originalName}</strong>
                    <span>{formatBytes(document.sizeBytes)}</span>
                  </a>
                ))
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Résumé & transcription</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void loadTranscript(room.bookingId)}
                isLoading={loadingTranscript}
              >
                Actualiser
              </Button>
            </div>

            {room.transcriptConsentRequired ? (
              <div className={styles.consentBox}>
                <p>
                  Cette session peut être retranscrite après l’appel. Le consentement explicite est
                  requis avant traitement.
                </p>
                <Button type="button" onClick={() => void consentToTranscript()} isLoading={consenting}>
                  Autoriser la transcription
                </Button>
              </div>
            ) : null}

            <div className={styles.transcriptState}>
              <span className={styles.statusPill}>Statut: {room.transcript.status}</span>
              {room.transcript.updatedAt ? <span>Maj {formatDateTime(room.transcript.updatedAt)}</span> : null}
            </div>

            {room.transcript.summaryText ? (
              <div className={styles.summaryCard}>
                <p className={styles.infoLabel}>Résumé</p>
                <p>{room.transcript.summaryText}</p>
              </div>
            ) : (
              <p className={styles.emptyState}>
                Le résumé apparaîtra une fois le traitement de transcription terminé.
              </p>
            )}

            {room.transcript.fullText ? (
              <div className={styles.transcriptBox}>
                <p className={styles.infoLabel}>Verbatim</p>
                <pre>{room.transcript.fullText}</pre>
              </div>
            ) : (
              <p className={styles.emptyState}>
                Aucun verbatim disponible pour l’instant.
              </p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

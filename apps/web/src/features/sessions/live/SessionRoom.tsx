'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from '@livekit/components-react';
import { io, type Socket } from 'socket.io-client';
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
  callSessionId?: string | null;
  provider: string;
  status: string;
  language: string | null;
  fullText: string | null;
  summaryText: string | null;
  segments: Array<{ speaker?: string; start?: number; end?: number; text?: string }>;
  updatedAt: string | null;
}

interface CallData {
  callSessionId: string;
  bookingId: string;
  callToken: string;
  sessionUrl: string;
  provider: {
    name: string;
    roomId: string | null;
    joinUrl: string | null;
    serverUrl?: string | null;
    token?: string | null;
  };
  callStatus: string;
  startedAt: string | null;
  endedAt: string | null;
  expiresAt: string;
  participantIds: string[];
  transcript: TranscriptData;
  transcriptConsentRequired: boolean;
  transcriptConsentStatus?: 'pending' | 'accepted' | 'declined';
  transcriptCaptureStatus?: 'not_started' | 'recording' | 'uploaded' | 'failed';
  transcriptConsentedAt?: string | null;
}

interface RoomData {
  bookingId: string;
  sessionToken: string;
  sessionUrl: string;
  roomStatus: string;
  bookingStatus: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  participants: Participant[];
  activeCall: CallData | null;
}

interface Props {
  accessToken: string;
  currentUserId: string;
  token: string;
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

function mergeUniqueMessages(messages: SessionMessage[]) {
  const uniqueMessages = new Map<string, SessionMessage>();
  messages.forEach((message) => {
    uniqueMessages.set(message.messageId, message);
  });
  return Array.from(uniqueMessages.values()).sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function useElapsedTime(startDate: string) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    const start = new Date(startDate).getTime();
    const now = Date.now();

    if (now < start) {
      setElapsed('00:00');
      return;
    }

    const updateElapsed = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (hours > 0) {
        setElapsed(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        );
      } else {
        setElapsed(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  return elapsed;
}

export function SessionRoom({ accessToken, currentUserId, token }: Props) {
  const searchParams = useSearchParams();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [joinedCall, setJoinedCall] = useState<CallData | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [consenting, setConsenting] = useState(false);
  const [creatingCall, setCreatingCall] = useState(false);
  const [joinedCallToken, setJoinedCallToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const elapsedTime = useElapsedTime(room?.startsAt || new Date().toISOString());

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

  const activeCall = room?.activeCall ?? null;
  const joinedActiveCall = joinedCallToken ? joinedCall : null;

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
      if (!response.ok || result.error) return;
      const data = result.data as { messages: SessionMessage[] };
      setMessages(mergeUniqueMessages(data.messages ?? []));
    } catch {
      // Silently fail for messages
    }
  }, [accessToken]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (!room) return;
    void loadMessages(room.bookingId);
  }, [room?.bookingId, loadMessages]);

  useEffect(() => {
    const requestedCall = searchParams.get('call');
    if (!requestedCall) return;
    setJoinedCallToken(requestedCall);
  }, [searchParams]);

  useEffect(() => {
    if (!joinedCallToken) {
      setJoinedCall(null);
      return;
    }

    if (!activeCall && joinedCallToken) {
      setJoinedCallToken(null);
      setJoinedCall(null);
      return;
    }

    if (activeCall && joinedCallToken === activeCall.callToken) {
      setJoinedCall((previous) => {
        if (
          previous &&
          previous.callSessionId === activeCall.callSessionId &&
          previous.provider.token &&
          previous.provider.serverUrl
        ) {
          return {
            ...activeCall,
            provider: {
              ...activeCall.provider,
              token: previous.provider.token,
              serverUrl: previous.provider.serverUrl,
            },
          };
        }
        return activeCall;
      });
    }
  }, [activeCall, joinedCallToken]);

  useEffect(() => {
    if (!room?.bookingId) return;
    if (joinedCallToken) return;
    if (!activeCall) return;

    const interval = setInterval(() => {
      void loadRoom();
    }, 5000);

    return () => clearInterval(interval);
  }, [room?.bookingId, activeCall, joinedCallToken, loadRoom]);

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
      if (payload.bookingId !== room.bookingId) return;
      setMessages((previous) => mergeUniqueMessages([...previous, payload.message]));
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
    try {
      const response = await fetch(`${API_URL}/sessions/${room.bookingId}/chat/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body }),
      });
      const result = await response.json();
      if (!response.ok || result.error) return;
      setMessages((previous) =>
        mergeUniqueMessages([...previous, (result.data as { message: SessionMessage }).message]),
      );
      setDraft('');
    } catch {
      // Silently fail
    } finally {
      setSending(false);
    }
  }, [draft, headers, room]);

  const uploadDocument = useCallback(async (file: File) => {
    if (!room) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_URL}/upload/document`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok || uploadResult.error) return;

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
      if (!documentResponse.ok || documentResult.error) return;

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
      if (messageResponse.ok && !messageResult.error) {
        setMessages((previous) =>
          mergeUniqueMessages([...previous, (messageResult.data as { message: SessionMessage }).message]),
        );
      }
    } catch {
      // Silently fail
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [accessToken, headers, room]);

  const createCall = useCallback(async () => {
    if (!room) return;
    setCreatingCall(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/sessions/${room.bookingId}/calls`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de demarrer un appel');
        return;
      }
      const data = result.data as CallData;
      setJoinedCallToken(data.callToken);
      setJoinedCall(data);
      await loadRoom();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setCreatingCall(false);
    }
  }, [accessToken, room, loadRoom]);

  const joinCall = useCallback(async () => {
    if (!activeCall) return;
    setJoinedCallToken(activeCall.callToken);
    setJoinedCall(activeCall);
  }, [activeCall]);

  const handleRoomDisconnected = useCallback(() => {
    setJoinedCall(null);
    setJoinedCallToken(null);
    void loadRoom();
  }, [loadRoom]);

  const updateTranscriptConsent = useCallback(async (decision: 'accept' | 'decline') => {
    if (!activeCall) return;
    setConsenting(true);
    try {
      const response = await fetch(
        `${API_URL}/sessions/calls/${activeCall.callSessionId}/transcription/consent`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ decision }),
        },
      );
      const result = await response.json();
      if (!response.ok || result.error) return;
      await loadRoom();
    } catch {
      // Silently fail
    } finally {
      setConsenting(false);
    }
  }, [activeCall, headers, loadRoom]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinnerRing} />
            <div className={styles.spinnerRing} />
            <div className={styles.spinnerRing} />
          </div>
          <p className={styles.loadingText}>Connexion a la session...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className={styles.errorScreen}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1>Session introuvable</h1>
          <p>{error || 'Cette session n existe pas ou a expire.'}</p>
        </div>
      </div>
    );
  }

  const counterpart = room.participants.find((p) => p.userId !== currentUserId);

  return (
    <div className={styles.roomContainer}>
      {joinedActiveCall?.transcriptConsentRequired && (
        <div className={styles.consentOverlay}>
          <div className={styles.consentModal}>
            <div className={styles.consentIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4" />
                <path d="M12 15a3 3 0 110-6 3 3 0 010 6z" />
              </svg>
            </div>
            <h2>Transcription de l appel</h2>
            <p>
              Cet appel peut etre retranscrit apres sa fermeture. La decision doit etre prise
              avant l entree dans la visio.
            </p>
            <div className={styles.consentActions}>
              <button
                className={styles.consentDecline}
                onClick={() => void updateTranscriptConsent('decline')}
                disabled={consenting}
              >
                Refuser
              </button>
              <button
                className={styles.consentAccept}
                onClick={() => void updateTranscriptConsent('accept')}
                disabled={consenting}
              >
                {consenting ? 'Activation...' : 'Autoriser'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.sessionInfo}>
            <div className={styles.liveIndicator}>
              <span className={styles.liveDot} />
              {activeCall ? 'APPEL ACTIF' : 'CRENEAU OUVERT'}
            </div>
            <span className={styles.sessionTimer}>{elapsedTime}</span>
          </div>
        </div>

        <div className={styles.topBarCenter}>
          <h1 className={styles.sessionTitle}>
            Session avec {counterpart?.fullName || 'Participant'}
          </h1>
          <p className={styles.sessionSchedule}>
            {formatTime(room.startsAt)} - {formatTime(room.endsAt)}
          </p>
        </div>

        <div className={styles.topBarRight}>
          <div className={styles.participantAvatars}>
            {room.participants.map((p) => (
              <div
                key={p.userId}
                className={`${styles.avatar} ${p.userId === currentUserId ? styles.avatarSelf : ''}`}
                title={p.fullName}
              >
                {getInitials(p.fullName)}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.mainContent}>
        <main className={styles.videoStage}>
          {!activeCall ? (
            <div className={styles.videoPlaceholder}>
              <div className={styles.placeholderContent}>
                <div className={styles.placeholderAvatar}>
                  {getInitials(counterpart?.fullName || 'P')}
                </div>
                <p>Aucun appel en cours pour ce creneau.</p>
                <button
                  className={styles.consentAccept}
                  onClick={() => void createCall()}
                  disabled={creatingCall}
                >
                  {creatingCall ? 'Demarrage...' : 'Demarrer un appel'}
                </button>
              </div>
            </div>
          ) : !joinedActiveCall ? (
            <div className={styles.videoPlaceholder}>
              <div className={styles.placeholderContent}>
                <div className={styles.placeholderAvatar}>
                  {getInitials(counterpart?.fullName || 'P')}
                </div>
                <p>
                  Appel en cours: {activeCall.callStatus}. Participants connectes: {activeCall.participantIds.length}/2
                </p>
                <button className={styles.consentAccept} onClick={() => void joinCall()}>
                  Rejoindre l appel
                </button>
              </div>
            </div>
          ) : joinedActiveCall.provider.serverUrl && joinedActiveCall.provider.token ? (
            <LiveKitRoom
              token={joinedActiveCall.provider.token}
              serverUrl={joinedActiveCall.provider.serverUrl}
              connect
              audio
              video
              onDisconnected={handleRoomDisconnected}
              className={styles.liveKitContainer}
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          ) : (
            <div className={styles.videoPlaceholder}>
              <div className={styles.placeholderContent}>
                <div className={styles.placeholderAvatar}>
                  {getInitials(counterpart?.fullName || 'P')}
                </div>
                <p>
                  {joinedActiveCall.transcriptConsentRequired
                    ? 'Choisissez d abord si cet appel peut etre transcrit.'
                    : 'Preparation de l appel...'}
                </p>
              </div>
            </div>
          )}
        </main>

        <aside className={styles.sidebar}>
          <section className={styles.chatPanel}>
            <div className={styles.panelHeader}>
              <h2>Chat de session</h2>
            </div>

            <div className={styles.chatMessages}>
              {messages.length === 0 ? (
                <div className={styles.chatEmpty}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>Demarrez la conversation</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.messageId}
                    className={`${styles.chatBubble} ${message.authorId === currentUserId ? styles.chatBubbleSelf : ''}`}
                  >
                    {message.authorId !== currentUserId && (
                      <div className={styles.bubbleAvatar}>
                        {getInitials(message.authorName)}
                      </div>
                    )}
                    <div className={styles.bubbleContent}>
                      {message.authorId !== currentUserId && (
                        <span className={styles.bubbleAuthor}>{message.authorName}</span>
                      )}
                      {message.body && <p>{message.body}</p>}
                      {message.document && (
                        <a
                          className={styles.bubbleDocument}
                          href={message.document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>{message.document.originalName}</span>
                        </a>
                      )}
                      <span className={styles.bubbleTime}>{formatTime(message.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className={styles.chatComposer}>
              <input
                ref={fileInputRef}
                type="file"
                className={styles.hiddenInput}
                accept="application/pdf,image/png,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadDocument(file);
                }}
              />
              <button
                className={styles.attachButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Joindre un fichier"
              >
                {uploading ? (
                  <div className={styles.miniSpinner} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </button>
              <textarea
                className={styles.chatInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tapez votre message..."
                rows={1}
              />
              <button
                className={styles.sendButton}
                onClick={() => void sendMessage()}
                disabled={sending || !draft.trim()}
              >
                {sending ? (
                  <div className={styles.miniSpinner} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </section>

          <section className={styles.docsPanel}>
            <div className={styles.panelHeader}>
              <h2>Documents partages</h2>
            </div>

            <div className={styles.documentsList}>
              {documents.length === 0 ? (
                <div className={styles.docsEmpty}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Aucun document partage</p>
                  <button
                    className={styles.uploadButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Partager un fichier
                  </button>
                </div>
              ) : (
                documents.map((doc) => (
                  <a
                    key={doc.documentId}
                    className={styles.documentCard}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className={styles.docIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className={styles.docInfo}>
                      <span className={styles.docName}>{doc.originalName}</span>
                      <span className={styles.docSize}>{formatBytes(doc.sizeBytes)}</span>
                    </div>
                    <div className={styles.docDownload}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

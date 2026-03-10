'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button, Input } from '@/components/ui';
import styles from './MentorMessagingPanel.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const MESSAGING_API_URL = `${API_URL}/messaging`;

interface ConversationItem {
  conversationId: string;
  peer: {
    userId: string;
    fullName: string;
    role: 'mentor' | 'etudiant';
  };
  lastMessage: {
    messageId: string;
    body: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  lastMessageAt: string;
}

interface MessageItem {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  body: string;
  metadata: Record<string, unknown>;
  clientMessageId: string | null;
  createdAt: string;
}

interface MessageEventPayload {
  conversationId: string;
  message: MessageItem;
}

interface Props {
  accessToken: string;
  currentUserId: string;
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatConversationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function MentorMessagingPanel({ accessToken, currentUserId }: Props) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedConversationIdRef = useRef(selectedConversationId);
  selectedConversationIdRef.current = selectedConversationId;

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.conversationId === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    setError('');
    try {
      const res = await fetch(`${MESSAGING_API_URL}/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger les conversations');
        return;
      }
      const data = result.data as { conversations?: ConversationItem[] };
      const list = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(list);
      if (list.length > 0) {
        setSelectedConversationId((prev) => prev || list[0].conversationId);
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoadingConversations(false);
    }
  }, [accessToken]);

  const loadMessages = useCallback(
    async (conversationId: string, cursor?: string) => {
      if (!conversationId) return;
      if (cursor) setLoadingMore(true);
      else setLoadingMessages(true);

      try {
        const params = new URLSearchParams({ limit: '20' });
        if (cursor) params.set('cursor', cursor);

        const res = await fetch(
          `${MESSAGING_API_URL}/conversations/${conversationId}/messages?${params.toString()}`,
          { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
        );
        const result = await res.json();
        if (!res.ok || result.error) {
          setError(result.error?.message || 'Impossible de charger les messages');
          return;
        }
        const data = result.data as {
          messages?: MessageItem[];
          metadata: { next_cursor: string | null };
        };
        const next = Array.isArray(data.messages) ? data.messages : [];
        setMessages((prev) => (cursor ? [...next, ...prev] : next));
        setNextCursor(data.metadata.next_cursor);

        if (!cursor && next.length > 0) {
          socketRef.current?.emit('message.read', {
            conversationId,
            lastReadMessageId: next[next.length - 1].messageId,
          });
        }
      } catch {
        setError('Erreur de connexion au serveur');
      } finally {
        setLoadingMessages(false);
        setLoadingMore(false);
      }
    },
    [accessToken],
  );

  const handleRealtimeMessage = useCallback(
    (payload: MessageEventPayload) => {
      setMessages((prev) => {
        if (payload.conversationId !== selectedConversationIdRef.current) {
          return prev;
        }

        if (prev.some((message) => message.messageId === payload.message.messageId)) {
          return prev;
        }

        return [...prev, payload.message];
      });

      void loadConversations();
    },
    [loadConversations],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const socket = io(`${API_URL}/messages`, {
      auth: { userId: currentUserId },
      transports: ['websocket', 'polling'],
    });

    socket.on('message.received', handleRealtimeMessage);
    socket.on('message.new', handleRealtimeMessage);
    socket.on('message.typing', (data: { conversationId: string; fromUserId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => ({ ...prev, [data.fromUserId]: data.isTyping }));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, handleRealtimeMessage]);

  useEffect(() => {
    if (selectedConversationId) {
      void loadMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadMessages]);

  const emitTyping = (isTyping: boolean) => {
    if (!selectedConversation || !socketRef.current) return;
    socketRef.current.emit('message.typing', {
      conversationId: selectedConversationId,
      toUserId: selectedConversation.peer.userId,
      isTyping,
    });
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBody(e.target.value);
    emitTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAttachment(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async () => {
    const trimmed = body.trim();
    if (!trimmed || !selectedConversation) return;

    setSending(true);
    setError('');
    emitTyping(false);

    try {
      const res = await fetch(`${MESSAGING_API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          receiverId: selectedConversation.peer.userId,
          body: trimmed,
          notifyChannel: 'in_app',
          clientMessageId: `mentor-${Date.now()}`,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || "Impossible d'envoyer le message");
        return;
      }
      const data = result.data as { message: MessageItem; conversationId: string };
      setMessages((prev) => {
        if (prev.some((message) => message.messageId === data.message.messageId)) {
          return prev;
        }

        return [...prev, data.message];
      });
      setBody('');
      removeAttachment();
      void loadConversations();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const peerTyping = selectedConversation
    ? typingUsers[selectedConversation.peer.userId]
    : false;

  return (
    <section className={styles.container} aria-labelledby="mentor-messaging-title">
      <header className={styles.header}>
        <h1 id="mentor-messaging-title" className={styles.title}>Correspondance</h1>
        <p className={styles.subtitle}>
          Echangez avec vos etudiants - {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
          {totalUnread > 0 && ` · ${totalUnread} non lu${totalUnread > 1 ? 's' : ''}`}
        </p>
      </header>

      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div className={styles.layout}>
        {/* Student list sidebar */}
        <aside className={styles.sidebar}>
          <div>
            <h2>Etudiants</h2>
          </div>
          <div>
            {loadingConversations ? (
              <div className={styles.skeletonList} aria-busy="true" aria-live="polite">
                <div className={styles.skeletonItem} />
                <div className={styles.skeletonItem} />
                <div className={styles.skeletonItem} />
              </div>
            ) : conversations.length === 0 ? (
              <p className={styles.empty} aria-live="polite">
                Aucune conversation pour le moment.
              </p>
            ) : (
              <ul className={styles.conversationList}>
                {conversations.map((conv) => (
                  <li key={conv.conversationId}>
                    <button
                      type="button"
                      className={
                        conv.conversationId === selectedConversationId
                          ? styles.conversationActive
                          : styles.conversationButton
                      }
                      onClick={() => setSelectedConversationId(conv.conversationId)}
                      aria-current={conv.conversationId === selectedConversationId ? 'true' : undefined}
                    >
                      <div className={styles.conversationHeader}>
                        <span className={styles.conversationName}>{conv.peer.fullName}</span>
                        {conv.unreadCount > 0 && (
                          <span className={styles.unreadBadge} aria-label={`${conv.unreadCount} message non lu`}>
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className={styles.conversationPreview}>
                        {conv.lastMessage?.body || 'Demarrer la conversation'}
                      </span>
                      {conv.lastMessage && (
                        <time className={styles.conversationTime} dateTime={conv.lastMessage.createdAt}>
                          {formatConversationTime(conv.lastMessage.createdAt)}
                        </time>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Chat area */}
        <article className={styles.chatCard}>
          <div>
            <div className={styles.chatHeader}>
              <h3>{selectedConversation?.peer.fullName || 'Conversation'}</h3>
              {selectedConversation && (
                <span className={styles.peerRole}>Etudiant</span>
              )}
            </div>
          </div>
          <div>
            <div className={styles.chatBody} role="log" aria-live="polite" aria-label="Messages de la conversation">
              {nextCursor && (
                <div className={styles.loadMoreRow}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void loadMessages(selectedConversationId, nextCursor)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Chargement...' : "Charger l'historique"}
                  </Button>
                </div>
              )}

              {loadingMessages ? (
                <div className={styles.skeletonMessages} aria-busy="true" aria-live="polite">
                  <div className={styles.skeletonBubble} />
                  <div className={styles.skeletonBubble} />
                  <div className={styles.skeletonBubble} />
                </div>
              ) : messages.length === 0 ? (
                <p className={styles.empty} aria-live="polite">
                  Aucun message dans cette conversation.
                </p>
              ) : (
                <ul className={styles.messageList}>
                  {messages.map((msg) => {
                    const mine = msg.senderId === currentUserId;
                    return (
                      <li key={msg.messageId} className={mine ? styles.rowMine : styles.rowPeer}>
                        <article className={mine ? styles.bubbleMine : styles.bubblePeer}>
                          <p>{msg.body}</p>
                          <time dateTime={msg.createdAt}>
                            {formatMessageTime(msg.createdAt)}
                          </time>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}

              {peerTyping && (
                <div className={styles.typingIndicator} aria-live="polite">
                  <span>{selectedConversation?.peer.fullName} ecrit</span>
                  <span className={styles.typingDots} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className={styles.composer}>
              {attachment && (
                <div className={styles.attachmentPreview}>
                  <span className={styles.attachmentName}>{attachment.name}</span>
                  <button
                    type="button"
                    className={styles.attachmentRemove}
                    onClick={removeAttachment}
                    aria-label="Retirer la piece jointe"
                  >
                    &times;
                  </button>
                </div>
              )}
              <div className={styles.composerRow}>
                <Input
                  name="mentor-message-body"
                  label="Votre message"
                  value={body}
                  onChange={handleBodyChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ecrire un message..."
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className={styles.fileInput}
                  onChange={handleFileChange}
                  id="mentor-attachment"
                  aria-label="Joindre un fichier"
                />
                <label htmlFor="mentor-attachment" className={styles.attachButton} role="button" tabIndex={0}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M17.5 9.31l-7.78 7.78a4.5 4.5 0 01-6.36-6.36l7.78-7.78a3 3 0 014.24 4.24l-7.78 7.78a1.5 1.5 0 01-2.12-2.12l7.07-7.07"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </label>
                <Button type="button" onClick={() => void sendMessage()} isLoading={sending}>
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

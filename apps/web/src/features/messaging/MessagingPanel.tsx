'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { Button, Input } from '@/components/ui';
import styles from './MessagingPanel.module.css';

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

type ConversationPeer = ConversationItem['peer'];

function formatConversationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(fullName: string): string {
  const parts = fullName
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function MessagingPanel({ accessToken, currentUserId }: Props) {
  const searchParams = useSearchParams();
  const initialMentorId = searchParams?.get('mentor')?.trim() ?? '';
  const initialMentorName = searchParams?.get('name')?.trim() || 'Mentor';

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [draftRecipient, setDraftRecipient] = useState<ConversationPeer | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialRecipientHandledRef = useRef(false);
  const selectedConversationIdRef = useRef(selectedConversationId);
  selectedConversationIdRef.current = selectedConversationId;

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.conversationId === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );
  const activeRecipient = selectedConversation?.peer ?? draftRecipient;

  const filteredConversations = useMemo(() => {
    const lowered = searchValue.trim().toLowerCase();

    return conversations.filter((item) => {
      if (showUnreadOnly && item.unreadCount === 0) {
        return false;
      }

      if (!lowered) {
        return true;
      }

      return (
        item.peer.fullName.toLowerCase().includes(lowered) ||
        (item.lastMessage?.body || '').toLowerCase().includes(lowered)
      );
    });
  }, [conversations, searchValue, showUnreadOnly]);

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
      const response = await fetch(`${MESSAGING_API_URL}/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger les conversations');
        return;
      }

      const data = result.data as { conversations?: ConversationItem[] };
      const nextConversations = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(nextConversations);

      if (nextConversations.length > 0) {
        setSelectedConversationId((previous) => {
          if (!previous) {
            return nextConversations[0].conversationId;
          }
          const exists = nextConversations.some((item) => item.conversationId === previous);
          return exists ? previous : nextConversations[0].conversationId;
        });
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

      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoadingMessages(true);
      }

      try {
        const params = new URLSearchParams({ limit: '20' });
        if (cursor) {
          params.set('cursor', cursor);
        }

        const response = await fetch(
          `${MESSAGING_API_URL}/conversations/${conversationId}/messages?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          },
        );
        const result = await response.json();

        if (!response.ok || result.error) {
          setError(result.error?.message || 'Impossible de charger les messages');
          return;
        }

        const data = result.data as {
          messages?: MessageItem[];
          metadata: { next_cursor: string | null };
        };

        const nextMessages = Array.isArray(data.messages) ? data.messages : [];
        setMessages((previous) => (cursor ? [...nextMessages, ...previous] : nextMessages));
        setNextCursor(data.metadata.next_cursor);
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
      setMessages((previous) => {
        if (payload.conversationId !== selectedConversationIdRef.current) {
          return previous;
        }

        if (previous.some((item) => item.messageId === payload.message.messageId)) {
          return previous;
        }

        return [...previous, payload.message];
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

    return () => {
      socket.disconnect();
    };
  }, [currentUserId, handleRealtimeMessage]);

  useEffect(() => {
    if (selectedConversationId) {
      void loadMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadMessages]);

  useEffect(() => {
    if (initialRecipientHandledRef.current || loadingConversations) {
      return;
    }

    if (!initialMentorId) {
      initialRecipientHandledRef.current = true;
      return;
    }

    const existingConversation = conversations.find(
      (item) => item.peer.userId === initialMentorId,
    );

    if (existingConversation) {
      setSelectedConversationId(existingConversation.conversationId);
      setDraftRecipient(null);
    } else {
      setDraftRecipient({
        userId: initialMentorId,
        fullName: initialMentorName,
        role: 'mentor',
      });
      setSelectedConversationId('');
      setMessages([]);
    }

    setMobileThreadOpen(true);
    initialRecipientHandledRef.current = true;
  }, [conversations, initialMentorId, initialMentorName, loadingConversations]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setDraftRecipient(null);
    setMobileThreadOpen(true);
  };

  const sendMessage = async () => {
    const trimmed = body.trim();
    const recipient = selectedConversation?.peer ?? draftRecipient;
    if (!trimmed || !recipient) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await fetch(`${MESSAGING_API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          receiverId: recipient.userId,
          body: trimmed,
          notifyChannel: 'in_app',
          clientMessageId: `client-${Date.now()}`,
        }),
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || "Impossible d'envoyer le message");
        return;
      }

      const data = result.data as { message: MessageItem; conversationId: string };
      setMessages((previous) => {
        if (previous.some((item) => item.messageId === data.message.messageId)) {
          return previous;
        }

        return [...previous, data.message];
      });
      setSelectedConversationId(data.conversationId);
      setDraftRecipient(null);
      setBody('');
      void loadConversations();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <section className={styles.page} aria-labelledby="messaging-title">
      <header className={styles.pageHeader}>
        <div>
          <h1 id="messaging-title" className={styles.title}>Messages</h1>
          <p className={styles.subtitle}>Discutez avec vos mentors, sans quitter votre espace.</p>
        </div>
        <div className={styles.headerStats}>
          <span className={styles.statPill}>Conversations: {conversations.length}</span>
          <span className={styles.statPill}>
            {totalUnread > 0 ? `${totalUnread} non lu${totalUnread > 1 ? 's' : ''}` : 'Tout est lu'}
          </span>
        </div>
      </header>

      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div className={`${styles.shell} ${mobileThreadOpen ? styles.mobileThreadOpen : ''}`}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <h2 className={styles.panelTitle}>Inbox</h2>
            <button
              type="button"
              className={styles.filterToggle}
              onClick={() => setShowUnreadOnly((previous) => !previous)}
              aria-pressed={showUnreadOnly}
            >
              {showUnreadOnly ? 'Non lus: ON' : 'Non lus'}
            </button>
          </div>

          <div className={styles.searchWrap}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Rechercher une conversation"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              aria-label="Rechercher une conversation"
            />
          </div>

          {loadingConversations ? (
            <div className={styles.skeletonList} aria-busy="true" aria-live="polite">
              <div className={styles.skeletonRow} />
              <div className={styles.skeletonRow} />
              <div className={styles.skeletonRow} />
            </div>
          ) : filteredConversations.length === 0 ? (
            <p className={styles.empty}>Aucune conversation ne correspond.</p>
          ) : (
            <ul className={styles.conversationList}>
              {filteredConversations.map((conversation) => {
                const isActive = conversation.conversationId === selectedConversationId;
                return (
                  <li key={conversation.conversationId}>
                    <button
                      type="button"
                      className={isActive ? styles.conversationActive : styles.conversationButton}
                      onClick={() => handleSelectConversation(conversation.conversationId)}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className={styles.avatar} aria-hidden="true">
                        {getInitials(conversation.peer.fullName)}
                      </span>

                      <span className={styles.conversationBody}>
                        <span className={styles.conversationHeader}>
                          <span className={styles.conversationName}>{conversation.peer.fullName}</span>
                          <time className={styles.conversationTime} dateTime={conversation.lastMessageAt}>
                            {formatConversationTime(conversation.lastMessageAt)}
                          </time>
                        </span>
                        <span className={styles.conversationPreview}>
                          {conversation.lastMessage?.body || 'Demarrer la conversation'}
                        </span>
                      </span>

                      {conversation.unreadCount > 0 && (
                        <span className={styles.unreadBadge} aria-label={`${conversation.unreadCount} non lu(s)`}>
                          {conversation.unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className={styles.thread}>
          <header className={styles.threadHeader}>
            <button
              type="button"
              className={styles.mobileBackButton}
              onClick={() => setMobileThreadOpen(false)}
            >
              Retour
            </button>

            <div className={styles.threadIdentity}>
              <h2 className={styles.threadName}>{activeRecipient?.fullName || 'Conversation'}</h2>
              {activeRecipient && (
                <p className={styles.threadMeta}>
                  {activeRecipient.role === 'mentor' ? 'Mentor' : 'Etudiant'}
                  {selectedConversation ? ` - dernier message ${formatConversationTime(selectedConversation.lastMessageAt)}` : ''}
                </p>
              )}
            </div>
          </header>

          <div className={styles.messageViewport}>
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
              <p className={styles.empty}>Aucun message dans cette conversation.</p>
            ) : (
              <ul className={styles.messageList}>
                {messages.map((message) => {
                  const mine = message.senderId === currentUserId;
                  return (
                    <li key={message.messageId} className={mine ? styles.rowMine : styles.rowPeer}>
                      <article className={mine ? styles.bubbleMine : styles.bubblePeer}>
                        <p>{message.body}</p>
                        <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.composer}>
            <div className={styles.messageField}>
              <Input
                name="message-body"
                label="Votre message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Ecrire un message..."
              />
            </div>

            <div className={styles.composerActions}>
              <Button type="button" onClick={sendMessage} isLoading={sending}>
                Envoyer
              </Button>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

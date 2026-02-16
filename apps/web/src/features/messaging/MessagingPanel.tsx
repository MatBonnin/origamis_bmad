'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';
import styles from './MessagingPanel.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

interface Props {
  accessToken: string;
  currentUserId: string;
}

export function MessagingPanel({ accessToken, currentUserId }: Props) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<'in_app' | 'push'>('in_app');
  const [error, setError] = useState('');

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.conversationId === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger les conversations');
        return;
      }

      const data = result.data as { conversations?: ConversationItem[] };
      const nextConversations = Array.isArray(data.conversations)
        ? data.conversations
        : [];
      setConversations(nextConversations);

      if (nextConversations.length > 0) {
        setSelectedConversationId(
          (previous) => previous || nextConversations[0].conversationId,
        );
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
          `${API_URL}/conversations/${conversationId}/messages?${params.toString()}`,
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

        setMessages((previous) =>
          cursor ? [...nextMessages, ...previous] : nextMessages,
        );
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

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      void loadMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadMessages]);

  const sendMessage = async () => {
    const trimmed = body.trim();
    if (!trimmed || !selectedConversation) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          receiverId: selectedConversation.peer.userId,
          body: trimmed,
          notifyChannel: channel,
          clientMessageId: `client-${Date.now()}`,
        }),
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible d envoyer le message');
        return;
      }

      const data = result.data as { message: MessageItem; conversationId: string };
      setMessages((previous) => [...previous, data.message]);
      setBody('');
      void loadConversations();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={styles.container} aria-labelledby="messaging-title">
      <header className={styles.header}>
        <h1 id="messaging-title" className={styles.title}>Messages</h1>
        <p className={styles.subtitle}>Echangez avec vos mentors avant le rendez-vous.</p>
      </header>

      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div className={styles.layout}>
        <Card className={styles.sidebar}>
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingConversations ? (
              <div className={styles.skeletonList} aria-busy="true" aria-live="polite">
                <div className={styles.skeletonItem} />
                <div className={styles.skeletonItem} />
                <div className={styles.skeletonItem} />
              </div>
            ) : conversations.length === 0 ? (
              <p className={styles.empty} aria-live="polite">Aucune conversation pour le moment.</p>
            ) : (
              <ul className={styles.conversationList}>
                {conversations.map((conversation) => (
                  <li key={conversation.conversationId}>
                    <button
                      type="button"
                      className={
                        conversation.conversationId === selectedConversationId
                          ? styles.conversationActive
                          : styles.conversationButton
                      }
                      onClick={() => setSelectedConversationId(conversation.conversationId)}
                    >
                      <span className={styles.conversationName}>{conversation.peer.fullName}</span>
                      <span className={styles.conversationPreview}>
                        {conversation.lastMessage?.body || 'Demarrer la conversation'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className={styles.chatCard}>
          <CardHeader>
            <CardTitle>{selectedConversation?.peer.fullName || 'Conversation'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.chatBody}>
              {nextCursor && (
                <div className={styles.loadMoreRow}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void loadMessages(selectedConversationId, nextCursor)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Chargement...' : 'Charger l historique'}
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
                <p className={styles.empty} aria-live="polite">Aucun message dans cette conversation.</p>
              ) : (
                <ul className={styles.messageList}>
                  {messages.map((message) => {
                    const mine = message.senderId === currentUserId;
                    return (
                      <li key={message.messageId} className={mine ? styles.rowMine : styles.rowPeer}>
                        <article className={mine ? styles.bubbleMine : styles.bubblePeer}>
                          <p>{message.body}</p>
                          <time dateTime={message.createdAt}>
                            {new Date(message.createdAt).toLocaleString('fr-FR')}
                          </time>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className={styles.composer}>
              <Input
                name="message-body"
                label="Votre message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Ecrire un message..."
              />
              <Select
                name="notify-channel"
                label="Canal de notification"
                value={channel}
                options={[
                  { value: 'in_app', label: 'In-app' },
                  { value: 'push', label: 'Push' },
                ]}
                onChange={(event) => setChannel(event.target.value as 'in_app' | 'push')}
              />
              <Button type="button" onClick={sendMessage} isLoading={sending}>
                Envoyer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

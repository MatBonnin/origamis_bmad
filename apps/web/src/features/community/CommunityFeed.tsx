'use client';

import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { ReportModal } from './report/ReportModal';
import styles from './CommunityFeed.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Post = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  status: 'published' | 'under_review' | 'removed';
  createdAt: string;
  repliesCount: number;
};

interface Props {
  accessToken: string;
  userId: string;
}

export function CommunityFeed({ accessToken, userId }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [error, setError] = useState('');
  const [liveMessage, setLiveMessage] = useState('');
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  useEffect(() => {
    const socket: Socket = io(`${API_URL}/community`, {
      transports: ['websocket'],
      autoConnect: true,
    });

    const onCreated = (incoming: Post) => {
      setPosts((current) => [incoming, ...current.filter((item) => item.id !== incoming.id)]);
      setLiveMessage('Nouveau post recu en temps reel');
    };

    const onReply = () => {
      setLiveMessage('Nouvelle reponse recu en temps reel');
      void loadPosts();
    };

    socket.on('community.post.created', onCreated);
    socket.on('community.reply.created', onReply);

    return () => {
      socket.off('community.post.created', onCreated);
      socket.off('community.reply.created', onReply);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPosts = async () => {
    setError('');

    const params = new URLSearchParams();
    if (tagFilter.trim()) {
      params.set('tag', tagFilter.trim().toLowerCase());
    }

    const response = await fetch(`${API_URL}/community/posts?${params.toString()}`, {
      headers,
      cache: 'no-store',
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Chargement impossible');
      setPosts([]);
      return;
    }

    setPosts((result.data.posts ?? []) as Post[]);
  };

  useEffect(() => {
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagFilter]);

  const publishPost = async () => {
    setError('');

    const response = await fetch(`${API_URL}/community/posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title,
        body,
        tags: tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Publication impossible');
      return;
    }

    setTitle('');
    setBody('');
    setTags('');
    setLiveMessage('Post publie');
    await loadPosts();
  };

  const addReply = async (postId: string) => {
    const content = window.prompt('Votre reponse');
    if (!content?.trim()) {
      return;
    }

    const response = await fetch(`${API_URL}/community/posts/${postId}/replies`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body: content }),
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      setError(result.error?.message || 'Reponse impossible');
      return;
    }

    setLiveMessage('Reponse envoyee');
    await loadPosts();
  };

  return (
    <section className={styles.container} aria-labelledby="community-title">
      <header className={styles.header}>
        <h1 id="community-title" className={styles.title}>Communaute</h1>
        <p className={styles.subtitle}>Publiez, repondez et signalez les contenus inappropries.</p>
      </header>

      <p className={styles.srOnly} aria-live="polite">{liveMessage}</p>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau post</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.composer}>
            <Input aria-label="Titre" placeholder="Titre" value={title} onChange={(event) => setTitle(event.target.value)} />
            <textarea
              className={styles.textarea}
              aria-label="Contenu markdown"
              placeholder="Contenu (markdown limite)"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <Input aria-label="Tags" placeholder="tags, virgules" value={tags} onChange={(event) => setTags(event.target.value)} />
            <Button type="button" onClick={() => void publishPost()}>Publier</Button>
          </div>
        </CardContent>
      </Card>

      <div className={styles.filters}>
        <Input
          aria-label="Filtrer par tag"
          placeholder="Filtrer par tag"
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
        />
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <ol className={styles.feed}>
        {posts.map((post) => (
          <li key={post.id}>
            <Card variant="outlined">
              <CardHeader className={styles.cardHeader}>
                <CardTitle>{post.title}</CardTitle>
                <span className={styles.badge} data-status={post.status}>
                  {post.status}
                </span>
              </CardHeader>
              <CardContent>
                <p className={styles.body}>{post.body}</p>
                <p className={styles.meta}>Auteur: {post.authorId}</p>
                <p className={styles.meta}>Tags: {post.tags.join(', ') || 'aucun'}</p>
                <p className={styles.meta}>Reponses: {post.repliesCount}</p>
                <div className={styles.actions}>
                  <Button type="button" size="sm" onClick={() => void addReply(post.id)}>
                    Repondre
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setReportTarget(post.id)}>
                    Signaler
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <ReportModal
        isOpen={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        targetId={reportTarget}
        targetType="post"
        accessToken={accessToken}
        userId={userId}
        onSubmitted={() => setLiveMessage('Signalement envoye')}
      />
    </section>
  );
}

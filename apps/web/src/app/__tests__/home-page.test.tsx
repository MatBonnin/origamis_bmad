import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Home from '../page';

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('Home landing page', () => {
  it('renders core sections and primary CTAs', () => {
    render(<Home />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /construis ton parcours avec un mentor adapte a tes objectifs/i,
      }),
    ).toBeInTheDocument();

    const signupLinks = screen.getAllByRole('link', { name: /inscription|creer mon compte|commencer maintenant/i });
    expect(signupLinks.length).toBeGreaterThan(0);

    const signinLinks = screen.getAllByRole('link', { name: /connexion|me connecter|j'ai deja un compte/i });
    expect(signinLinks.length).toBeGreaterThan(0);

    expect(screen.getByRole('heading', { level: 2, name: /comment ca marche/i })).toBeInTheDocument();
  });
});

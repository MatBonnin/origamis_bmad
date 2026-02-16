import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next-auth/react
const mockSession = vi.fn(() => ({
  data: {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Jean Dupont',
      firstName: 'Jean',
      lastName: 'Dupont',
      roles: ['etudiant'],
    },
    accessToken: 'token-123',
  },
  status: 'authenticated' as const,
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} {...props} />
  ),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock logo import
vi.mock('@/app/assets/logo.png', () => ({
  default: '/logo.png',
}));

import { AppHeader } from '../AppHeader';

describe('AppHeader', () => {
  beforeEach(() => {
    mockSession.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Jean Dupont',
          firstName: 'Jean',
          lastName: 'Dupont',
          roles: ['etudiant'],
        },
        accessToken: 'token-123',
      },
      status: 'authenticated' as const,
    });
  });

  it('should render the logo', () => {
    render(<AppHeader />);

    expect(screen.getByAltText("Orig'AMI")).toBeInTheDocument();
  });

  it('should render user name and role in the profile badge', () => {
    render(<AppHeader />);

    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Profil Etudiant')).toBeInTheDocument();
  });

  it('should render user initials in the avatar', () => {
    render(<AppHeader />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should render the profile badge as a link to /profil', () => {
    render(<AppHeader />);

    const profileLink = screen.getByRole('link', { name: /Jean Dupont/i });
    expect(profileLink).toHaveAttribute('href', '/profil');
  });

  it('should display mentor role label for mentor users', () => {
    mockSession.mockReturnValue({
      data: {
        user: {
          id: 'user-2',
          email: 'mentor@example.com',
          name: 'Alice Martin',
          firstName: 'Alice',
          lastName: 'Martin',
          roles: ['mentor'],
        },
        accessToken: 'token-456',
      },
      status: 'authenticated' as const,
    });

    render(<AppHeader />);

    expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('Profil Mentor')).toBeInTheDocument();
    expect(screen.getByText('AM')).toBeInTheDocument();
  });

  it('should render hamburger button with correct aria-label', () => {
    render(<AppHeader />);

    const hamburger = screen.getByLabelText('Ouvrir le menu de navigation');
    expect(hamburger).toBeInTheDocument();
  });

  it('should call onMenuToggle when hamburger is clicked', async () => {
    const onMenuToggle = vi.fn();
    const user = userEvent.setup();
    render(<AppHeader onMenuToggle={onMenuToggle} />);

    await user.click(screen.getByLabelText('Ouvrir le menu de navigation'));

    expect(onMenuToggle).toHaveBeenCalledOnce();
  });

  it('should not render profile badge when not authenticated', () => {
    mockSession.mockReturnValue({
      data: null,
      status: 'unauthenticated' as const,
    });

    render(<AppHeader />);

    expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument();
  });
});

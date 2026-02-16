import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPathname = vi.fn(() => '/dashboard');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/dashboard');
  });

  it('should render all 5 navigation items', () => {
    render(<Sidebar />);

    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    expect(screen.getByText('Mentors')).toBeInTheDocument();
    expect(screen.getByText('Projets')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Calendrier')).toBeInTheDocument();
  });

  it('should render navigation links with correct hrefs', () => {
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /tableau de bord/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /mentors/i })).toHaveAttribute('href', '/mentors');
    expect(screen.getByRole('link', { name: /projets/i })).toHaveAttribute('href', '/projets');
    expect(screen.getByRole('link', { name: /messages/i })).toHaveAttribute('href', '/messages');
    expect(screen.getByRole('link', { name: /calendrier/i })).toHaveAttribute('href', '/calendrier');
  });

  it('should mark the active item with aria-current="page"', () => {
    mockPathname.mockReturnValue('/dashboard');
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /tableau de bord/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /mentors/i })).not.toHaveAttribute('aria-current');
  });

  it('should mark active item for nested routes', () => {
    mockPathname.mockReturnValue('/mentors/123');
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /mentors/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /tableau de bord/i })).not.toHaveAttribute('aria-current');
  });

  it('should have aria-label on the aside element', () => {
    render(<Sidebar />);

    expect(screen.getByLabelText('Navigation principale')).toBeInTheDocument();
  });

  it('should call onClose when a nav link is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Sidebar isOpen onClose={onClose} />);

    await user.click(screen.getByRole('link', { name: /mentors/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should render overlay when isOpen is true and call onClose on click', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Sidebar isOpen onClose={onClose} />);

    const overlay = screen.getByTestId('sidebar-overlay');
    expect(overlay).toBeInTheDocument();

    await user.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should not render overlay when isOpen is false', () => {
    render(<Sidebar isOpen={false} />);

    expect(screen.queryByTestId('sidebar-overlay')).not.toBeInTheDocument();
  });
});

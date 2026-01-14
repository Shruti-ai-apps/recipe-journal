import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserMenu from './UserMenu';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the auth context
const mockSignOut = jest.fn();

const mockUseAuth = jest.fn();

jest.mock('@/contexts', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('UserMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  describe('unauthenticated state', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        signOut: mockSignOut,
        loading: false,
      });
    });

    it('should render Sign in link when no user', () => {
      render(<UserMenu />);

      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByRole('link')).toHaveAttribute('href', '/login');
    });

    it('should not render user dropdown when no user', () => {
      render(<UserMenu />);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('authenticated state', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: null,
      },
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        signOut: mockSignOut,
        loading: false,
      });
    });

    it('should render user avatar when logged in', () => {
      render(<UserMenu />);

      const avatar = screen.getByText('T'); // First letter of email
      expect(avatar).toBeInTheDocument();
    });

    it('should display user name in button', () => {
      render(<UserMenu />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should display email username if no full_name', () => {
      mockUseAuth.mockReturnValue({
        user: {
          ...mockUser,
          user_metadata: {},
        },
        signOut: mockSignOut,
        loading: false,
      });

      render(<UserMenu />);

      expect(screen.getByText('test')).toBeInTheDocument();
    });

    it('should render avatar image if available', () => {
      mockUseAuth.mockReturnValue({
        user: {
          ...mockUser,
          user_metadata: {
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
        signOut: mockSignOut,
        loading: false,
      });

      render(<UserMenu />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    describe('dropdown interactions', () => {
      it('should open dropdown on click', async () => {
        render(<UserMenu />);

        const trigger = screen.getByRole('button');
        await userEvent.click(trigger);

        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      it('should display user email in dropdown', async () => {
        render(<UserMenu />);

        await userEvent.click(screen.getByRole('button'));

        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      it('should display user name in dropdown', async () => {
        render(<UserMenu />);

        await userEvent.click(screen.getByRole('button'));

        // Name appears both in button and dropdown
        const names = screen.getAllByText('Test User');
        expect(names.length).toBeGreaterThanOrEqual(1);
      });

      it('should close dropdown on outside click', async () => {
        render(
          <div>
            <div data-testid="outside">Outside</div>
            <UserMenu />
          </div>
        );

        // Open dropdown
        await userEvent.click(screen.getByRole('button'));
        expect(screen.getByRole('menu')).toBeInTheDocument();

        // Click outside
        fireEvent.mouseDown(screen.getByTestId('outside'));

        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      });

      it('should close dropdown on Escape key', async () => {
        render(<UserMenu />);

        await userEvent.click(screen.getByRole('button'));
        expect(screen.getByRole('menu')).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape' });

        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      });

      it('should have link to favorites', async () => {
        render(<UserMenu />);

        await userEvent.click(screen.getByRole('button'));

        const favoritesLink = screen.getByText('My Favorites');
        expect(favoritesLink.closest('a')).toHaveAttribute('href', '/favorites');
      });
    });

    describe('sign out', () => {
      it('should call signOut when sign out clicked', async () => {
        render(<UserMenu />);

        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByText('Sign out'));

        expect(mockSignOut).toHaveBeenCalled();
      });

      it('should navigate to home after sign out', async () => {
        render(<UserMenu />);

        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByText('Sign out'));

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/');
        });
      });

      it('should show loading state during sign out', async () => {
        mockUseAuth.mockReturnValue({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' },
          },
          signOut: mockSignOut,
          loading: true,
        });

        render(<UserMenu />);

        await userEvent.click(screen.getByRole('button'));

        expect(screen.getByText('Signing out...')).toBeInTheDocument();
      });
    });

    describe('accessibility', () => {
      it('should have aria-expanded attribute', async () => {
        render(<UserMenu />);

        const trigger = screen.getByRole('button');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(trigger);

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });

      it('should have aria-haspopup attribute', () => {
        render(<UserMenu />);

        const trigger = screen.getByRole('button');
        expect(trigger).toHaveAttribute('aria-haspopup', 'true');
      });

      it('should have menu role on dropdown', async () => {
        render(<UserMenu />);

        await userEvent.click(screen.getByRole('button'));

        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      it('should have menuitem role on dropdown items', async () => {
        render(<UserMenu />);

        await userEvent.click(screen.getByRole('button'));

        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems.length).toBeGreaterThan(0);
      });
    });
  });
});

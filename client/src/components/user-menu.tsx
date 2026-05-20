import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';

function getInitials(username: string): string {
  return username
    .split(/[@\s]/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function truncateId(id: string): string {
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

interface UserMenuProps {
  children?: ReactNode;
}

export function UserMenu({ children }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, userId, logout } = useAuth();

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const menuItems = [
    {
      label: 'Logout',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, menuItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < menuItems.length) {
        menuItems[focusedIndex].onClick();
      }
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-8 h-8 rounded-full"
            onError={() => {}}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {user?.username ? getInitials(user.username) : '??'}
          </div>
        )}
        <span className="text-sm font-medium hidden sm:inline">
          {user?.username || `User ${truncateId(userId)}`}
        </span>
        {children}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-lg border bg-background shadow-lg z-50 focus:outline-none"
          onKeyDown={handleKeyDown}
        >
          {user && (
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium">{user.username}</p>
              <p className="text-xs text-muted-foreground font-mono">
                ID: {truncateId(user.id)}
              </p>
            </div>
          )}
          <div className="p-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer text-destructive"
              autoFocus={focusedIndex === 0}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
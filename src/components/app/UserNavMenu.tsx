'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronDown,
  Check
} from 'lucide-react';
import { EnclaveUser, clearUserSession } from '@/lib/authStore';
import { getInitials } from '@/lib/userAccountStore';
import { useTheme } from '@/lib/theme';

interface UserNavMenuProps {
  user: EnclaveUser;
}

export default function UserNavMenu({ user }: UserNavMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setOpen(false);
    clearUserSession();
    router.push('/');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 p-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-xs font-mono font-semibold text-[var(--accent)] overflow-hidden">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
          ) : (
            <span>{getInitials(user.displayName)}</span>
          )}
        </div>
        <span className="text-xs font-mono font-medium text-[var(--text-primary)] pr-1 hidden sm:inline">
          {user.displayName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)] pr-0.5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl py-2 z-50 text-xs font-mono animate-in fade-in duration-100">
          <div className="px-4 py-2 border-b border-[var(--border)]">
            <div className="font-semibold text-[var(--text-primary)] truncate">{user.displayName}</div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</div>
          </div>

          <div className="py-1">
            <Link
              href="/app/profile"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-muted)] flex items-center space-x-2.5 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Profile & Settings</span>
            </Link>

            <Link
              href="/app/profile#security"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-muted)] flex items-center space-x-2.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Security Center</span>
            </Link>
          </div>

          {/* Theme Switcher Quick Toggle */}
          <div className="border-t border-[var(--border)] px-4 py-2">
            <div className="text-[10px] uppercase text-[var(--text-muted)] font-semibold mb-1.5 tracking-wider">
              Theme
            </div>
            <div className="grid grid-cols-3 gap-1 bg-[var(--surface-muted)] p-1 rounded-lg border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-1 flex items-center justify-center rounded transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[var(--surface)] text-[var(--accent)] shadow-2xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Light"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-1 flex items-center justify-center rounded transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[var(--surface)] text-[var(--accent)] shadow-2xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Dark"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`py-1 flex items-center justify-center rounded transition-colors cursor-pointer ${
                  theme === 'system'
                    ? 'bg-[var(--surface)] text-[var(--accent)] shadow-2xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="System"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="border-t border-[var(--border)] my-1" />

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

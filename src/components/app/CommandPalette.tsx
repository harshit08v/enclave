'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  LogIn,
  User,
  Shield,
  Sun,
  Moon,
  Laptop,
  LogOut,
  Search,
  X
} from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { clearUserSession } from '@/lib/authStore';

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
  onTriggerJoin?: () => void;
}

export default function CommandPalette({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  onTriggerJoin
}: CommandPaletteProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isControlled = externalIsOpen !== undefined;
  const open = isControlled ? externalIsOpen : internalOpen;

  const handleClose = () => {
    if (isControlled && externalOnClose) {
      externalOnClose();
    } else {
      setInternalOpen(false);
    }
    setQuery('');
    setSelectedIndex(0);
  };

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) {
          handleClose();
        } else {
          if (isControlled && externalOnClose) {
            // Controlled externally
          } else {
            setInternalOpen(true);
          }
        }
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isControlled, externalOnClose]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands: CommandItem[] = [
    {
      id: 'create-room',
      label: 'Create Private Room',
      category: 'Rooms',
      icon: <Plus className="w-4 h-4 text-[var(--accent)]" />,
      action: () => {
        handleClose();
        router.push('/app/new');
      },
      keywords: ['new', 'create', 'room', 'start']
    },
    {
      id: 'join-room',
      label: 'Join with Link or ID',
      category: 'Rooms',
      icon: <LogIn className="w-4 h-4 text-[var(--accent)]" />,
      action: () => {
        handleClose();
        if (onTriggerJoin) {
          onTriggerJoin();
        } else {
          router.push('/app');
        }
      },
      keywords: ['join', 'enter', 'open', 'room']
    },
    {
      id: 'profile',
      label: 'Profile & Account Settings',
      category: 'Account',
      icon: <User className="w-4 h-4 text-[var(--text-secondary)]" />,
      action: () => {
        handleClose();
        router.push('/app/profile');
      },
      keywords: ['profile', 'account', 'settings', 'name', 'email', 'password']
    },
    {
      id: 'security-center',
      label: 'Security & Active Sessions',
      category: 'Account',
      icon: <Shield className="w-4 h-4 text-[var(--text-secondary)]" />,
      action: () => {
        handleClose();
        router.push('/app/profile#security');
      },
      keywords: ['security', 'sessions', 'audit', 'e2ee', 'keys']
    },
    {
      id: 'theme-light',
      label: 'Switch to Light Theme',
      category: 'Appearance',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      action: () => {
        setTheme('light');
        handleClose();
      },
      keywords: ['light', 'white', 'theme', 'appearance']
    },
    {
      id: 'theme-dark',
      label: 'Switch to Dark Theme',
      category: 'Appearance',
      icon: <Moon className="w-4 h-4 text-slate-400" />,
      action: () => {
        setTheme('dark');
        handleClose();
      },
      keywords: ['dark', 'charcoal', 'theme', 'appearance', 'night']
    },
    {
      id: 'theme-system',
      label: 'Use System Theme Preference',
      category: 'Appearance',
      icon: <Laptop className="w-4 h-4 text-[var(--text-secondary)]" />,
      action: () => {
        setTheme('system');
        handleClose();
      },
      keywords: ['system', 'automatic', 'theme', 'os']
    },
    {
      id: 'sign-out',
      label: 'Sign Out of ENCLAVE',
      category: 'Account',
      icon: <LogOut className="w-4 h-4 text-rose-500" />,
      action: () => {
        handleClose();
        clearUserSession();
        router.push('/login');
      },
      keywords: ['logout', 'signout', 'exit', 'leave']
    }
  ];

  const filteredCommands = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      cmd.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  });

  const handleKeyDownNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        selected.action();
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownNav}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close command palette"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1 font-mono text-xs">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              No matching commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-soft)] text-[var(--text-primary)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="shrink-0">{cmd.icon}</span>
                    <span>{cmd.label}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    {cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Keyboard Hints Footer */}
        <div className="border-t border-[var(--border)] px-4 py-2.5 bg-[var(--surface-muted)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <div className="flex items-center space-x-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">↓</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">↵</kbd> select</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">esc</kbd> close</span>
          </div>
          <span>ENCLAVE</span>
        </div>
      </div>
    </div>
  );
}

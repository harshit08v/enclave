'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Radio,
  Sliders,
  History,
  Activity,
  LogOut,
  Users,
  LayoutDashboard,
  Lock
} from 'lucide-react';
import { AdminAuthProvider, useAdminAuth } from '@/lib/adminAuthContext';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, logout } = useAdminAuth();

  // If on login page, render clean auth wrapper
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <span className="font-mono text-xs text-[var(--text-secondary)] tracking-wider">
            AUTHENTICATING ADMIN PRIVILEGES...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-[var(--border)] bg-[var(--surface)] p-8 rounded-lg shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-mono font-bold tracking-tight text-[var(--text-primary)] mb-2">
            ADMIN SESSION REQUIRED
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
            Administrative endpoints require verified server-side session credentials. Please sign in to the Control Center.
          </p>
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded bg-[var(--accent)] text-white text-xs font-mono font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            ENTER ADMIN PORTAL
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/rooms', label: 'Active Rooms', icon: Radio },
    { href: '/admin/security', label: 'Security & Abuse', icon: ShieldAlert },
    { href: '/admin/audit', label: 'Audit Log', icon: History },
    { href: '/admin/health', label: 'System Health', icon: Activity },
    { href: '/admin/settings', label: 'Settings', icon: Sliders },
    { href: '/admin/users', label: 'User Accounts', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col md:flex-row text-[var(--foreground)]">
      {/* Desktop Sidebar */}
      <aside className="w-full md:w-64 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col shrink-0">
        {/* Brand & Security Stamp */}
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-semibold tracking-wider text-[var(--text-primary)]">
              ENCLAVE CONTROL
            </span>
          </div>
          <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-tight">
            ZERO-KNOWLEDGE TELEMETRY
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md font-mono text-xs transition-colors ${
                  isActive
                    ? 'bg-[var(--accent)] text-white font-medium shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Operator Info & Signout */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-muted)]/40 flex items-center justify-between">
          <div className="truncate">
            <div className="font-mono text-[11px] font-semibold text-[var(--text-primary)] truncate">
              {user?.username || 'admin'}
            </div>
            <div className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400">
              ● Privileged Session
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Sign out of Admin Control"
            className="p-1.5 rounded hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)] px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-[var(--text-secondary)] uppercase">
              CONSOLE /
            </span>
            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
              {navItems.find(i => i.href === pathname)?.label || 'Operations'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--accent-soft)] text-[var(--accent)] text-[10px] font-mono font-medium">
              <span>ZERO PLAINTEXT ACCESS</span>
            </div>
            <Link
              href="/"
              target="_blank"
              className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
            >
              Public App ↗
            </Link>
          </div>
        </header>

        {/* Inner Page View */}
        <div className="p-6 md:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminAuthProvider>
  );
}

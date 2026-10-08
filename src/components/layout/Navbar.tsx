'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight } from 'lucide-react';
import { getStoredUser } from '@/lib/authStore';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<{ displayName: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setUser(getStoredUser());
    }, 0);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navLinks = [
    { href: '/security', label: 'Security' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/about', label: 'About' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/90 backdrop-blur-md transition-all duration-200 ${
        isScrolled ? 'border-b border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]' : 'border-b border-[var(--border)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-2 group">
          <span className="font-mono text-sm font-semibold tracking-widest text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
            ENCLAVE
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-mono tracking-wider transition-colors ${
                  isActive
                    ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--accent)]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <Link
              href="/app"
              className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--accent)] px-3 py-1.5 rounded-md hover:bg-[var(--accent-soft)] transition-colors flex items-center space-x-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span>{user.displayName}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--accent)] px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
          )}

          <Button asChild size="sm" className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">
            <Link href={user ? '/app/new' : '/signup'} className="flex items-center space-x-1.5">
              <span>Start Chatting</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-md transition-colors cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--background)] border-b border-[var(--border)] px-6 py-5 space-y-4">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-mono py-1 transition-colors ${
                  pathname === link.href ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--accent)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-[var(--border)] flex flex-col space-y-2.5">
            {user ? (
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-mono text-[var(--text-secondary)] py-1 flex items-center space-x-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>Console ({user.displayName})</span>
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-mono text-[var(--text-secondary)] py-1"
              >
                Sign In
              </Link>
            )}

            <Button asChild className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">
              <Link
                href={user ? '/app/new' : '/signup'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2"
              >
                <span>Start Chatting</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

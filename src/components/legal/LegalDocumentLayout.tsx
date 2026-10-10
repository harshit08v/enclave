import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Shield, ArrowLeft, ArrowRight, FileText, Lock, Clock, ExternalLink } from 'lucide-react';

export interface TableOfContentsItem {
  id: string;
  title: string;
}

export interface RelatedPolicy {
  title: string;
  href: string;
  description: string;
}

export interface LegalDocumentLayoutProps {
  title: string;
  subtitle: string;
  category: 'Legal' | 'Privacy' | 'Security' | 'User Rights';
  effectiveDate: string;
  lastUpdated: string;
  toc: TableOfContentsItem[];
  relatedPolicies: RelatedPolicy[];
  children: React.ReactNode;
}

export default function LegalDocumentLayout({
  title,
  subtitle,
  category,
  effectiveDate,
  lastUpdated,
  toc,
  relatedPolicies,
  children
}: LegalDocumentLayoutProps) {
  const categoryColors = {
    Legal: 'bg-[#F4F4F0] dark:bg-[#1A1C18] text-[#111111] dark:text-[#F3F3EF] border-[#E4E4DF] dark:border-[#2B2E2A]',
    Privacy: 'bg-[#E7F0EC] dark:bg-[#193128] text-[#174A3A] dark:text-[#5E9B82] border-[#C9DDD5] dark:border-[#254438]',
    Security: 'bg-[#E7F0EC] dark:bg-[#193128] text-[#174A3A] dark:text-[#5E9B82] border-[#C9DDD5] dark:border-[#254438]',
    'User Rights': 'bg-[#F4F4F0] dark:bg-[#1A1C18] text-[#111111] dark:text-[#F3F3EF] border-[#E4E4DF] dark:border-[#2B2E2A]'
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Breadcrumb & Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 text-xs font-mono text-[var(--text-muted)]">
            <Link
              href="/legal"
              className="inline-flex items-center space-x-1.5 hover:text-[var(--accent)] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Legal Center</span>
            </Link>

            <div className="flex items-center space-x-4">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Last Updated: {lastUpdated}</span>
              </span>
              <span>·</span>
              <span>Effective: {effectiveDate}</span>
            </div>
          </div>

          {/* Document Hero */}
          <header className="border-b border-[var(--border)] pb-10 mb-12 space-y-4">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider font-semibold border ${categoryColors[category]}`}>
                {category}
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono tracking-wider text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-border)] font-medium">
                Verified Codebase Spec
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-[var(--text-primary)] leading-tight">
              {title}
            </h1>

            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          </header>

          {/* Main Grid: Content + Sticky TOC */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Table of Contents - Desktop Sidebar */}
            <aside className="hidden lg:block lg:col-span-3 sticky top-28 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-xs">
              <div className="flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-4">
                <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Document Contents</span>
              </div>
              <nav aria-label="Table of contents">
                <ul className="space-y-2 text-xs font-mono">
                  {toc.map((item, idx) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-[var(--text-secondary)] hover:text-[var(--accent)] block py-1 transition-colors leading-snug"
                      >
                        <span className="text-[var(--text-muted)] mr-1.5">{idx + 1}.</span>
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-6 pt-5 border-t border-[var(--border)] space-y-3">
                <div className="text-[11px] font-mono text-[var(--text-muted)]">
                  Need official assistance?
                </div>
                <Link
                  href="/legal/contact"
                  className="text-xs font-mono font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  <span>Submit Privacy Request</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </aside>

            {/* Document Body */}
            <article className="lg:col-span-9 space-y-12 text-[var(--text-primary)] leading-relaxed">
              {/* Mobile Table of Contents Accordion / Card */}
              <div className="lg:hidden bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-8">
                <div className="flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3">
                  <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Document Contents</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {toc.map((item, idx) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-[var(--text-secondary)] hover:text-[var(--accent)] block py-1"
                      >
                        <span className="text-[var(--text-muted)] mr-1">{idx + 1}.</span>
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Children Content */}
              <div className="prose-container space-y-12">
                {children}
              </div>

              {/* Compliance & Contact Banner */}
              <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-6 sm:p-8 space-y-4 mt-16">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-[var(--accent)]" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    Inquiries & Grievance Redressal
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  For formal data rights requests, security disclosures, or regulatory inquiries concerning this policy, submit a verified request through our official channels.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href="/legal/contact"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-mono font-medium hover:bg-[var(--accent-hover)] transition-colors shadow-xs"
                  >
                    <span>Contact Privacy & Legal Desk</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/legal/data-rights"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
                  >
                    <span>Exercise Data Rights</span>
                  </Link>
                </div>
              </div>

              {/* Related Policies Section */}
              {relatedPolicies.length > 0 && (
                <section className="pt-10 border-t border-[var(--border)]">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold mb-6">
                    Related Legal & Privacy Documents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {relatedPolicies.map((p) => (
                      <Link
                        key={p.href}
                        href={p.href}
                        className="group bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-5 transition-all flex flex-col justify-between space-y-2 shadow-xs"
                      >
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors flex items-center justify-between">
                            <span>{p.title}</span>
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[var(--accent)]" />
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                            {p.description}
                          </p>
                        </div>
                        <div className="text-[11px] font-mono text-[var(--accent)] pt-2 font-medium">
                          Read Policy →
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

'use client';

import React, { useState } from 'react';

export default function IdeaSection() {
  const [activeStep, setActiveStep] = useState(2);

  const steps = [
    { num: '01', label: 'CREATE', desc: 'Initialize an ephemeral room with local client entropy.' },
    { num: '02', label: 'ENTER', desc: 'Derive keys client-side using the out-of-band access pass.' },
    { num: '03', label: 'TALK', desc: 'Direct AES-256-GCM encrypted payload exchange over neutral relay.' },
    { num: '04', label: 'LEAVE', desc: 'Departure protocol initiates memory key zeroization.' },
    { num: '05', label: 'DESTROY', desc: 'Final participant leaves; room is permanently destroyed.' },
  ];

  return (
    <section className="py-24 border-t border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Editorial Statement */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[var(--accent)] uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span>01 / PHILOSOPHY</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[var(--text-primary)] leading-[1.1]">
              Not every conversation needs a history.
            </h2>

            <div className="space-y-4 text-base text-[var(--text-secondary)] leading-relaxed">
              <p>
                Some conversations need a place to exist. They don&apos;t need a place to remain.
              </p>
              <p>
                Most messaging platforms are built around permanent storage, indexing, and endless archives. ENCLAVE is designed around presence: when everyone departs, the room has no reason to exist.
              </p>
            </div>

            <div className="pt-2">
              <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
                <span className="text-[var(--accent)] font-semibold">Guiding Principle: </span>
                Conversations exist only as long as participants are present.
              </div>
            </div>
          </div>

          {/* Right: Clean Editorial Timeline */}
          <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sm:p-8 space-y-8 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Room Lifecycle Timeline
              </span>
              <span className="text-xs font-mono text-[var(--accent)] font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>EPHEMERAL PROTOCOL</span>
              </span>
            </div>

            {/* Timeline Steps */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {steps.map((step, idx) => {
                const isCurrent = activeStep === idx;

                return (
                  <button
                    key={step.label}
                    onClick={() => setActiveStep(idx)}
                    className={`p-3 sm:p-4 rounded-lg border text-center transition-all flex flex-col items-center justify-between h-28 sm:h-32 text-left cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--accent-soft)] border-[var(--accent)] shadow-xs'
                        : 'bg-[var(--surface-muted)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]'
                    }`}
                  >
                    <span className={`text-[11px] font-mono font-semibold ${isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                      {step.num}
                    </span>
                    <span className={`text-xs font-mono font-medium tracking-wider ${isCurrent ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Step Detail */}
            <div className="p-5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase text-[var(--accent)] font-semibold">
                  Phase {steps[activeStep].num} — {steps[activeStep].label}
                </div>
                <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {steps[activeStep].desc}
                </div>
              </div>
              <span className="text-[10px] font-mono text-[var(--accent)] px-2 py-0.5 rounded bg-[var(--accent-soft)] border border-[var(--accent-border)] shrink-0 font-medium">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

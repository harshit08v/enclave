import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/marketing/HeroSection';
import { Button } from '@/components/ui/button';
import { ArrowRight, Lock, Shield, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Restored Approved Hero */}
        <HeroSection />

        {/* 1. HOW IT WORKS (Simplified 3 Steps) */}
        <section className="py-20 sm:py-24 border-t border-[#E4E4DF] bg-[#FAFAF8]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-14 space-y-3">
              <div className="text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
                HOW IT WORKS
              </div>
              <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#111111] leading-tight">
                Create a room, share the link, and start chatting.
              </h2>
              <p className="text-base text-[#666666] leading-relaxed">
                No accounts, no downloads, and no message archives.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="p-7 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <span className="text-xs font-mono font-bold text-[#174A3A] bg-[#E7F0EC] px-2.5 py-1 rounded border border-[#C9DDD5]">
                    STEP 01
                  </span>
                  <h3 className="text-lg font-semibold text-[#111111]">
                    Create a room
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Generate a temporary room in one click. You can set an optional access pass for extra privacy.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-7 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <span className="text-xs font-mono font-bold text-[#174A3A] bg-[#E7F0EC] px-2.5 py-1 rounded border border-[#C9DDD5]">
                    STEP 02
                  </span>
                  <h3 className="text-lg font-semibold text-[#111111]">
                    Share with your group
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Send the link to whoever you want to talk with. Only people with the link (and pass, if set) can join.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-7 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <span className="text-xs font-mono font-bold text-[#174A3A] bg-[#E7F0EC] px-2.5 py-1 rounded border border-[#C9DDD5]">
                    STEP 03
                  </span>
                  <h3 className="text-lg font-semibold text-[#111111]">
                    Leave when done
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Chats are temporary. When everyone leaves or the room is destroyed, stored room data is removed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. BUILT FOR PRIVACY FROM DAY ONE */}
        <section className="py-20 sm:py-24 border-t border-[#E4E4DF] bg-[#F4F4F0]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-14 space-y-3">
              <div className="text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
                PRIVACY BY DEFAULT
              </div>
              <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#111111] leading-tight">
                Built for conversations that shouldn&apos;t stick around.
              </h2>
              <p className="text-base text-[#666666] leading-relaxed">
                Most chat apps save your conversations forever. ENCLAVE is designed so they don&apos;t have to.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Point 1 */}
              <div className="p-7 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-[#E7F0EC] border border-[#C9DDD5] flex items-center justify-center text-[#174A3A]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#111111]">
                    Encrypted on your device
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Your messages are encrypted before they leave your browser, so only the people in the room can read them.
                  </p>
                </div>
              </div>

              {/* Point 2 */}
              <div className="p-7 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-[#E7F0EC] border border-[#C9DDD5] flex items-center justify-center text-[#174A3A]">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#111111]">
                    Nothing saved to disk
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    The server relays messages between participants in memory without writing chat logs or message history to a database.
                  </p>
                </div>
              </div>

              {/* Point 3 */}
              <div className="p-7 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-[#E7F0EC] border border-[#C9DDD5] flex items-center justify-center text-[#174A3A]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#111111]">
                    Rooms expire automatically
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    When a room is closed or times out, its data is removed from the server according to our deletion rules.
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Documentation Note */}
            <div className="mt-8 p-5 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <p className="text-xs text-[#666666] leading-relaxed">
                Looking for cryptographic specs, key derivation details, or threat model limits?
              </p>
              <Link
                href="/security"
                className="text-xs font-mono font-semibold text-[#174A3A] hover:underline flex items-center gap-1.5 shrink-0"
              >
                <span>Read our security architecture</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* 3. SIMPLE CALL TO ACTION */}
        <section className="py-24 sm:py-28 px-6 text-center bg-[#FAFAF8] border-t border-[#E4E4DF]">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111]">
              Ready to talk in private?
            </h2>
            <p className="text-base sm:text-lg text-[#666666] leading-relaxed text-balance">
              Start a temporary room in seconds. No email, phone number, or installation needed.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Button asChild size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
                <Link href="/signup" className="flex items-center justify-center space-x-2">
                  <span>START CHATTING</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>

              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
                <Link href="/app" className="flex items-center justify-center space-x-2">
                  <span>JOIN A ROOM</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

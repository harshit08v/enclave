import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/marketing/HeroSection';
import IdeaSection from '@/components/marketing/IdeaSection';
import HowItWorksSection from '@/components/marketing/HowItWorksSection';
import AccessPassSection from '@/components/marketing/AccessPassSection';
import E2EESection from '@/components/marketing/E2EESection';
import ServerCourierSection from '@/components/marketing/ServerCourierSection';
import EphemeralSection from '@/components/marketing/EphemeralSection';
import SecurityArchitectureSection from '@/components/marketing/SecurityArchitectureSection';
import HonestSecuritySection from '@/components/marketing/HonestSecuritySection';
import FinalCTASection from '@/components/marketing/FinalCTASection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <IdeaSection />
        <HowItWorksSection />
        <AccessPassSection />
        <E2EESection />
        <ServerCourierSection />
        <EphemeralSection />
        <SecurityArchitectureSection />
        <HonestSecuritySection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}

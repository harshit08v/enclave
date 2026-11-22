# ENCLAVE — UI & Design System Implementation Specification
**Document Status:** Final UI/UX Specification  
**Design Aesthetic:** Editorial Privacy  
**Revision:** 2.0 (Post-Hardening Sprint)  
**Primary Typography:** Newsreader (Serif) · Geist Sans (Sans) · Geist Mono (Mono)  

---

## 1. Design Philosophy & Aesthetic Foundation

ENCLAVE's visual identity rejects generic, AI-generated SaaS card grids, neon purple gradients, and aggressive tech-bro crypto styling. Instead, it embodies **Editorial Privacy**:
- High-end literary and journalistic typography evocative of classical broadsheets and investigative publishing.
- Warm, tactile, non-sterile color palettes (deep forest greens, muted warm brass, natural paper canvas, and deep obsidian charcoal).
- Deliberate micro-interactions: responsive feedback, subtle 0.5px / 1px borders, smooth 150ms transitions, and high-legibility monospace accents for cryptographic artifacts.
- Functional transparency: every cryptographic property displayed in the UI truthfully mirrors verified runtime state.

---

## 2. Design Tokens & Palette Definition

```css
:root {
  /* Warm Natural Canvas & Surface (Light Mode) */
  --background: #FAFAF8;
  --foreground: #121312;

  --surface: #FFFFFF;
  --surface-muted: #F5F4F0;
  --surface-elevated: #FFFFFF;

  --border: #E5E0D8;
  --border-strong: #D6D0C5;

  --text-primary: #121312;
  --text-secondary: #575955;
  --text-muted: #7E827B;

  /* Primary Brand: Deep Forest Green */
  --accent: #174A3A;
  --accent-hover: #123C2F;
  --accent-soft: #EBF3F0;
  --accent-border: #C8DDD6;
  --accent-foreground: #FFFFFF;

  /* Secondary Metallic: Muted Warm Brass */
  --brass: #C5A880;
  --brass-muted: #D9C3A3;
  --brass-dark: #9E815B;

  --grid: #EAE6DF;
  color-scheme: light;
}

html.dark, :root[class~="dark"], .dark {
  /* Deep Obsidian Charcoal Canvas & Surface (Dark Mode) */
  --background: #0E1412;
  --foreground: #F4F4F0;

  --surface: #151E1B;
  --surface-muted: #111815;
  --surface-elevated: #1B2622;

  --border: #283630;
  --border-strong: #364841;

  --text-primary: #F4F4F0;
  --text-secondary: #A0ABA5;
  --text-muted: #6E7B74;

  /* Primary Brand: Deep Forest Green (Adapted for Dark Contrast) */
  --accent: #2E6B56;
  --accent-hover: #3B846B;
  --accent-soft: #142721;
  --accent-border: #204237;
  --accent-foreground: #FFFFFF;

  /* Secondary Metallic: Muted Warm Brass */
  --brass: #C5A880;
  --brass-muted: #594B37;
  --brass-dark: #3B3124;

  --grid: #1A2420;
  color-scheme: dark;
}
```

---

## 3. Typography Hierarchy

| Style | Font Family | Size / Leading | Usage |
| :--- | :--- | :--- | :--- |
| **Editorial Display** | Newsreader (Italic, weight 400) | 48px – 72px / 1.08 | Hero headlines, primary section titles, chamber introductions |
| **Section Headings** | Newsreader (Italic, weight 400) | 28px – 36px / 1.2 | Feature cards, modal titles, room state announcements |
| **UI Control Text** | Geist Sans (Normal/Medium, 500) | 13px – 15px / 1.4 | Buttons, navigation links, form labels, message bodies |
| **Cryptographic Mono** | Geist Mono (SemiBold, 600) | 10px – 12px / 1.4 | 60-digit safety numbers, room IDs, packet hashes, cipher indicators |

---

## 4. Component Architecture & Modular Layout

### 4.1 Marketing Landing Page (`src/app/page.tsx` & `HeroSection`)
- **Hero Section:** Newsreader serif headline ("*Private by design. Gone when you leave.*"), brand emblem, tactile CTA buttons, trust indicators.
- **Trust Invariants Bar:** Monospace badge row showcasing verified runtime invariants (AES-256-GCM, Double Ratchet, 100% Volatile RAM, Two-Factor Out-of-Band Gate, Zero Persistent Storage).
- **How It Works:** 3-phase chronological sequence (Create Chamber, Share Out-of-Band, Obliterate on Exit).
- **Defensible Privacy Grid:** Honest breakdown of client-side encryption, volatile memory, and anti-resurrection tombstones.
- **Interactive FAQ:** Categorized accordion with accessible `<details>` elements and clear, non-jargon responses.

### 4.2 Room Setup & Creation (`src/app/app/new/page.tsx`)
- Two-tier access mode selection:
  1. **WITH PASS (Two-Factor Separation):** Diceware passphrase generation, out-of-band delivery.
  2. **WITHOUT PASS (Link Access):** High-entropy CSPRNG secret encoded in URL hash fragment (`/r/[roomId]#k=[secret]`).
- Instant invitation formatting with formatted invite card and native `navigator.share()` integration.

### 4.3 Real-Time Messaging Chamber (`src/features/room/`)
- **`RoomHeader`:**
  - Minimalist brand emblem link returning home.
  - Room identifier with Host badge for creator.
  - Pulsing live presence indicator (`N present`).
  - Contact Safety Number button with dynamic verification state (Emerald for Verified, Amber for Unverified).
  - WebRTC Voice & Video call launch triggers with disabled states during alone-in-room modes.
  - Ephemeral timer badge (`30s`, `5m`, `1h`, `24h`) when disappearing messages are active.
  - Overflow menu for chamber details, invite copying, and authoritative destruction.
- **`MessageList` & `MessageBubble`:**
  - Centered editorial introduction card on empty chamber with cryptographic parameters.
  - In-memory decrypted media previews (photos and videos) with responsive aspect ratios.
  - View-Once lock card (`👁️ View Once (Tap to unlock)`) triggering atomic backend deletion on view.
  - Flame countdown indicators (`🔥 45s`) for active disappearing messages.
  - Floating scroll-to-bottom pill with unread indicator.
- **`ChatInputBar`:**
  - Auto-expanding textarea with single-line default expanding up to 120px.
  - Attachment button triggering local file picker with MIME and size verification.
  - Ephemeral timer toggle button opening the Disappearing Messages modal.
  - High-contrast send button (active only when input contains non-whitespace text).

### 4.4 Modals & Drawer Overlays (`src/components/app/` & `src/components/call/`)
- **`SafetyNumberModal`:** 12 blocks of 5 digits (60 digits total) derived from sorted public identity keys, QR code display, mismatch warning banner, and toggleable verified state.
- **`ActiveCallModal` & `MinimizedCallBar`:** Floating and docked WebRTC call HUD with live audio waveforms, mute, video toggle, screen sharing, and hangup controls.
- **`MediaLightboxModal`:** Full-screen ephemeral media inspector with immediate blob URL revocation on close.

---

## 5. Mobile & Responsive Engineering Invariants

1. **Dynamic Viewport Heights:** Uses `100dvh` to eliminate mobile browser navigation bar jumps on iOS Safari and Android Chrome.
2. **Keyboard Handling:** Input fields feature `font-size: 16px !important` on viewports $<640\,\text{px}$ to defeat iOS Safari automatic page zooming.
3. **Touch Targets:** All interactive buttons and touch surfaces maintain a minimum target area of $44\times 44\,\text{px}$.
4. **Safe-Area Insets:** Headers and footers incorporate `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to support notched displays and edge-to-edge gestures.
5. **Reduced Motion:** Fully honors `@media (prefers-reduced-motion: reduce)` by bypassing all non-essential CSS animations.

# CLAUDE.md — Maa Project Guide

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Commands](#4-commands)
5. [Architecture Decisions](#5-architecture-decisions)
6. [Design System](#6-design-system)
7. [Data Layer](#7-data-layer)
8. [Firebase Configuration](#8-firebase-configuration)
9. [Navigation & Routing](#9-navigation--routing)
10. [Voice Pipeline](#10-voice-pipeline)
11. [Hard Rules](#11-hard-rules)
12. [Build Status](#12-build-status)
13. [Environment Setup](#13-environment-setup)
14. [Key Files Reference](#14-key-files-reference)

---

## 1. Project Overview

**Maa** ("Mother" in Hindi) is a voice-first, screenless mobile health companion for women aged 13+. It tracks periods, ovulation, pregnancy, and mental health through natural voice conversation. The UI is a voice orb — the screen exists only to confirm, not to navigate.

- **Target market**: India first (98% Android), then Africa, then Southeast Asia
- **Target devices**: Low-end Android (2GB RAM, Snapdragon 400-series, intermittent 3G)
- **Bundle size target**: Under 30MB
- **Full spec**: See `Main` file in project root

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo (React Native) | SDK 55 |
| Navigation | Expo Router (file-based) | ^55.0.4 |
| Language | TypeScript | ~5.9.2 |
| Backend | Firebase (Firestore, Auth, Cloud Functions, FCM) | JS SDK ^12.10.0 |
| Local DB | SQLite via expo-sqlite | ^55.0.10 |
| Fast KV Store | MMKV (react-native-mmkv v4) | ^4.2.0 |
| Animations | react-native-reanimated | ^4.2.2 |
| Gestures | react-native-gesture-handler | ^2.30.0 |
| Audio | expo-av | ^16.0.8 |
| AI/Voice | Sarvam AI (Indian langs) + Google Cloud STT/TTS + Gemini | via Cloud Functions |
| Auth | Firebase Phone OTP only | firebase/auth |
| Auth Persistence | AsyncStorage | ^3.0.1 |
| Fonts | Playfair Display + DM Sans | via expo-font |

---

## 3. Project Structure

```
Maa/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root: fonts, auth gate, providers
│   ├── (auth)/                 # Onboarding (unauthenticated)
│   │   ├── _layout.tsx         # Stack navigator
│   │   ├── language-detect.tsx # Language picker
│   │   ├── phone-otp.tsx       # Phone OTP verification
│   │   └── face-id-setup.tsx   # Optional biometric lock
│   └── (app)/                  # Main app (authenticated)
│       ├── _layout.tsx         # Stack navigator (NO tab bar)
│       ├── index.tsx           # Voice Home — THE orb
│       ├── score.tsx           # Maa Score (4 pillars)
│       └── settings.tsx        # Settings
├── components/                 # Shared components
│   ├── ui/                     # Design system primitives
│   ├── voice/                  # VoiceOrb, WaveformBars, AudioPlayer
│   └── cards/                  # Ephemeral card types
├── constants/
│   ├── colors.ts               # Dark theme color palette
│   ├── typography.ts           # Font families + text styles
│   └── languages.ts            # 10 supported languages + state mapping
├── contexts/
│   ├── AuthContext.tsx          # Firebase Auth state + useAuth()
│   ├── LanguageContext.tsx      # Language selection + useLanguage()
│   └── DatabaseContext.tsx      # SQLite init + useDatabase()
├── lib/
│   ├── db/
│   │   └── schema.ts           # 9 SQLite tables + indexes + migrations
│   ├── ai/                     # STT, TTS, Gemini pipeline (TODO)
│   ├── sync/                   # SQLite -> Firestore sync (TODO)
│   ├── engagement/             # Score, streaks, goals (TODO)
│   └── utils/
│       └── storage.ts          # MMKV encrypted wrapper
├── hooks/                      # Custom hooks (TODO)
├── icons/                      # SVG icon components (TODO)
├── src/config/
│   └── firebase.ts             # Firebase app + auth + firestore init
├── assets/
│   └── fonts/                  # Playfair Display + DM Sans (placeholders)
├── Main                        # Full build specification (1145 lines)
├── MockScreens                 # UI reference mockups
├── google-services.json        # Firebase Android config (gitignored)
├── .env                        # API keys (gitignored)
└── .env.example                # Template for env vars
```

---

## 4. Commands

```bash
npm start              # Start Expo dev server
npm run android        # Start on Android device/emulator
npm run ios            # Start on iOS simulator
npm run web            # Start web (secondary target)
npx tsc --noEmit       # Type check (should be zero errors)
npx expo install X     # Install Expo-compatible package version
```

**Install new packages**: Use `npm install --legacy-peer-deps` if peer dep conflicts arise (MMKV v4 causes some).

---

## 5. Architecture Decisions

### Offline-First
- **SQLite is the source of truth** for all user health data
- One-way sync: SQLite -> Firestore (anonymized summaries only)
- App must work fully offline for viewing data, basic predictions, reviewing history
- Voice AI requires internet

### State Management
- **React Context** for global state (auth, language, theme, database)
- **SQLite queries** for health data
- **MMKV** for instant-access settings and cached values
- No Redux, no Zustand — Context + local state + SQLite covers everything

### API Security
- ALL AI API calls go through Firebase Cloud Functions — never expose keys in client
- `EXPO_PUBLIC_` prefixed vars are client-safe Firebase config only
- Sarvam AI, Gemini, Google Cloud keys stay server-side in Cloud Functions

### MMKV v4 API
```typescript
// v4 uses createMMKV() not new MMKV()
import { createMMKV } from 'react-native-mmkv';
const mmkv = createMMKV({ id: 'maa-storage', encryptionKey: '...' });
```

### Firebase Auth Persistence
```typescript
// React Native requires AsyncStorage persistence
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
```

---

## 6. Design System

### Theme: Dark Only (v1)
```
Background:   #0D0A0E
Gold accent:  #DAA520 (primary), #B8860B (dark), #F0D060 (light)
Text:         #FFFFFF (primary), rgba(255,255,255,0.65) (secondary)
```

### Domain Colors
```
Period:     #C4556E
Ovulation:  #DAA520
Mood:       #7B68EE
Sleep:      #6BA3D6
Energy:     #3CB371
```

### Typography
- **Display/Headers**: Playfair Display (serif) — 700 weight for headers
- **Body/UI**: DM Sans (sans-serif) — 400-600 weights
- Hero: 31pt, Section: 23pt, Card title: 16pt, Body: 15pt, Caption: 12pt, Label: 11pt uppercase

### Layout Rules
- Screen padding: 24px horizontal
- Card border radius: 16px
- Button border radius: 14px
- Min touch target: 44px
- No emojis anywhere — SVG icons only

---

## 7. Data Layer

### SQLite Tables (9 total)
| Table | Purpose |
|-------|---------|
| `user_profile` | Language, cycle length avg (local only) |
| `cycles` | Period start/end dates, flow intensity |
| `daily_logs` | Mood, energy, sleep, pain, symptoms, medications (one row/day) |
| `conversations` | Voice transcripts + AI extracted data |
| `score_snapshots` | Maa Score history (4 pillars) |
| `weekly_goals` | 3 goals per week, progress tracking |
| `milestones` | 5 milestone types (cycle_1 through pregnancy) |
| `pregnancy` | Trimester tracking when active |
| `streaks` | Current + best streak, pause-not-reset logic |

### MMKV Keys
Defined in `lib/utils/storage.ts` → `StorageKeys` object. Used for: language, biometric toggle, onboarding state, voice settings, notifications, offline mode, cached score, FCM token.

### Firestore Structure
```
users/{uid}/profile          # language, trial, subscription, FCM token
users/{uid}/score            # 4 pillars + total
users/{uid}/weekly_summaries # Audio URL + insights
users/{uid}/milestones       # Unlock state
users/{uid}/anonymized_data  # Cycle summaries, mood averages (no PII)
```

---

## 8. Firebase Configuration

- **Project ID**: `maahealth-d19cf`
- **Region**: `asia-south1` (Mumbai)
- **Android package**: `com.Maahealth.Maa`
- **Web App ID**: `1:870246787049:web:27eb4046aea21b2b2c8d78`
- **Auth method**: Phone OTP only (no email, no social)
- **Firestore**: Used (NOT Realtime Database)
- **Analytics**: Disabled (privacy-first, no tracking)

Firebase is initialized via the **web/JS SDK** (not native SDK), because Expo's JavaScript runtime uses the web config. The `google-services.json` is for EAS native builds only.

---

## 9. Navigation & Routing

### Flow
```
App Launch
  -> _layout.tsx (load fonts, init providers)
    -> AuthContext checks Firebase auth state
      -> Not authenticated: /(auth)/language-detect -> phone-otp -> face-id-setup
      -> Authenticated + onboarded: /(app)/index (Voice Home)
```

### Critical Rule: NO TAB BAR
The voice orb IS the app. Other screens (score, settings, summary, milestones) are accessed via:
- Swipe up gesture / hidden drawer
- Settings gear icon (top right)
- Voice command ("show my score", "settings dikhaao")

---

## 10. Voice Pipeline

```
User taps orb -> Mic activates -> STT streams
  -> Sarvam AI (Indian languages) OR Google Cloud STT (others)
    -> Text sent to Gemini via Cloud Function
      -> Response: spoken_response + extracted_data + visual_card
        -> TTS plays response
          -> Sarvam AI (Indian) OR Google Cloud TTS (others)
            -> Optional ephemeral card slides up
```

- **Latency target**: Under 2 seconds end-to-end
- **Silence detection**: 1.5 seconds of silence -> auto-stop recording
- **Audio format**: 16-bit PCM, 16kHz mono
- **Gemini returns**: JSON with `spoken_response`, `extracted_data`, `visual_card`, `proactive_reminder`

---

## 11. Hard Rules

1. **NO EMOJIS** — anywhere. Not in AI responses, UI, notifications, or code comments that render to users
2. **NO TAB BAR** — the voice orb is home
3. **VOICE FIRST** — every feature accessible by voice command
4. **OFFLINE FIRST** — SQLite is source of truth, app works without internet
5. **LANGUAGE FIRST** — all user-facing text must be localizable, never hardcode English-only
6. **PRIVACY FIRST** — no analytics, no tracking, no ad IDs, data stays on device
7. **DARK THEME ONLY** — for v1
8. **INDIA FIRST** — +91 default, IST timezone logic, Indian language priority
9. **NO DIAGNOSIS** — Maa tracks and correlates, never diagnoses or prescribes
10. **AGE SENSITIVE** — no age collection, but AI adapts tone from conversational signals
11. **API KEYS NEVER IN CLIENT** — all AI calls through Cloud Functions
12. **PERFORMANCE** — target 2GB RAM devices, lazy load everything

---

## 12. Build Status

### Phase 1: Foundation -- COMPLETE
- [x] Expo project + all dependencies
- [x] Design system (colors, typography, languages)
- [x] Expo Router navigation (auth + app groups)
- [x] SQLite schema (9 tables + indexes)
- [x] MMKV encrypted storage
- [x] Firebase JS SDK (web config, auth persistence)
- [x] Auth/Language/Database contexts
- [x] Onboarding screens (language, OTP, biometric)
- [x] Main screens (voice home, settings, score)
- [x] Zero TypeScript errors

### Phase 2: Onboarding -- TODO
- [ ] Wire Firebase Phone OTP (`signInWithPhoneNumber`)
- [ ] Location-based language auto-detection
- [ ] Biometric enrollment via expo-local-authentication
- [ ] Auth state persistence across app restarts

### Phase 3: Voice Core -- TODO (MOST CRITICAL)
- [ ] Voice Orb animations (idle, listening, thinking, speaking)
- [ ] Audio recording with expo-av
- [ ] Cloud Functions: STT, Gemini, TTS pipeline
- [ ] Silence detection
- [ ] Structured data extraction -> SQLite

### Phase 4-7: See `Main` spec file

---

## 13. Environment Setup

Copy `.env.example` to `.env` and fill in:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyAc6rXvLQZDNgI2l2UGYj3-Gio568f22S0
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=maahealth-d19cf.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=maahealth-d19cf
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=maahealth-d19cf.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=870246787049
EXPO_PUBLIC_FIREBASE_APP_ID=1:870246787049:web:27eb4046aea21b2b2c8d78
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-MR55MSFSXM

# Server-side only (Cloud Functions, not client)
SARVAM_API_KEY=<your-key>
GOOGLE_CLOUD_API_KEY=<your-key>
GEMINI_API_KEY=<your-key>
```

**Font files needed**: Download from Google Fonts and place in `assets/fonts/`:
- PlayfairDisplay: Regular, Light, SemiBold, Bold
- DMSans: Light, Regular, Medium, SemiBold, Bold

---

## 14. Key Files Reference

| File | What it does |
|------|-------------|
| `app/_layout.tsx` | Root layout: fonts, splash, auth gate, all providers |
| `app/(auth)/language-detect.tsx` | Language picker (10 Indian languages) |
| `app/(auth)/phone-otp.tsx` | Phone number + OTP verification |
| `app/(auth)/face-id-setup.tsx` | Optional biometric lock |
| `app/(app)/index.tsx` | Voice Home — the orb (main screen) |
| `app/(app)/settings.tsx` | Settings with account, preferences, privacy |
| `app/(app)/score.tsx` | Maa Score with 4 pillar cards |
| `src/config/firebase.ts` | Firebase init (app, auth with persistence, firestore) |
| `lib/db/schema.ts` | SQLite 9-table schema + indexes + migrations |
| `lib/utils/storage.ts` | MMKV v4 encrypted wrapper + StorageKeys |
| `contexts/AuthContext.tsx` | Firebase auth state + `useAuth()` hook |
| `contexts/LanguageContext.tsx` | Language state + `useLanguage()` hook |
| `contexts/DatabaseContext.tsx` | SQLite init + `useDatabase()` hook |
| `constants/colors.ts` | Full dark theme color palette |
| `constants/typography.ts` | Font families + 7 text style presets |
| `constants/languages.ts` | 10 languages, Sarvam codes, state-to-language map |
| `Main` | Complete build specification (1145 lines) |

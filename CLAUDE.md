# CLAUDE.md — Maa Project Guide (Single Source of Truth)

## Table of Contents

| # | Section | Quick Link |
|---|---------|-----------|
| 1 | [Project Overview](#1-project-overview) | What Maa is, target market |
| 2 | [Tech Stack](#2-tech-stack) | Every dependency with versions |
| 3 | [Project Structure](#3-project-structure) | Full directory tree |
| 4 | [Commands](#4-commands) | Build, run, type-check |
| 5 | [Architecture Decisions](#5-architecture-decisions) | Offline-first, state, API security |
| 6 | [Design System](#6-design-system) | Theme (light + dark), colors, typography |
| 7 | [Data Layer](#7-data-layer) | SQLite tables, MMKV keys, Firestore |
| 8 | [Firebase Configuration](#8-firebase-configuration) | Project IDs, regions, auth |
| 9 | [Navigation & Routing](#9-navigation--routing) | Auth flow, no-tab-bar rule |
| 10 | [Voice Pipeline](#10-voice-pipeline) | STT -> Gemini -> TTS flow |
| 11 | [Hard Rules](#11-hard-rules) | 12 non-negotiable constraints |
| 12 | [Screen Specs](#12-screen-specs) | Every screen with UI details |
| 13 | [Build Status](#13-build-status) | Phase 1 done, Phase 2-7 TODO |
| 14 | [Environment Setup](#14-environment-setup) | .env values, fonts |
| 15 | [Key Files Reference](#15-key-files-reference) | Quick-lookup file table |

---

## 1. Project Overview

**Maa** ("Mother" in Hindi) is a voice-first, screenless mobile health companion for women aged 13+. It tracks periods, ovulation, pregnancy, and mental health through natural voice conversation. The UI is a voice orb -- the screen exists only to confirm, not to navigate.

- **Target market**: India first (98% Android), then Africa, then Southeast Asia
- **Target devices**: Low-end Android (2GB RAM, Snapdragon 400-series, intermittent 3G)
- **Bundle size target**: Under 30MB
- **Full spec (reference only)**: See `Main` file in project root. **This CLAUDE.md overrides Main where they differ.**

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
│   ├── _layout.tsx             # Root: fonts, auth gate, all providers (Theme+DB+Auth+Lang)
│   ├── (auth)/                 # Onboarding (unauthenticated)
│   │   ├── _layout.tsx         # Stack navigator
│   │   ├── language-detect.tsx # Language picker (10 Indian languages)
│   │   ├── phone-otp.tsx       # Phone OTP (4 boxes, 72x80px)
│   │   └── face-id-setup.tsx   # Optional biometric lock
│   └── (app)/                  # Main app (authenticated)
│       ├── _layout.tsx         # Stack navigator (NO tab bar)
│       ├── index.tsx           # Voice Home — THE orb
│       ├── score.tsx           # Maa Score (4 pillars)
│       ├── summary.tsx         # Weekly voice summary
│       ├── milestones.tsx      # Milestones + weekly goals + badges
│       └── settings.tsx        # Settings (theme toggle, biometric, notifications)
├── components/                 # Shared components
│   ├── ui/                     # Design system primitives (TODO)
│   ├── voice/
│   │   └── VoiceOrb.tsx        # Animated orb with 4 states (idle/listening/thinking/speaking)
│   └── cards/
│       └── EphemeralCard.tsx   # Slide-up AI response cards (cycle, mood, confirm, generic)
├── constants/
│   ├── colors.ts               # DarkTheme + LightTheme + shared domain colors
│   ├── typography.ts           # Font families + 7 text style presets
│   └── languages.ts            # 10 languages, Sarvam codes, state-to-language map
├── contexts/
│   ├── AuthContext.tsx          # Firebase Auth state + useAuth()
│   ├── LanguageContext.tsx      # Language selection + useLanguage()
│   ├── DatabaseContext.tsx      # SQLite init + useDatabase()
│   └── ThemeContext.tsx         # Light/dark mode + useTheme() + toggle
├── hooks/
│   ├── useVoiceSession.ts      # React hook: voice state + pipeline + data persistence
│   └── useWeeklySummary.ts     # React hook: fetch summary + audio playback
├── lib/
│   ├── db/schema.ts            # 9 SQLite tables + indexes + migrations
│   ├── ai/
│   │   ├── types.ts            # VoiceState, GeminiResponse, ExtractedHealthData, etc.
│   │   ├── audio-recorder.ts   # expo-av recording wrapper (16kHz mono)
│   │   ├── tts-player.ts       # TTS audio playback from base64
│   │   ├── cloud-api.ts        # Firebase Cloud Functions client (STT, Gemini, TTS)
│   │   ├── voice-session.ts    # Core pipeline: record -> STT -> Gemini -> TTS -> play
│   │   ├── conversation-store.ts # Persist turns to SQLite + extract health data
│   │   └── error-recovery.ts   # Offline detection, error categorization, retry logic
│   ├── auth/
│   │   ├── phone-auth.ts       # Firebase Phone OTP (sendOtp, verifyOtp)
│   │   ├── location-language.ts # Auto-detect language from GPS -> Indian state
│   │   └── biometric.ts        # expo-local-authentication wrapper
│   ├── sync/
│   │   └── sync-engine.ts      # One-way SQLite -> Firestore (anonymized summaries)
│   ├── engagement/
│   │   ├── score.ts            # Maa Score local calculation (4 pillars, 0-100)
│   │   ├── streaks.ts          # Weekly streak tracking (pause-not-reset logic)
│   │   ├── goals.ts            # Weekly goals (3/week, Cloud Function + offline fallback)
│   │   └── milestones.ts       # 5 milestones + progress + auto-unlock
│   ├── notifications/
│   │   └── fcm-client.ts       # FCM client: register token, notification routing
│   ├── data/
│   │   └── export.ts           # Data export (JSON) + deletion (SQLite + MMKV + Firestore)
│   └── utils/storage.ts        # MMKV v4 encrypted wrapper + StorageKeys
├── functions/                   # Firebase Cloud Functions (server-side AI)
│   ├── src/
│   │   ├── index.ts            # Function exports (10 functions)
│   │   ├── stt.ts              # STT: Sarvam AI (Indian) / Google Cloud (others)
│   │   ├── tts.ts              # TTS: Sarvam AI (Indian) / Google Cloud (others)
│   │   ├── gemini.ts           # Gemini: system prompt + structured JSON responses
│   │   ├── weekly-summary.ts   # Weekly summary: Gemini -> TTS -> Storage (on-demand + scheduled Sat 9PM)
│   │   ├── notifications.ts    # Push: Sunday summary + daily proactive (period, streak)
│   │   ├── score.ts            # Authoritative score calculation
│   │   └── goals.ts            # Weekly goals generation
│   ├── package.json
│   └── tsconfig.json
├── icons/                      # SVG icon components (TODO)
├── src/config/firebase.ts      # Firebase app + auth + firestore init
├── assets/fonts/               # Playfair Display + DM Sans (placeholders)
├── Main                        # Build specification (reference, CLAUDE.md overrides)
└── MockScreens                 # UI reference mockups
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
- No Redux, no Zustand -- Context + local state + SQLite covers everything

### API Security
- ALL AI API calls go through Firebase Cloud Functions -- never expose keys in client
- `EXPO_PUBLIC_` prefixed vars are client-safe Firebase config only
- Sarvam AI, Gemini, Google Cloud keys stay server-side in Cloud Functions

### MMKV v4 API
```typescript
// v4 uses createMMKV() not new MMKV()
import { createMMKV } from 'react-native-mmkv';
const mmkv = createMMKV({ id: 'maa-storage', encryptionKey: '...' });
```

### Internationalization (i18n)
```typescript
// All user-facing strings live in constants/strings.ts
import { useTranslation } from '../hooks/useTranslation';
const { t, speak, speakKey } = useTranslation();

// t('auth.enterPhone') -> returns translated string in user's language
// speak('any text') -> plays TTS audio via Cloud Function
// speakKey('auth.enterPhone') -> translates then speaks
// Fallback chain: user lang -> Hindi -> English -> key itself
```
- Flat dot-notation keys: `'auth.enterPhone'`, `'voice.tapToSpeak'`
- Supports `{param}` template substitution: `t('auth.codeSentTo', { phone: '+91 9876543210' })`
- TTS "speak" reuses existing Cloud Function pipeline (Sarvam AI for Indian langs, Google Cloud for others)
- Designed for illiterate users who can speak but not read/write

### Firebase Auth Persistence
```typescript
// React Native requires AsyncStorage persistence
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
```

### Theme Architecture
```typescript
// ThemeContext wraps entire app, provides colors + toggle
import { useTheme } from '../contexts/ThemeContext';
const { colors, mode, toggle } = useTheme();
// colors.bgPrimary, colors.textPrimary, etc. — adapts to current theme
// mode: 'dark' | 'light'
// toggle(): switches theme and persists to MMKV
```

---

## 6. Design System

### Theme: Light + Dark (user toggleable in Settings)
Default is dark. User can toggle in Settings > Preferences.

**Dark Theme:**
```
Background:   #0D0A0E
Cards:        rgba(255,255,255,0.04)
Text:         #FFFFFF (primary), rgba(255,255,255,0.65) (secondary)
Borders:      rgba(255,255,255,0.06)
```

**Light Theme:**
```
Background:   #FAFAF8
Cards:        rgba(0,0,0,0.03)
Text:         #1A1A1A (primary), rgba(0,0,0,0.6) (secondary)
Borders:      rgba(0,0,0,0.08)
```

**Shared (both themes):**
```
Gold accent:  #DAA520 (primary), #B8860B (dark), #F0D060 (light)
```

### Domain Colors (health pillars)
```
Period:     #C4556E
Ovulation:  #DAA520
Mood:       #7B68EE
Sleep:      #6BA3D6
Energy:     #3CB371
```

### Typography
- **Display/Headers**: Playfair Display (serif) -- 700 weight for headers
- **Body/UI**: DM Sans (sans-serif) -- 400-600 weights
- Hero: 31pt, Section: 23pt, Card title: 16pt, Body: 15pt, Caption: 12pt, Label: 11pt uppercase

### Layout Rules
- Screen padding: 24px horizontal
- Card border radius: 16px
- Button border radius: 14px
- OTP boxes: 72x80px, borderRadius 20px
- Min touch target: 44px
- No emojis anywhere -- SVG icons only

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

### MMKV Keys (StorageKeys in `lib/utils/storage.ts`)
`LANGUAGE_CODE`, `BIOMETRIC_ENABLED`, `ONBOARDING_COMPLETE`, `VOICE_SPEED`, `VOICE_GENDER`, `NOTIFICATIONS_ENABLED`, `OFFLINE_MODE`, `CACHED_SCORE`, `LAST_SYNC_AT`, `FCM_TOKEN`, `COUNTRY_CODE`, `THEME_MODE`

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
  -> _layout.tsx (load fonts, init providers: Theme > DB > Auth > Language)
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
- **Voice first but option to type**: User can type if preferred

---

## 11. Hard Rules

1. **NO EMOJIS** -- anywhere. Not in AI responses, UI, notifications, or code
2. **NO TAB BAR** -- the voice orb is home
3. **VOICE FIRST** -- every feature accessible by voice command
4. **OFFLINE FIRST** -- SQLite is source of truth, app works without internet
5. **LANGUAGE FIRST** -- all user-facing text must be localizable
6. **PRIVACY FIRST** -- no analytics, no tracking, no ad IDs
7. **THEME TOGGLEABLE** -- user switches between light and dark in Settings (default: dark)
8. **INDIA FIRST** -- +91 default, IST timezone logic, Indian language priority
9. **NO DIAGNOSIS** -- Maa tracks and correlates, never diagnoses or prescribes
10. **AGE SENSITIVE** -- no age collection, AI adapts tone from conversational signals
11. **API KEYS NEVER IN CLIENT** -- all AI calls through Cloud Functions
12. **PERFORMANCE** -- target 2GB RAM devices, lazy load everything

---

## 12. Screen Specs

### 12.1 Language Detect (Onboarding 1)
- Auto-detect from location (expo-location) -> map Indian state to language
- If permission denied: show full language picker grid
- 10 languages: 2-column grid, script character + native name + English name
- Gold border on selected card
- "Continue" button (gold, disabled until selection)

### 12.2 Phone OTP (Onboarding 2)
- Country code auto-detected (+91 default)
- Phone input: large, clear, 10-digit
- **4 OTP boxes** (not 6): 72x80px, borderRadius 20, gold border on focused
- Auto-advance on input, auto-verify when all filled
- 30-second countdown timer, "Resend code" when expired
- "Edit" link to go back to phone number

### 12.3 Face ID / Biometric (Onboarding 3)
- Optional app-level lock (not auth)
- "Protect your privacy" headline
- Two trust badges: "End-to-end encrypted" + "Biometric lock"
- "Enable Biometric Lock" (gold CTA) + "Maybe later" (skip)
- Stores `biometricEnabled` in MMKV, gates app on foreground resume

### 12.4 Voice Home (THE App)
- Top bar: Maa logo + "Maa" text + settings gear (top right)
- Center: The Orb (140px, gold gradient, 3 concentric rings)
  - Idle: subtle scale oscillation (1.0 -> 1.04)
  - Listening: scale to 1.12, waveform bars, brighter rings
  - Thinking: pulsing glow
  - Speaking: gentler waveform, TTS playing
- Below orb: state label ("Tap to speak" / "Listening..." etc.)
- Bottom: suggested prompts (fade when listening) + "Private & encrypted" badge

### 12.5 Score Screen
- Animated ring chart (0-100, gold gradient stroke)
- Score centered in ring with count-up animation
- 4 pillar cards:
  - Cycle Intelligence (0-25, #C4556E)
  - Mood Map (0-25, #7B68EE)
  - Body Awareness (0-25, #3CB371)
  - Consistency (0-25, #DAA520)
- "Next unlock" teaser at bottom

### 12.6 Weekly Summary
- "WEEKLY SUMMARY" badge + date range
- Audio player card: play/pause (52px gold circle) + waveform + progress bar
- 3-5 insight cards with domain-colored icons
- Generated Saturday night via Cloud Function -> TTS -> push notification Sunday 7PM

### 12.7 Milestones & Goals
- Two tabs: "This Week" + "Milestones"
- This Week: streak banner + 3 weekly goals (generated Monday by Cloud Function)
- Milestones timeline: cycle_1, cycle_3, cycle_6, cycle_12, pregnancy
- Badges section: 5 badges (greyed until earned)

### 12.8 Settings
- **Account**: Language (picker), Biometric Lock (toggle), Notifications (toggle)
- **Preferences**: Voice & Speed, Theme toggle (dark/light -- WORKING), Health Profile
- **Data & Privacy**: Offline Mode (toggle), Export My Data, Delete My Data, Privacy Policy
- **Subscription**: Current Plan (Free Trial), Manage Subscription (stubbed)
- **App Info**: Version + "Made with care in India"

---

## 13. Build Status

### Phase 1: Foundation -- COMPLETE
- [x] Expo project + all dependencies
- [x] Design system (colors with light + dark themes, typography, languages)
- [x] Expo Router navigation (auth + app groups)
- [x] SQLite schema (9 tables + indexes)
- [x] MMKV encrypted storage
- [x] Firebase JS SDK (web config, auth persistence)
- [x] Auth/Language/Database/Theme contexts
- [x] Onboarding screens (language, OTP with 4 boxes, biometric)
- [x] Main screens (voice home, settings with theme toggle, score, summary, milestones)
- [x] Zero TypeScript errors
- [x] app.json with all plugins (router, font, localization, sqlite, local-auth, av, location)

### Phase 2: Onboarding -- COMPLETE
- [x] Wire Firebase Phone OTP (`signInWithPhoneNumber`) via `lib/auth/phone-auth.ts`
- [x] Location-based language auto-detection via `lib/auth/location-language.ts`
- [x] Biometric enrollment via `lib/auth/biometric.ts` (expo-local-authentication)
- [x] Auth state persistence across app restarts (AsyncStorage persistence in firebase.ts)
- [x] All onboarding screens wired to real services

### Phase 3: Voice Core -- COMPLETE (structure + wiring, needs API keys to test)
- [x] Voice Orb animations with react-native-reanimated (idle, listening, thinking, speaking)
- [x] Audio recording with expo-av (16kHz mono) via `lib/ai/audio-recorder.ts`
- [x] Cloud Functions: STT integration (Sarvam + Google) via `functions/src/stt.ts`
- [x] Cloud Functions: Gemini integration with system prompt via `functions/src/gemini.ts`
- [x] Cloud Functions: TTS integration (Sarvam + Google) via `functions/src/tts.ts`
- [x] Full pipeline: tap orb -> speak -> get response -> hear response (`voice-session.ts`)
- [x] Silence detection (1.5s threshold) in `voice-session.ts`
- [x] Structured data extraction from Gemini -> save to SQLite (`conversation-store.ts`)
- [x] Text input fallback (processText method)
- [x] Conversation history context (last 10 turns)
- [x] useVoiceSession hook wired to Voice Home screen

### Phase 4: Ephemeral Cards -- COMPLETE (structure)
- [x] EphemeralCard base component (slide up, dismiss, blur background)
- [x] Cycle prediction card
- [x] Mood insight card
- [x] Confirmation card
- [x] Generic insight card
- [x] Card triggering from Gemini visual_card responses (via useVoiceSession)
- [ ] TODO: Add more card types as Gemini responses evolve

### Phase 5: Engagement -- COMPLETE (local calculation, Cloud Functions ready)
- [x] Maa Score local calculation (4 pillars, 0-100) via `lib/engagement/score.ts`
- [x] Score Cloud Function via `functions/src/score.ts`
- [x] Weekly goals generation (Cloud Function + offline fallback) via `lib/engagement/goals.ts`
- [x] Goals Cloud Function via `functions/src/goals.ts`
- [x] Milestone tracking + auto-unlock via `lib/engagement/milestones.ts`
- [x] Streak tracking (pause-not-reset logic) via `lib/engagement/streaks.ts`
- [ ] TODO: Wire score screen to use `calculateLocalScore()`
- [ ] TODO: Wire milestones screen to use real data
- [ ] TODO: Badge system (visual unlock animations)

### Phase 6: Proactive Engine -- COMPLETE
- [x] Weekly summary Cloud Function: Gemini text + TTS audio + Storage upload (`functions/src/weekly-summary.ts`)
- [x] Scheduled summary generation: Saturday 9PM IST via `scheduledWeeklySummary`
- [x] Weekly summary screen: Firestore fetch + audio player + insight cards (`app/(app)/summary.tsx`)
- [x] useWeeklySummary hook: fetch, play/pause, progress tracking (`hooks/useWeeklySummary.ts`)
- [x] Sync engine (SQLite -> Firestore anonymized) via `lib/sync/sync-engine.ts`
- [x] FCM client: token registration, notification routing, Android channel (`lib/notifications/fcm-client.ts`)
- [x] Sunday 7PM IST summary notification (`functions/src/notifications.ts`)
- [x] Daily proactive notifications: period prediction, streak reminders (`functions/src/notifications.ts`)
- [x] Multi-language notification text (10 Indian languages for summary, Hindi fallback for others)
- [x] expo-notifications plugin added to app.json

### Phase 7: Settings & Polish -- COMPLETE
- [x] Settings screen fully wired: language picker modal, voice speed selector, sign out, data actions
- [x] Data export (JSON file via expo-sharing) + deletion (SQLite + MMKV + Firestore) via `lib/data/export.ts`
- [x] FCM initialization in root `_layout.tsx` (register on auth, notification routing listeners)
- [x] Score screen wired to `calculateLocalScore()` with animated ring + count-up + pillar cards
- [x] Milestones screen wired to real data (goals, milestones, streaks, badges)
- [x] Error recovery utilities (`lib/ai/error-recovery.ts`): offline detection, error categorization, retry with backoff
- [x] Multi-language error messages (English + Hindi)
- [ ] TODO: Subscription UI (stubbed payments)
- [ ] TODO: Performance optimization for low-end Android
- [ ] TODO: Download real font files (Playfair Display + DM Sans)

### Phase 8: Internationalization (i18n) -- COMPLETE
- [x] Centralized string registry (`constants/strings.ts`): 100+ keys with translations in all 10 Indian languages
- [x] `t(key, lang, params?)` function with fallback chain: requested lang -> hi -> en -> key
- [x] `useTranslation()` hook (`hooks/useTranslation.ts`): `t()`, `speak()`, `speakKey()`, `stopSpeaking()`
- [x] TTS "speak" capability: any UI text can be read aloud via Cloud Function TTS (Sarvam AI for Indian langs)
- [x] All auth screens migrated: language-detect, phone-otp, face-id-setup
- [x] All app screens migrated: index (voice home), score, summary, milestones, settings
- [x] EphemeralCard migrated: dismiss, days, expected date
- [x] Error recovery messages now use centralized strings (10 languages instead of 2)
- [x] String categories: common, auth, voice, score, summary, milestones, settings, cards, errors

---

## 14. Environment Setup

Copy `.env.example` to `.env` and fill in all values from your Firebase console and API providers:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=<from-firebase-console>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<project-id>.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
EXPO_PUBLIC_FIREBASE_APP_ID=<app-id>
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=<measurement-id>

# Server-side only (Cloud Functions, not client)
SARVAM_API_KEY=<your-sarvam-key>
GOOGLE_CLOUD_API_KEY=<your-google-cloud-key>
GEMINI_API_KEY=<your-gemini-key>
```

**IMPORTANT**: Never commit actual API keys to the repository. All values come from `.env` which is gitignored.

**Font files needed**: Download from Google Fonts and place in `assets/fonts/`:
- PlayfairDisplay: Regular, Light, SemiBold, Bold
- DMSans: Light, Regular, Medium, SemiBold, Bold

---

## 15. Key Files Reference

| File | What it does |
|------|-------------|
| **Screens** | |
| `app/_layout.tsx` | Root layout: fonts, splash, auth gate, providers (Theme>DB>Auth>Lang) |
| `app/(auth)/language-detect.tsx` | Language picker + auto-detect from location |
| `app/(auth)/phone-otp.tsx` | Phone number + 4-digit OTP via Firebase |
| `app/(auth)/face-id-setup.tsx` | Biometric enrollment via expo-local-authentication |
| `app/(app)/index.tsx` | Voice Home -- VoiceOrb + pipeline + EphemeralCard |
| `app/(app)/settings.tsx` | Settings with theme toggle, biometric, notifications, privacy |
| `app/(app)/score.tsx` | Maa Score with 4 pillar cards |
| `app/(app)/summary.tsx` | Weekly voice summary with audio player |
| `app/(app)/milestones.tsx` | Milestones timeline + weekly goals + badges |
| **Voice Pipeline (the brain)** | |
| `lib/ai/types.ts` | VoiceState, GeminiResponse, ExtractedHealthData, AUDIO_CONFIG |
| `lib/ai/voice-session.ts` | Core pipeline: record -> STT -> Gemini -> TTS -> play |
| `lib/ai/audio-recorder.ts` | expo-av 16kHz mono recording |
| `lib/ai/tts-player.ts` | TTS audio playback from base64 |
| `lib/ai/cloud-api.ts` | Firebase Cloud Functions client (all AI calls) |
| `lib/ai/conversation-store.ts` | Persist turns to SQLite + extract health data to daily_logs |
| `lib/ai/error-recovery.ts` | Offline detection, error categorization, retry with backoff |
| `hooks/useVoiceSession.ts` | React hook: voice state + pipeline + auto-persist |
| `hooks/useWeeklySummary.ts` | React hook: fetch summary + audio playback + progress |
| **Components** | |
| `components/voice/VoiceOrb.tsx` | Animated orb (reanimated): idle/listening/thinking/speaking |
| `components/cards/EphemeralCard.tsx` | Slide-up cards: cycle, mood, confirm, generic |
| **Auth Services** | |
| `lib/auth/phone-auth.ts` | Firebase Phone OTP (sendOtp, verifyOtp) |
| `lib/auth/location-language.ts` | GPS -> reverse geocode -> Indian state -> language |
| `lib/auth/biometric.ts` | expo-local-authentication wrapper |
| **Engagement** | |
| `lib/engagement/score.ts` | Local Maa Score calculation (4 pillars, 0-100) |
| `lib/engagement/streaks.ts` | Weekly streak tracking (pause-not-reset) |
| `lib/engagement/goals.ts` | Weekly goals (3/week) + offline fallback |
| `lib/engagement/milestones.ts` | 5 milestones + auto-unlock from cycle data |
| **Sync** | |
| `lib/sync/sync-engine.ts` | One-way SQLite -> Firestore (anonymized only) |
| **Cloud Functions** | |
| `functions/src/stt.ts` | STT routing: Sarvam AI (Indian) / Google Cloud (others) |
| `functions/src/tts.ts` | TTS routing: Sarvam AI (Indian) / Google Cloud (others) |
| `functions/src/gemini.ts` | Gemini with system prompt -> structured JSON response |
| `functions/src/weekly-summary.ts` | Weekly summary: Gemini -> TTS -> Storage (on-demand + Saturday scheduler) |
| `functions/src/notifications.ts` | Push notifications: Sunday summary + daily proactive (period, streak) |
| `functions/src/score.ts` | Authoritative score calculation |
| `functions/src/goals.ts` | Weekly goals generation (personalized) |
| **Notifications** | |
| `lib/notifications/fcm-client.ts` | FCM client: register token, notification routing, Android channel |
| `lib/data/export.ts` | Data export (JSON + share) + full deletion (SQLite + MMKV + Firestore) |
| **Infrastructure** | |
| `src/config/firebase.ts` | Firebase init (app, auth + AsyncStorage persistence, firestore) |
| `lib/db/schema.ts` | SQLite 9-table schema + indexes + migrations |
| `lib/utils/storage.ts` | MMKV v4 encrypted wrapper + StorageKeys (12 keys) |
| `contexts/AuthContext.tsx` | Firebase auth state + `useAuth()` |
| `contexts/LanguageContext.tsx` | Language state + `useLanguage()` |
| `contexts/DatabaseContext.tsx` | SQLite init + `useDatabase()` |
| `contexts/ThemeContext.tsx` | Light/dark theme + `useTheme()` + `toggle()` |
| `constants/colors.ts` | DarkTheme + LightTheme + shared colors + ThemeColors type |
| `constants/typography.ts` | Font families + 7 text style presets |
| `constants/languages.ts` | 10 languages, Sarvam codes, state-to-language map |
| `constants/strings.ts` | Centralized i18n string registry, `t()` function, 100+ keys x 10 languages |
| `hooks/useTranslation.ts` | React hook: `t()`, `speak()`, `speakKey()`, `stopSpeaking()` |
| `Main` | Build specification (reference only -- CLAUDE.md overrides) |

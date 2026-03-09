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
│   ├── voice/                  # VoiceOrb, WaveformBars, AudioPlayer (TODO)
│   └── cards/                  # Ephemeral card types (TODO)
├── constants/
│   ├── colors.ts               # DarkTheme + LightTheme + shared domain colors
│   ├── typography.ts           # Font families + 7 text style presets
│   └── languages.ts            # 10 languages, Sarvam codes, state-to-language map
├── contexts/
│   ├── AuthContext.tsx          # Firebase Auth state + useAuth()
│   ├── LanguageContext.tsx      # Language selection + useLanguage()
│   ├── DatabaseContext.tsx      # SQLite init + useDatabase()
│   └── ThemeContext.tsx         # Light/dark mode + useTheme() + toggle
├── lib/
│   ├── db/schema.ts            # 9 SQLite tables + indexes + migrations
│   ├── ai/                     # STT, TTS, Gemini pipeline (TODO)
│   ├── sync/                   # SQLite -> Firestore sync (TODO)
│   ├── engagement/             # Score, streaks, goals (TODO)
│   └── utils/storage.ts        # MMKV v4 encrypted wrapper + StorageKeys
├── hooks/                      # Custom hooks (TODO)
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

### Phase 2: Onboarding -- TODO
- [ ] Wire Firebase Phone OTP (`signInWithPhoneNumber`)
- [ ] Location-based language auto-detection (expo-location -> reverse geocode -> state map)
- [ ] Biometric enrollment via expo-local-authentication
- [ ] Auth state persistence across app restarts

### Phase 3: Voice Core -- TODO (MOST CRITICAL)
- [ ] Voice Orb animations with react-native-reanimated (idle, listening, thinking, speaking)
- [ ] Audio recording with expo-av (16kHz mono)
- [ ] Cloud Functions: STT integration (Sarvam + Google)
- [ ] Cloud Functions: Gemini integration with system prompt
- [ ] Cloud Functions: TTS integration (Sarvam + Google)
- [ ] Full pipeline: tap orb -> speak -> get response -> hear response
- [ ] Silence detection (1.5s threshold)
- [ ] Structured data extraction from Gemini -> save to SQLite

### Phase 4: Ephemeral Cards -- TODO
- [ ] EphemeralCard base component (slide up, dismiss, blur background)
- [ ] Cycle prediction card (mini calendar)
- [ ] Mood insight card (bar chart)
- [ ] Proactive insight card
- [ ] Card triggering from Gemini visual_card responses

### Phase 5: Engagement -- TODO
- [ ] Maa Score calculation (Cloud Function + local cache)
- [ ] Score screen with animated ring
- [ ] Weekly goals generation (Cloud Function)
- [ ] Milestones & goals screen
- [ ] Streak tracking
- [ ] Badge system

### Phase 6: Proactive Engine -- TODO
- [ ] Weekly summary generation (Cloud Function + TTS)
- [ ] Weekly summary screen with audio player
- [ ] Push notifications setup (FCM)
- [ ] Proactive notification scheduling
- [ ] Sunday summary notification

### Phase 7: Settings & Polish -- TODO
- [ ] Settings screen (all sections wired)
- [ ] Data sync engine (SQLite -> Firestore anonymized)
- [ ] Data export / deletion
- [ ] Subscription UI (stubbed payments)
- [ ] Edge cases: offline, STT failure, TTS failure, Gemini timeout
- [ ] Performance optimization for low-end Android

---

## 14. Environment Setup

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

## 15. Key Files Reference

| File | What it does |
|------|-------------|
| `app/_layout.tsx` | Root layout: fonts, splash, auth gate, providers (Theme>DB>Auth>Lang) |
| `app/(auth)/language-detect.tsx` | Language picker (10 Indian languages) |
| `app/(auth)/phone-otp.tsx` | Phone number + 4-digit OTP verification |
| `app/(auth)/face-id-setup.tsx` | Optional biometric lock |
| `app/(app)/index.tsx` | Voice Home -- the orb (main screen) |
| `app/(app)/settings.tsx` | Settings with theme toggle, biometric, notifications, privacy |
| `app/(app)/score.tsx` | Maa Score with 4 pillar cards |
| `app/(app)/summary.tsx` | Weekly voice summary with audio player |
| `app/(app)/milestones.tsx` | Milestones timeline + weekly goals + badges |
| `src/config/firebase.ts` | Firebase init (app, auth with AsyncStorage persistence, firestore) |
| `lib/db/schema.ts` | SQLite 9-table schema + indexes + migrations |
| `lib/utils/storage.ts` | MMKV v4 encrypted wrapper + StorageKeys (12 keys) |
| `contexts/AuthContext.tsx` | Firebase auth state + `useAuth()` |
| `contexts/LanguageContext.tsx` | Language state + `useLanguage()` |
| `contexts/DatabaseContext.tsx` | SQLite init + `useDatabase()` |
| `contexts/ThemeContext.tsx` | Light/dark theme + `useTheme()` + `toggle()` |
| `constants/colors.ts` | DarkTheme + LightTheme + shared colors + ThemeColors type |
| `constants/typography.ts` | Font families + 7 text style presets |
| `constants/languages.ts` | 10 languages, Sarvam codes, state-to-language map |
| `Main` | Build specification (reference only -- CLAUDE.md overrides) |

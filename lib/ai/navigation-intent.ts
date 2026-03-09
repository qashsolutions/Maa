/**
 * Client-side navigation intent detection from user text.
 * Matches English + Hindi patterns to navigate to app screens.
 * Acts as a fallback — Gemini also detects navigation_intent server-side.
 */
import type { NavigationTarget } from './types';

interface IntentPattern {
  target: NavigationTarget;
  patterns: RegExp[];
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    target: 'score',
    patterns: [
      /\b(show\s*(my\s*)?score|my\s*score|maa\s*score|open\s*score)\b/i,
      /\b(score\s*dikha(o|ao)?|mera\s*score|score\s*bata(o|ao)?)\b/i,
    ],
  },
  {
    target: 'settings',
    patterns: [
      /\b(settings|open\s*settings|go\s*to\s*settings|preferences)\b/i,
      /\b(settings\s*dikha(o|ao)?|settings\s*khol(o|ao)?)\b/i,
    ],
  },
  {
    target: 'summary',
    patterns: [
      /\b(summary|weekly\s*summary|show\s*(my\s*)?summary|week\s*summary)\b/i,
      /\b(hafta\s*ka\s*summary|saaptahik\s*summary|summary\s*dikha(o|ao)?|summary\s*sunao|suno\s*summary)\b/i,
    ],
  },
  {
    target: 'milestones',
    patterns: [
      /\b(milestones?|badges?|goals?|my\s*goals|show\s*(my\s*)?(milestones?|badges?|goals?))\b/i,
      /\b(milestones?\s*dikha(o|ao)?|badge\s*dikha(o|ao)?|goals?\s*dikha(o|ao)?|lakshya)\b/i,
    ],
  },
];

/**
 * Detect navigation intent from user text.
 * Returns the target screen name or null if no navigation intent is found.
 */
export function detectNavigationIntent(text: string): NavigationTarget {
  const trimmed = text.trim();
  if (!trimmed) return null;

  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(trimmed)) {
        return intent.target;
      }
    }
  }

  return null;
}

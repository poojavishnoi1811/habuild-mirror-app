// Tone metadata. Pure data — no React, no business logic.
// Source: PROJECT_BRIEF.md §audience-segments + the original POC artifact.
// Components import TONES + render the icon for `iconKey` themselves.

export type ToneId = 'roast' | 'mirror' | 'maa';

export type IconKey = 'flame' | 'sparkles' | 'heart';

export type Tone = {
  id: ToneId;
  iconKey: IconKey;
  label: string;
  sub: string;
  age: string;

  // Colors (hex). bg is the page background, accent drives CTAs/highlights,
  // accentSoft is for subtle uses, cardBg is the share-card background.
  bg: string;
  accent: string;
  accentSoft: string;
  cardBg: string;

  // Copy
  placeholder: string;
  loadingMessages: readonly string[];
  ctaLabel: string;
};

export const TONES: Record<ToneId, Tone> = {
  roast: {
    id: 'roast',
    iconKey: 'flame',
    label: 'Roast me',
    sub: 'No mercy. Pure savage.',
    age: '18–28',
    bg: '#1A0A06',
    accent: '#FF4D2E',
    accentSoft: '#FF8B6B',
    cardBg: '#FF4D2E',
    placeholder:
      'i wake up at 11. scroll instagram for an hour. eat maggi at 2pm. sit at my laptop till 1am. my back hurts. why...',
    loadingMessages: ['Lighting the fire', 'Sharpening knives', 'Loading zero filter'],
    ctaLabel: 'Roast me',
  },
  mirror: {
    id: 'mirror',
    iconKey: 'sparkles',
    label: 'Mirror me',
    sub: 'Honest reflection. No fluff.',
    age: '28–45',
    bg: '#0E0A1F',
    accent: '#7C5CFF',
    accentSoft: '#B8A4FF',
    cardBg: '#7C5CFF',
    placeholder:
      'wake up at 7, three coffees before lunch, back-to-back meetings, eat dinner at 10, scroll till midnight. tired all the time...',
    loadingMessages: ['Reading between the lines', 'Holding up the mirror', 'Finding the pattern'],
    ctaLabel: 'Mirror me',
  },
  maa: {
    id: 'maa',
    iconKey: 'heart',
    label: 'Maa ki Salaah',
    sub: 'Maa is watching. Maa knows.',
    age: '45+',
    bg: '#1A1306',
    accent: '#E8B339',
    accentSoft: '#F5D177',
    cardBg: '#E8B339',
    placeholder:
      'subah 6 baje uthti hoon, chai pee ke kaam shuru, dophar tak khaane ka time nahi milta, raat ko 11 baje sote hain, ghutno mein dard rehta hai...',
    loadingMessages: ['Maa soch rahi hai', 'Ek minute beta', 'Maa ko pata hai'],
    ctaLabel: 'Maa, dekho',
  },
};

export const TONE_IDS: readonly ToneId[] = ['roast', 'mirror', 'maa'];

export const isToneId = (value: unknown): value is ToneId =>
  typeof value === 'string' && (TONE_IDS as readonly string[]).includes(value);

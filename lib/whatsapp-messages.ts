import type { ToneId } from './tones';

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export type GiftMessage = {
  templateName: string;
  body: string;
};

export const GIFT_MESSAGES: Record<ToneId, GiftMessage> = {
  roast: {
    templateName: 'mirror_gift_roast',
    body:
      "You actually finished the read. Didn't expect that.\n\n" +
      "Here's a gift. Don't waste it.\n\n" +
      "{{1}}",
  },
  mirror: {
    templateName: 'mirror_gift_mirror',
    body:
      "You looked. Honestly.\n\n" +
      "Something for you — open when you have a moment.\n\n" +
      "{{1}}",
  },
  maa: {
    templateName: 'mirror_gift_maa',
    body:
      "Beta, tune apne aap ko dekh liya. Acchi baat hai.\n\n" +
      "Tere liye ek surprise hai. Kholna zaroor.\n\n" +
      "{{1}}",
  },
};

export function giftLinkFor(leadId: string): string {
  return `${APP_URL}/gift/${leadId}`;
}

/** Campaign-specific outreach rules — mirrored in docs/internal/lead-agent-message-playbook.md */

export const MESSAGE_FEEDBACK_VALUES = [
  "good",
  "benchmark",
  "too_generic",
  "too_long",
  "too_salesy",
  "wrong_context",
] as const;

export type MessageFeedback = (typeof MESSAGE_FEEDBACK_VALUES)[number];

export const MESSAGE_FEEDBACK_LABELS: Record<MessageFeedback, string> = {
  good: "Bun",
  benchmark: "Benchmark",
  too_generic: "Prea generic",
  too_long: "Prea lung",
  too_salesy: "Prea vânzător",
  wrong_context: "Context greșit",
};

export function isMessageFeedback(value: unknown): value is MessageFeedback {
  return typeof value === "string" && (MESSAGE_FEEDBACK_VALUES as readonly string[]).includes(value);
}

export function getCampaignPlaybookRules(campaignKey: string | null | undefined): string {
  const key = (campaignKey || "").trim().toLowerCase();

  if (key === "peninsula_resort_connectors_ro") {
    return `
Campanie peninsula_resort_connectors_ro:
- Limbă: română
- Audiență: conectori români de încredere / investitori strategici
- Ton: natural, personal, strategic
- Unghi: păstrarea averii, activ real, ospitalitate, Delta Dunării, club deal opțional
- Evită: randamente garantate, presiune, hype, „pont”, promisiuni exagerate
`.trim();
  }

  if (key === "peninsula_resort_buyers_en") {
    return `
Campanie peninsula_resort_buyers_en:
- Limbă: engleză
- Audiență: KOL crypto internaționali, investitori, antreprenori
- Ton: premium, concis, global
- Unghi: activ real, business operațional de ospitalitate, Delta Dunării, diversificare în afara crypto
- Evită: presupunerea că știu România, randamente garantate, prea multe detalii la început
`.trim();
  }

  if (key === "cars_sellers_ro") {
    return `
Campanie cars_sellers_ro:
- Limbă: română
- Audiență: vânzători auto de pe platforme externe
- Ton: uman, scurt, fără presiune
- Unghi: vânzare mai rapidă, lichiditate, cumpărători calificați, fără spam
- Evită: promisiuni de cumpărător garantat, ton de agenție spam, overpromising
`.trim();
  }

  return "";
}

export function getDanielVoiceRules(language: string): string {
  if (language !== "ro") return "";

  return `
Voce Daniel (mesaje în română):
- Natural, direct, cald, strategic
- Non-corporate, nu prea lustruit
- Ca un mesaj WhatsApp real de la Daniel
- Contextual, fără limbaj generic de vânzări
- Fără formulări de call center sau broșură
`.trim();
}

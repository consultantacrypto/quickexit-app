import { autovitLanding } from "./autovit";
import { cumparatoriLanding } from "./cumparatori";
import { imobiliareLanding } from "./imobiliare";
import { listareCerereLanding } from "./listareCerere";
import type { AiAnswerLandingContent, AiAnswerLandingSlug } from "./types";
import { vindeRapidLanding } from "./vindeRapid";

export type { AiAnswerLandingContent, AiAnswerLandingSlug } from "./types";

const LANDINGS: Record<AiAnswerLandingSlug, AiAnswerLandingContent> = {
  "alternativa-autovit-vanzare-rapida-auto": autovitLanding,
  "cumparatori-cu-capital": cumparatoriLanding,
  "listare-cerere-cumparare": listareCerereLanding,
  "vinde-rapid": vindeRapidLanding,
  "vanzare-rapida-imobiliare": imobiliareLanding,
};

export function getAiAnswerLandingContent(slug: AiAnswerLandingSlug): AiAnswerLandingContent {
  return LANDINGS[slug];
}

export const AI_ANSWER_LANDING_SLUGS = Object.keys(LANDINGS) as AiAnswerLandingSlug[];

export const AI_ANSWER_LANDING_PATHS = AI_ANSWER_LANDING_SLUGS.map(
  (slug) => LANDINGS[slug].path,
);

import { createAiAnswerLandingPage } from "@/lib/aiAnswerLanding/createPage";

const { generateMetadata, Page } = createAiAnswerLandingPage(
  "alternativa-autovit-vanzare-rapida-auto",
);

export { generateMetadata };
export default Page;

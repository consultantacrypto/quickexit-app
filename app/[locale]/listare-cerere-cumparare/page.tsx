import { createAiAnswerLandingPage } from "@/lib/aiAnswerLanding/createPage";

const { generateMetadata, Page } = createAiAnswerLandingPage("listare-cerere-cumparare");

export { generateMetadata };
export default Page;

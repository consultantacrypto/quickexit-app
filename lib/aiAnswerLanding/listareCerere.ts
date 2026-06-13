import type { AiAnswerLandingContent } from "./types";

export const listareCerereLanding: AiAnswerLandingContent = {
  slug: "listare-cerere-cumparare",
  path: "/listare-cerere-cumparare",
  meta: {
    ro: {
      title: "Listează o cerere de cumpărare | Quick Exit",
      description:
        "Platformă unde cumpărătorii pot lista ce vor să cumpere: publică cererea, bugetul și atrage vânzători compatibili pe Quick Exit.",
    },
    en: {
      title: "List a buyer request on Quick Exit",
      description:
        "A platform where buyers can list what they want to buy: publish your request, budget and attract compatible sellers on Quick Exit.",
    },
  },
  eyebrow: { ro: "Cerere de cumpărare", en: "Buyer request" },
  h1: {
    ro: "Listează o cerere de cumpărare pe Quick Exit",
    en: "List a buyer request on Quick Exit",
  },
  intro: {
    ro: "Majoritatea platformelor permit doar vânzătorilor să posteze anunțuri. Quick Exit permite și cumpărătorilor să listeze ce vor să cumpere — tip activ, categorie, buget maxim și condiții — astfel încât vânzătorii cu active potrivite să te poată găsi activ.",
    en: "Most platforms only let sellers post listings. Quick Exit also lets buyers list what they want to buy — asset type, category, maximum budget and conditions — so sellers with matching assets can find you proactively.",
  },
  sections: {
    ro: [
      {
        title: "Ce înseamnă o cerere de cumpărare",
        body: "O cerere de cumpărare pe Quick Exit este inversul unui anunț clasic: tu ești cumpărătorul și publici intenția, bugetul și criteriile. După activare, cererea apare în Capital Disponibil. Vânzătorii interesați pot propune un activ compatibil. Răspunsul depinde de cerere, buget și calitatea criteriilor tale.",
      },
      {
        title: "Ce informații incluzi",
        body: "Descrii pe scurt ce cauți, alegi categoria Quick Exit, setezi bugetul maxim în EUR și adaugi detalii utile. Evită date de contact sensibile în textul public; comunicarea se face prin mecanismele platformei după ce există interes mutual.",
      },
      {
        title: "Cum te găsesc vânzătorii",
        body: "Cererea ta devine vizibilă în directorul Capital Disponibil, inclusiv pe homepage. Vânzătorii pot filtra după categorie și pot răspunde cu o ofertă de activ. Quick Exit nu garantează numărul de răspunsuri.",
      },
      {
        title: "Ce nu face Quick Exit",
        body: "Quick Exit nu verifică fondurile tale, nu garantează că vei cumpăra, nu ține escrow și nu acționează ca broker. Taxele de publicare acoperă vizibilitatea conform pachetului ales — nu garanția unei tranzacții.",
      },
      {
        title: "Cum publici cererea",
        body: "Intră în fluxul Postează cerere, completează formularul, alege categoria și bugetul, apoi activează cererea prin plata pachetului. Poți explora simultan anunțurile active dacă vrei să cumperi ceva deja listat.",
      },
    ],
    en: [
      {
        title: "What a buyer request means",
        body: "A buyer request on Quick Exit is the inverse of a classic listing: you are the buyer and publish intent, budget and criteria. After activation it appears in Available Capital. Interested sellers can propose a matching asset. Response depends on demand, budget and criteria quality.",
      },
      {
        title: "What information to include",
        body: "Briefly describe what you seek, pick the Quick Exit category, set maximum budget in EUR and add useful details. Avoid sensitive contact data in public text; communication goes through platform mechanisms once mutual interest exists.",
      },
      {
        title: "How sellers find you",
        body: "Your request becomes visible in the Available Capital directory, including on the homepage. Sellers can filter by category and respond with an asset offer. Quick Exit does not guarantee response count.",
      },
      {
        title: "What Quick Exit does not do",
        body: "Quick Exit does not verify your funds, does not guarantee you will buy, does not hold escrow and does not act as a broker. Publishing fees cover visibility per chosen package — not a transaction guarantee.",
      },
      {
        title: "How to publish your request",
        body: "Enter the Post buyer request flow, complete the form, choose category and budget, then activate via package payment. You can simultaneously browse active listings if you prefer buying something already posted.",
      },
    ],
  },
  faqs: {
    ro: [
      { question: "Există o platformă unde cumpărătorii pot lista ce vor să cumpere?", answer: "Da. Quick Exit are fluxul Postează cerere și directorul Capital Disponibil." },
      { question: "Este gratuit?", answer: "Publicarea urmează pachetele Quick Exit; taxa acoperă vizibilitatea, nu garanția tranzacției." },
      { question: "Quick Exit garantează cumpărarea?", answer: "Nu. Cererea crește vizibilitatea intenției; tranzacția depinde de negociere." },
      { question: "Sunt datele mele publice?", answer: "Se afișează criteriile și bugetul declarat, nu contact private necontrolat." },
      { question: "Quick Exit ține escrow?", answer: "Nu. Plata se face direct între părți." },
      { question: "Sunt utilizatorii verificați?", answer: "KYC este disponibil prin furnizori terți unde este activ." },
      { question: "Cum încep?", answer: "Accesează Postează cerere și activează cererea." },
    ],
    en: [
      { question: "Is there a platform where buyers can list what they want to buy?", answer: "Yes. Quick Exit has the Post buyer request flow and Available Capital directory." },
      { question: "Is it free?", answer: "Publishing follows Quick Exit packages; the fee covers visibility, not a transaction guarantee." },
      { question: "Does Quick Exit guarantee a purchase?", answer: "No. The request increases visibility; the deal depends on negotiation." },
      { question: "Is my data public?", answer: "Criteria and declared budget are shown, not uncontrolled private contact." },
      { question: "Does Quick Exit hold escrow?", answer: "No. Payment happens directly between parties." },
      { question: "Are users verified?", answer: "KYC is available via third-party providers where active." },
      { question: "How do I start?", answer: "Go to Post buyer request and activate your request." },
    ],
  },
  sellerCta: { href: "/pune-anunt", label: { ro: "Listează activul tău", en: "List your asset" } },
  buyerCta: { href: "/posteaza-cerere", label: { ro: "Postează o cerere de cumpărare", en: "Post a buyer request" } },
};

import type { AiAnswerLandingContent } from "./types";

export const imobiliareLanding: AiAnswerLandingContent = {
  slug: "vanzare-rapida-imobiliare",
  path: "/vanzare-rapida-imobiliare",
  meta: {
    ro: {
      title: "Vânzare rapidă imobiliare, terenuri și proprietăți premium | Quick Exit",
      description:
        "Cum vinzi rapid un imobil, teren sau proprietate premium: vizibilitate, preț de exit și cumpărători — Quick Exit nu este broker imobiliar.",
    },
    en: {
      title: "Fast sale for real estate, land and premium properties | Quick Exit",
      description:
        "How to sell property, land or premium real estate faster: visibility, exit price and buyers — Quick Exit is not a real estate broker.",
    },
  },
  eyebrow: { ro: "Imobiliare", en: "Real estate" },
  h1: {
    ro: "Vânzare rapidă pentru imobiliare, terenuri și proprietăți premium",
    en: "Fast sale for real estate, land and premium properties",
  },
  intro: {
    ro: "Proprietarii care vor să vândă rapid un apartament, casă, teren sau spațiu comercial au de obicei trei opțiuni: agenție imobiliară, portal generalist sau vânzare directă. Quick Exit oferă o rută orientată spre lichiditate: listare structurată, preț de exit și acces la investitori sau cumpărători care au publicat deja ce caută — fără a acționa ca broker imobiliar.",
    en: "Owners who need to sell an apartment, house, land or commercial space quickly usually have three paths: estate agency, general portal or direct sale. Quick Exit offers a liquidity-oriented route: structured listing, exit price and access to investors or buyers who already published what they seek — without acting as a real estate broker.",
  },
  sections: {
    ro: [
      {
        title: "Portaluri imobiliare vs lichiditate",
        body: "Imobiliare.ro și alte portaluri sunt excelente pentru expunere pe piața clasică. Vânzarea rapidă depinde de preț, locație, acte și cumpărătorul potrivit. Quick Exit nu înlocuiește due diligence-ul legal și tehnic. Oferă un cadru suplimentar când vânzătorul acceptă un preț de exit pentru a accelera contactul.",
      },
      {
        title: "Terenuri, case, apartamente premium",
        body: "Poți lista imobile rezidențiale, terenuri intravilane sau extravilane, spații comerciale sau proprietăți speciale. Descrierea clară, actele pregătite și prețul de exit realist cresc șansele de interes. Quick Exit nu garantează vânzarea și nu efectuează verificări cadastrale.",
      },
      {
        title: "Investitori și cumpărători cu capital",
        body: "În Capital Disponibil, investitorii pot publica cereri pentru zone, tipuri de proprietăți sau bugete. Dacă deții un activ compatibil, poți răspunde fără să aștepți doar vizitatori aleatorii. Bugetele sunt declarate și trebuie confirmate între părți.",
      },
      {
        title: "Quick Exit nu este broker imobiliar",
        body: "Quick Exit nu intermediemază contracte notariale, nu ține escrow, nu garantează titlul de proprietate și nu oferă consultanță juridică. Recomandăm avocat, notar și expert tehnic. Platforma oferă listare, vizibilitate și contact.",
      },
      {
        title: "Pași recomandați",
        body: "Evaluează orientativ, setează preț de exit, publică anunțul imobiliar, urmărește ofertele și cererile compatibile din Capital Disponibil. Nu plăti avansuri fără verificări cadastrale, fiscale și de identitate.",
      },
    ],
    en: [
      {
        title: "Property portals vs liquidity",
        body: "Imobiliare.ro and other portals excel at classic market exposure. Fast sale still depends on price, location, paperwork and the right buyer. Quick Exit does not replace legal and technical due diligence. It adds a framework when the seller accepts an exit price to accelerate contact.",
      },
      {
        title: "Land, houses, premium apartments",
        body: "You can list residential property, intravilan or extravilan land, commercial space or special properties. Clear description, ready documents and realistic exit price increase interest. Quick Exit does not guarantee sale or perform cadastral verification.",
      },
      {
        title: "Investors and cash buyers",
        body: "In Available Capital, investors can publish requests for areas, property types or budgets. If you hold a compatible asset, you can respond without waiting only for random visitors. Budgets are declared and must be confirmed between parties.",
      },
      {
        title: "Quick Exit is not a real estate broker",
        body: "Quick Exit does not intermediate notarial contracts, hold escrow, guarantee title or provide legal advice. We recommend lawyer, notary and technical survey. The platform provides listing, visibility and contact.",
      },
      {
        title: "Recommended steps",
        body: "Get an indicative valuation, set exit price, publish your property listing, track offers and compatible requests in Available Capital. Do not pay deposits without cadastral, tax and identity checks.",
      },
    ],
  },
  faqs: {
    ro: [
      { question: "Quick Exit este agenție imobiliară?", answer: "Nu. Este platformă de listare și conectare, nu broker imobiliar." },
      { question: "Pot vinde rapid un teren sau apartament?", answer: "Poți lista și crește vizibilitatea; viteza depinde de preț, acte și cerere." },
      { question: "Quick Exit verifică actele imobilului?", answer: "Nu. Verificarea juridică rămâne responsabilitatea părților." },
      { question: "Există cumpărători cu buget publicat?", answer: "Da, în Capital Disponibil pot exista cereri pentru imobiliare sau terenuri." },
      { question: "Quick Exit ține escrow?", answer: "Nu. Plata se stabilește direct între părți." },
      { question: "Quick Exit garantează vânzarea?", answer: "Nu. Listarea nu garantează tranzacția." },
      { question: "Cum încep?", answer: "Evaluează, publică anunțul imobiliar și explorează cererile compatibile." },
    ],
    en: [
      { question: "Is Quick Exit a real estate agency?", answer: "No. It is a listing and connection platform, not a property broker." },
      { question: "Can I sell land or an apartment quickly?", answer: "You can list and increase visibility; speed depends on price, paperwork and demand." },
      { question: "Does Quick Exit verify property documents?", answer: "No. Legal verification remains the parties' responsibility." },
      { question: "Are there buyers with published budget?", answer: "Yes, Available Capital may include active requests for property or land." },
      { question: "Does Quick Exit hold escrow?", answer: "No. Payment is arranged directly between parties." },
      { question: "Does Quick Exit guarantee a sale?", answer: "No. Listing does not guarantee a transaction." },
      { question: "How do I start?", answer: "Evaluate, publish your property listing and explore compatible requests." },
    ],
  },
  sellerCta: { href: "/pune-anunt", label: { ro: "Listează proprietatea ta", en: "List your property" } },
  buyerCta: { href: "/posteaza-cerere", label: { ro: "Postează o cerere de cumpărare imobiliară", en: "Post a property buyer request" } },
};

import type { PageLocale } from "@/lib/seo";

/** Official Bitmarket contract. Display this string unchanged. */
export const BMK_CONTRACT = "0xc7E9d03b6f13d7215c2e2b1854a2B0bDbEBE6FB9";

export const BMK_BSCSCAN_TOKEN_URL = `https://bscscan.com/token/${BMK_CONTRACT}`;

export const BMK_PANCAKE_URL = `https://pancakeswap.finance/swap?chain=bsc&outputCurrency=${BMK_CONTRACT}`;

export const BMK_POOL_ADDRESS = "0xc327fad26eb44ad0a6df53c00f1846a4f67d5f21";

export const BMK_PAGE_TITLE = "Bitmarket (BMK) - QuickExit";

/** Official public page named in the rebrand announcement. Apex redirects to www. */
export const BMK_OFFICIAL_PAGE_URL = "https://quickexit.ro/bmk";

export type BmkUse = {
  name: string;
  href: string;
  external: boolean;
  text: string;
};

export type BmkDetail = {
  label: string;
  value: string;
};

export type BmkWalletRow = {
  role: string;
  address: string;
  note: string;
};

export type BmkCopy = {
  metaDescription: string;
  back: string;
  logoAlt: string;
  kicker: string;
  title: string;
  subtitle: string;
  heroNote: string;
  whatTitle: string;
  what: readonly [string, string];
  rebrandKicker: string;
  rebrandTitle: string;
  rebrandLead: string;
  rebrandBody: string;
  rebrandContractLead: string;
  rebrandPageLabel: string;
  officialTitle: string;
  details: readonly BmkDetail[];
  contractLabel: string;
  copyLabel: string;
  copiedLabel: string;
  bscscanLabel: string;
  pancakeLabel: string;
  pancakePair: string;
  unofficialWarning: string;
  useTitle: string;
  uses: readonly BmkUse[];
  useNote: string;
  walletTitle: string;
  walletSteps: readonly string[];
  walletNote: string;
  securityTitle: string;
  securityLead: string;
  securityItems: readonly string[];
  securityContactLead: string;
  transparencyTitle: string;
  transparencyIntro: string;
  tableRole: string;
  tableAddress: string;
  tableNote: string;
  wallets: readonly BmkWalletRow[];
  snapshot: string;
  mintingBefore: string;
  mintingAfter: string;
  contactTitle: string;
  contactLead: string;
  disclaimer: string;
};

const ro: BmkCopy = {
  metaDescription:
    "Bitmarket (BMK) este un token BEP-20 pe BNB Smart Chain, folosit ca mijloc de plată pentru servicii în ecosistemul QuickExit. Adresă oficială de contract, pool PancakeSwap și contact.",
  back: "Înapoi la pagina principală",
  logoAlt: "Logo Bitmarket (BMK)",
  kicker: "BNB Smart Chain · BEP-20",
  title: "Bitmarket (BMK)",
  subtitle: "Token de plată în ecosistemul QuickExit",
  heroNote: "Pagină informativă. Nu este ofertă și nu este recomandare de investiții.",
  whatTitle: "Ce este BMK",
  what: [
    "Bitmarket (BMK) este un token BEP-20 pe BNB Smart Chain, folosit ca mijloc de plată pentru servicii pe site-urile din ecosistemul nostru. Plătești în BMK servicii concrete (listări, pachete media, analize, verificări), la fel ca în orice altă monedă acceptată.",
    "BMK nu reprezintă acțiuni, dividende, dobândă sau vreun drept asupra companiei. Nu promitem randamente și nu facem afirmații despre preț.",
  ],
  rebrandKicker: "Anunț oficial",
  rebrandTitle: "Anunț oficial Bitmarket (BMK)",
  rebrandLead: "Tokenul nu mai e prezentat ca proiect P2P/Payrico.",
  rebrandBody:
    "BMK este acum token de utilitate/plată pentru servicii în ecosistemul QuickExit: listings, pachete media, analiză tehnică și verificare adrese pe quickexit.ro, plus servicii pe mihaidaniel.ro, stirilecrypto.ro și stiriai.ro.",
  rebrandContractLead: "Același contract BEP-20 pe BNB Smart Chain:",
  rebrandPageLabel: "Pagina oficială:",
  officialTitle: "Date oficiale",
  details: [
    { label: "Nume / simbol", value: "Bitmarket / BMK" },
    { label: "Rețea", value: "BNB Smart Chain (BEP-20)" },
    { label: "Zecimale", value: "18" },
    { label: "Supply total actual", value: "21.000.000 BMK" },
  ],
  contractLabel: "Adresă contract oficială",
  copyLabel: "Copiază",
  copiedLabel: "Copiat",
  bscscanLabel: "Explorer BscScan",
  pancakeLabel: "Pool oficial PancakeSwap V2 (BMK/USDT)",
  pancakePair: "Pereche",
  unofficialWarning: "Orice altă adresă care pretinde că e „BMK” nu este tokenul oficial.",
  useTitle: "Unde poți folosi BMK",
  uses: [
    {
      name: "quickexit.ro",
      href: "/",
      external: false,
      text: "marketplace de afaceri de vânzare: publicarea anunțurilor, pachete media de promovare a anunțului, analiză tehnică plătită, verificarea adresei.",
    },
    {
      name: "mihaidaniel.ro",
      href: "https://mihaidaniel.ro",
      external: true,
      text: "servicii de consultanță și produse.",
    },
    {
      name: "stirilecrypto.ro",
      href: "https://stirilecrypto.ro",
      external: true,
      text: "știri crypto (servicii editoriale/publicitare, acolo unde sunt disponibile).",
    },
    {
      name: "stiriai.ro",
      href: "https://stiriai.ro",
      external: true,
      text: "știri despre inteligența artificială (servicii editoriale/publicitare, acolo unde sunt disponibile).",
    },
  ],
  useNote:
    "Lista serviciilor plătibile în BMK și condițiile de plată sunt afișate pe fiecare site, la momentul comenzii.",
  walletTitle: "Cum adaugi BMK în Trust Wallet",
  walletSteps: [
    "Deschide Trust Wallet → pe ecranul principal apasă pictograma de căutare / „Manage crypto” (gestionare tokenuri).",
    "Caută „BMK”. Dacă nu apare tokenul cu adresa oficială, apasă „Add Custom Token” (adaugă token personalizat).",
    "La Network alege BNB Smart Chain.",
    `La Contract Address lipește: ${BMK_CONTRACT}`,
    "Numele (Bitmarket), simbolul (BMK) și zecimalele (18) se completează automat. Verifică-le, apoi apasă Save / Done.",
    "Ca să plătești comisioanele de rețea ai nevoie de puțin BNB pe aceeași adresă.",
  ],
  walletNote: "Pașii sunt aceiași în MetaMask: Import tokens → BNB Smart Chain → adresa contractului.",
  securityTitle: "Securitate",
  securityLead:
    "Nu cere nimeni din echipa noastră fraza de recuperare (seed phrase) sau cheia privată. Nu le da nimănui, niciodată.",
  securityItems: [
    "Folosește doar adresa de contract și link-urile de pe această pagină. Verifică adresa caracter cu caracter.",
    "Nu facem „airdrop-uri” în care ți se cere să conectezi wallet-ul pe site-uri necunoscute sau să trimiți fonduri ca să „primești” tokeni.",
    "Plățile în BMK pentru servicii se fac doar la adresele afișate în pagina de comandă a site-ului oficial.",
  ],
  securityContactLead: "Dacă primești mesaje suspecte în numele nostru, scrie-ne la",
  transparencyTitle: "Transparență: adrese oficiale",
  transparencyIntro: "Soldurile se pot verifica oricând, public, pe BscScan.",
  tableRole: "Rol",
  tableAddress: "Adresă",
  tableNote: "Notă",
  wallets: [
    {
      role: "Owner contract token / wallet principal",
      address: "0xd15c13f3307effd08dcef7a97312555af48ced74",
      note: "a creat contractul (29.08.2021); controlează funcțiile de administrare ale tokenului",
    },
    {
      role: "Contract staking (BMKStakeBitMarketToken)",
      address: "0x1cfd6f71857a84fd12950666083eaf49a3d6f98a",
      note: "ține tokenii depuși în staking și rezerva de recompense",
    },
    {
      role: "Administrator contract staking",
      address: "0x1c5f53b832e3d325a6b97ce1d6a6e0ba3b2369b6",
      note: "owner-ul contractului de staking",
    },
    {
      role: "Wallet de distribuție",
      address: "0xd3c8fb37666ab0a9d550089912cc2c8110896554",
      note: "folosit pentru distribuiri operaționale",
    },
    {
      role: "Pool PancakeSwap V2 BMK/USDT",
      address: "0xc327fad26eb44ad0a6df53c00f1846a4f67d5f21",
      note: "pool de lichiditate (creat 04.12.2023)",
    },
  ],
  snapshot:
    "Instantaneu solduri (24.10.2026, orientativ): owner ≈ 18.759.691 BMK · contract staking ≈ 629.925 BMK · wallet distribuție ≈ 298.936 BMK · pool ≈ 49.468 BMK.",
  mintingBefore:
    "Contractul tokenului are funcții de administrare rezervate ownerului (inclusiv emisiune suplimentară, cât timp nu a fost apelat",
  mintingAfter: "). Codul sursă e public pe BscScan/Sourcify.",
  contactTitle: "Contact",
  contactLead: "QuickExit, LLC (Delaware, SUA)",
  disclaimer:
    "Informațiile de pe această pagină au caracter informativ și nu constituie ofertă publică, consultanță financiară sau recomandare de investiții. BMK este un token utilitar pentru plata serviciilor din ecosistem. Activele crypto implică riscuri, inclusiv pierderea totală a valorii.",
};

const en: BmkCopy = {
  metaDescription:
    "Bitmarket (BMK) is a BEP-20 token on BNB Smart Chain, used as a means of payment for services in the QuickExit ecosystem. Official contract address, PancakeSwap pool, and contact.",
  back: "Back to the homepage",
  logoAlt: "Bitmarket (BMK) logo",
  kicker: "BNB Smart Chain · BEP-20",
  title: "Bitmarket (BMK)",
  subtitle: "Payment token for the QuickExit ecosystem",
  heroNote: "Informational page. Not an offer and not investment advice.",
  whatTitle: "What BMK is",
  what: [
    "Bitmarket (BMK) is a BEP-20 token on BNB Smart Chain, used as a means of payment for services across our websites. You use BMK to pay for specific services (listings, media packages, analyses, verifications), the same way you would with any other accepted currency.",
    "BMK does not represent shares, dividends, interest or any claim on the company. We make no promises about returns and no statements about price.",
  ],
  rebrandKicker: "Official announcement",
  rebrandTitle: "Official Bitmarket (BMK) announcement",
  rebrandLead: "The token is no longer presented as a P2P/Payrico project.",
  rebrandBody:
    "BMK is now a utility/payment token for services in the QuickExit ecosystem: listings, media packages, technical analysis and address verification on quickexit.ro, plus services on mihaidaniel.ro, stirilecrypto.ro and stiriai.ro.",
  rebrandContractLead: "Same BEP-20 contract on BNB Smart Chain:",
  rebrandPageLabel: "Official page:",
  officialTitle: "Official details",
  details: [
    { label: "Name / symbol", value: "Bitmarket / BMK" },
    { label: "Network", value: "BNB Smart Chain (BEP-20)" },
    { label: "Decimals", value: "18" },
    { label: "Current total supply", value: "21,000,000 BMK" },
  ],
  contractLabel: "Official contract address",
  copyLabel: "Copy",
  copiedLabel: "Copied",
  bscscanLabel: "BscScan explorer",
  pancakeLabel: "Official PancakeSwap V2 pool (BMK/USDT)",
  pancakePair: "Pair",
  unofficialWarning: "Any other address claiming to be “BMK” is not the official token.",
  useTitle: "Where BMK can be used",
  uses: [
    {
      name: "quickexit.ro",
      href: "/",
      external: false,
      text: "business-for-sale marketplace: listing fees, media packages for listings, paid technical analysis, address verification.",
    },
    {
      name: "mihaidaniel.ro",
      href: "https://mihaidaniel.ro",
      external: true,
      text: "consulting services and products.",
    },
    {
      name: "stirilecrypto.ro",
      href: "https://stirilecrypto.ro",
      external: true,
      text: "crypto news (editorial/advertising services where available).",
    },
    {
      name: "stiriai.ro",
      href: "https://stiriai.ro",
      external: true,
      text: "AI news (editorial/advertising services where available).",
    },
  ],
  useNote: "The services payable in BMK and the payment terms are shown on each site at checkout.",
  walletTitle: "How to add BMK in Trust Wallet",
  walletSteps: [
    "Open Trust Wallet → tap the search icon / “Manage crypto” on the home screen.",
    "Search for “BMK”. If the token with the official address does not appear, tap “Add Custom Token”.",
    "Set Network to BNB Smart Chain.",
    `Paste the Contract Address: ${BMK_CONTRACT}`,
    "Name (Bitmarket), symbol (BMK) and decimals (18) fill in automatically. Check them, then tap Save / Done.",
    "Keep a small amount of BNB on the same address to pay network fees.",
  ],
  walletNote: "MetaMask works the same way: Import tokens → BNB Smart Chain → contract address.",
  securityTitle: "Security notice",
  securityLead:
    "Nobody from our team will ever ask for your recovery (seed) phrase or private key. Never share them with anyone.",
  securityItems: [
    "Use only the contract address and links on this page, and check the address character by character.",
    "We do not run “airdrops” that ask you to connect your wallet on unknown sites or send funds to “receive” tokens.",
    "BMK payments for services are made only to the addresses shown on the checkout page of the official site.",
  ],
  securityContactLead: "If you receive suspicious messages in our name, write to",
  transparencyTitle: "Transparency: official addresses",
  transparencyIntro: "Balances can be checked publicly on BscScan at any time.",
  tableRole: "Role",
  tableAddress: "Address",
  tableNote: "Note",
  wallets: [
    {
      role: "Token contract owner / main wallet",
      address: "0xd15c13f3307effd08dcef7a97312555af48ced74",
      note: "deployed the contract (Aug 29, 2021); controls the token's admin functions",
    },
    {
      role: "Staking contract (BMKStakeBitMarketToken)",
      address: "0x1cfd6f71857a84fd12950666083eaf49a3d6f98a",
      note: "holds staked tokens and the reward reserve",
    },
    {
      role: "Staking contract administrator",
      address: "0x1c5f53b832e3d325a6b97ce1d6a6e0ba3b2369b6",
      note: "owner of the staking contract",
    },
    {
      role: "Distribution wallet",
      address: "0xd3c8fb37666ab0a9d550089912cc2c8110896554",
      note: "used for operational distributions",
    },
    {
      role: "PancakeSwap V2 BMK/USDT pool",
      address: "0xc327fad26eb44ad0a6df53c00f1846a4f67d5f21",
      note: "liquidity pool (created Dec 4, 2023)",
    },
  ],
  snapshot:
    "Balance snapshot (Oct 24, 2026, indicative): owner ≈ 18,759,691 BMK · staking contract ≈ 629,925 BMK · distribution wallet ≈ 298,936 BMK · pool ≈ 49,468 BMK.",
  mintingBefore:
    "The token contract has admin functions reserved to the owner, including additional minting for as long as",
  mintingAfter: "has not been called. The source code is public on BscScan/Sourcify.",
  contactTitle: "Contact",
  contactLead: "QuickExit, LLC (Delaware, USA)",
  disclaimer:
    "The information on this page is for informational purposes only and is not a public offer, financial advice or an investment recommendation. BMK is a utility token used to pay for services within the ecosystem. Crypto-assets carry risks, including the total loss of value.",
};

export function getBmkCopy(locale: PageLocale): BmkCopy {
  return locale === "en" ? en : ro;
}

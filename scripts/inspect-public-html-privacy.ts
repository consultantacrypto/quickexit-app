/**
 * Read-only scan of public HTML for private contact leakage.
 * Prints counts and CTA flags only — never prints matched phone/email values.
 */
const LISTING_ID = "50e8decd-635a-46f7-908e-2ac1fddf8ac6";

const URLS = [
  "https://www.quickexit.ro/ro",
  "https://www.quickexit.ro/en",
  `https://www.quickexit.ro/ro/anunt/${LISTING_ID}`,
  `https://www.quickexit.ro/en/anunt/${LISTING_ID}`,
];

function count(html: string, re: RegExp): number {
  return (html.match(re) || []).length;
}

async function main() {
  for (const url of URLS) {
    const res = await fetch(url, { redirect: "follow" });
    const html = await res.text();
    const tel = count(html, /href=["']tel:/gi);
    const wa = count(html, /wa\.me\//gi);
    console.log(
      JSON.stringify({
        path: new URL(url).pathname,
        status: res.status,
        bytes: html.length,
        tel_href: tel,
        wa_me: wa,
        mailto_href: count(html, /href=["']mailto:/gi),
        plus40_digit_runs: count(html, /\+40\d{8,}/g),
        buyer_phone_token: count(html, /buyer_phone/gi),
        seller_contacts_token: count(html, /seller_contacts/gi),
        has_solicita_detalii: html.includes("Solicită detalii"),
        has_trimite_oferta: html.includes("Trimite ofertă"),
        has_request_details: /request details/i.test(html),
        has_send_offer: /send (an )?offer/i.test(html),
        listing_tel_is_suna_cta: html.includes(">Sună</a>") || html.includes(">Call</a>"),
      }),
    );
  }
  console.log("OK public-html-privacy");
  console.log(
    "note=listing tel/WhatsApp matches public operator premium-seller CTA, not buyer_phone or seller_contacts",
  );
}

void main();

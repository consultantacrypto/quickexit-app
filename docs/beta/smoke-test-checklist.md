# Quick Exit — Smoke Test Checklist Beta

Checklist manual recomandat la fiecare deploy.

## 1. Homepage
- [ ] Hero vizibil corect.
- [ ] CTA evaluare functioneaza.
- [ ] Pachete vizibile si lizibile.
- [ ] Sectiune anunturi active incarcare corecta.
- [ ] Sectiune capital disponibil incarcare corecta.
- [ ] Sectiune licitatii deschise functionala.
- [ ] Footer cu link feedback functional.

## 2. Evaluare
- [ ] Selectare categorie functionala.
- [ ] Submit evaluare functioneaza.
- [ ] Rezultat evaluare afisat corect.
- [ ] Mesajul evita jargon tehnic excesiv.
- [ ] CTA spre publicare prezent.

## 3. Publicare anunt
- [ ] Alegere categorie functioneaza.
- [ ] Campuri dinamice valide.
- [ ] Upload poze functioneaza.
- [ ] Alegere pachet functioneaza.
- [ ] Checkout listing functioneaza.
- [ ] Status initial `pending_payment`.
- [ ] Webhook activeaza listingul dupa plata.

## 4. Anunt public
- [ ] Listing cu status `active` vizibil public.
- [ ] Poze afisate corect.
- [ ] Preturi afisate corect.
- [ ] CTA ofertare functioneaza.
- [ ] Lichidare/licitatie afisate corect unde e cazul.
- [ ] Noindex aplicat corect unde este invalid/inexistent.

## 5. Oferta pe anunt
- [ ] Trimitere oferta functioneaza.
- [ ] Oferta apare in dashboard seller.
- [ ] Oferta apare in dashboard buyer.
- [ ] Accept/refuz functioneaza.
- [ ] Marcare nefinalizata functioneaza.
- [ ] Marcare vandut functioneaza.

## 6. Cerere / capital disponibil
- [ ] Postare cerere functioneaza.
- [ ] Checkout demand functioneaza.
- [ ] Webhook activeaza cererea.
- [ ] Cererea apare in Capital disponibil.
- [ ] Trimitere oferta catre cerere functioneaza.
- [ ] Poze in oferta catre cerere functioneaza.
- [ ] Dashboard ambele parti arata corect statusurile.
- [ ] Cererile `resolved` nu apar public.

## 7. Dashboard
- [ ] Tab Activele mele functioneaza.
- [ ] Tab Cererile mele functioneaza.
- [ ] Camera de Negociere functioneaza.
- [ ] Linkuri owner-only HQ/BMK corecte.
- [ ] Layout mobil in dashboard este stabil.

## 8. Stripe / webhook
- [ ] Listing payment returneaza 200.
- [ ] Demand payment returneaza 200.
- [ ] Loguri webhook fara erori critice.
- [ ] `expires_at` setat corect unde e necesar.

## 9. Analytics / privacy
- [ ] Evenimentele nu contin email/telefon/mesaj.
- [ ] `click_evaluate` se trimite corect.
- [ ] `submit_demand_offer` (oferta catre cerere) se trimite corect.
- [ ] Checkout start/success/cancel se trimit corect.

## 10. BMK Lab owner-only
- [ ] Owner vede acces BMK Lab.
- [ ] User normal nu vede acces BMK Lab.
- [ ] Connect wallet functioneaza.
- [ ] BSC switch functioneaza.
- [ ] Citire balanta functioneaza.
- [ ] Confirmat: fara swap / fara payments.

## 11. Feedback
- [ ] Linkul mailto feedback functioneaza.
- [ ] Exista canal clar de raportare bug.

## 12. Fail conditions (stop release)
- [ ] Orice 404 pe CTA principal.
- [ ] Webhook fail.
- [ ] Upload imagini fail.
- [ ] Oferta lipsa in dashboard dupa submit.
- [ ] PII in analytics.
- [ ] User normal vede HQ/BMK.
- [ ] Listing platit dar neactivat.

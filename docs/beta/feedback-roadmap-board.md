# Quick Exit — Beta Feedback & Roadmap Board

## 1. Scop
Acest document centralizeaza feedback-ul din beta controlat si il transforma in decizii clare, prioritizate si urmaribile pe sprinturi. Obiectivul este sa evitam reactiile haotice la observatii izolate si sa pastram directia de produs.

## 2. Reguli de triage
- **Blocker** - opreste fluxuri critice, produce erori majore sau risc operational.
- **Important** - afecteaza semnificativ conversia, claritatea sau increderea, dar are workaround temporar.
- **Polish** - imbunatatiri de UX/UI/copy fara impact functional major.
- **Idee / oportunitate** - directie de produs utila, dar neurgenta.
- **Post-beta** - util, dar fara valoare imediata in faza actuala.
- **Nu acum** - in afara strategiei curente sau cu risc/complexitate prea mare pentru etapa beta.

## 3. Tabel feedback primit
| Data | Tester | Flow / pagina | Feedback | Severitate | Decizie | Status | Owner | Observatii |
|---|---|---|---|---|---|---|---|---|
| 2026-05 | Beta #1 | Homepage / onboarding | Onboarding cont neclar | Important | Clarificari copy + plasare in zone discrete | Facut | Product + Frontend | Mesaj mutat din hero in zona utila |
| 2026-05 | Beta #2 | /pune-anunt | Pare blocat la alegerea categoriei | Important | Adaugam helper text si verificam flow-ul | Facut (copy) | Frontend | Fara modificari de logica |
| 2026-05 | Beta #3 | Homepage pachete | Pachetele trebuie explicate mai clar | Important | Micro-copy pe pachete + tarife | Facut | Product + Frontend | Fara schimbari pricing logic |
| 2026-05 | Beta #4 | Tranzactii directe | Lipsa escrow cere sfaturi de siguranta | Important | Bloc de siguranta compact | Facut | Product | Mesaje fara promisiuni |
| 2026-05 | Beta #5 | Footer | Util link de feedback | Polish | Link mailto "Trimite feedback" | Facut | Frontend | Fara tracking nou |
| 2026-05 | Beta #6 | Dashboard | "Setari cont" duce la 404 | Blocker | Eliminare temporara buton pana exista pagina reala | Facut | Frontend | Evitare dead UI |
| 2026-05 | Beta #7 | Vizual general | Grafica apreciata | Idee / oportunitate | Pastram directia vizuala | Confirmat | Product | Mentinem consistenta premium |
| 2026-05 | Beta #8 | Product | Preț in scadere / live price | Idee / oportunitate | Spec separat + roadmap incremental | In pregatire | Product | Feature major, nu patch rapid |
| 2026-05 | Beta #9 | Marketplace model | Echilibru vanzatori/cumparatori | Important | Audit oferta-cerere + backlog filtre | In analiza | Product + Growth | Wedge-ul ramane viteza de lichiditate |
| 2026-05 | Beta #10 | Strategia token | BMK ca layer VIP/legacy | Idee / oportunitate | BMK Lab privat read-only | Facut (MVP privat) | Founder + Tech | Fara expunere publica |
| 2026-05 | Beta #11 | Homepage | Hero polish iterativ | Polish | Fine tuning responsive si micro-animatii | Facut | Frontend | Fara redesign major |

## 4. Ce reparam imediat
- Bug-uri 404 pe CTA-uri sau linkuri de dashboard.
- Copy clarificator pentru flow-uri sensibile (onboarding, siguranta, pachete).
- Smoke test operational per deploy.
- Linkuri owner-only HQ/BMK in dashboard.
- Loop de feedback prin mailto + triage clar.

## 5. Ce intra in backlog
- Profil utilizator minimal.
- Preț in scadere (manual V0).
- Filtre mai bune in Capital disponibil.
- Demo video / screenshot pentru Camera de Negociere.
- Notificari si price alerts.
- User testing extins pe mobile.

## 6. Ce devine feature major
- Preț in scadere.
- Urmareste pretul.
- Buy order matching.
- Profil reputatie / verificari extinse.
- BMK VIP layer.
- Notificari / alerte.
- Ofertare avansata / licitatie v2.

## 7. Ce NU atingem acum
- Escrow.
- Custodie.
- Swap public BMK.
- Plati BMK publice.
- KYC complet extins.
- Homepage redesign major.
- Demo listings false in feed public.
- Pivot catre marketplace generalist fara wedge.

## 8. Principiul de produs
Quick Exit conecteaza vanzatori care vor sa vanda rapid cu cumparatori care au buget si cauta oportunitati sub pretul pietei.

## 9. Urmatoarele sprinturi propuse
- Profil utilizator minimal - audit.
- Preț in scadere - spec.
- BMK tier calibration - audit.
- Smoke test checklist operational.

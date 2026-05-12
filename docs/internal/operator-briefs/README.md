# Operator Briefs

Folder pentru **brief-uri interne** generate **manual** sau cu **ajutor AI** (ex. OpenClaw), pornind de la **data pack-uri curate** validate conform:

- `docs/internal/operator-manual-export-format.md`
- `docs/internal/operator-brief-procedure.md`

## Reguli

- **Nu** se comit brief-uri care conțin **PII** (emailuri complete, telefoane complete, mesaje integrale, documente identitate).
- **Nu** se comit **exporturi brute** din producție sau dump-uri nemascate.
- **Nu** se comit date **Stripe** / **KYC** sensibile în clar.
- Brief-urile comise trebuie să conțină **doar** sinteze, observații operaționale și **taskuri** formulate pentru **aprobare** și **execuție manuală**.
- Dacă un brief conține **date reale sensibile**, se păstrează **în afara** repo-ului (local securizat, vault, sau alt canal intern aprobat).

## Convenție de nume

Exemplu: `docs/internal/operator-briefs/2026-05-12.md` — vezi secțiunea 11 din `operator-brief-procedure.md`.

## Șablon

Structura secțiunilor: `docs/internal/operator-brief-template.md`.

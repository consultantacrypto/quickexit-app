# Operator Briefs

Folder pentru **brief-uri interne** generate **manual** sau cu **ajutor AI** (ex. OpenClaw), pornind de la **data pack-uri curate** validate conform:

- `docs/internal/operator-manual-export-format.md`
- `docs/internal/operator-brief-procedure.md`

---

## Brief demo oficial

**Brief-ul oficial demo** pentru fluxul fictiv **2026-05-12** este:

`docs/internal/operator-briefs/2026-05-12-regenerated.md`

Legătură relativă: [`2026-05-12-regenerated.md`](./2026-05-12-regenerated.md)

---

## Input asociat

**Data pack-ul** folosit ca **sursă numerică de adevăr** pentru acest demo este:

`docs/internal/operator-data-packs/2026-05-12-fictive/`

Legătură relativă: [folder data pack fictiv](../operator-data-packs/2026-05-12-fictive/) (vezi și `README.md` din acel folder).

---

## Brief inițial

Fișierul:

`docs/internal/operator-briefs/2026-05-12-fictive-brief.md`

Legătură relativă: [`2026-05-12-fictive-brief.md`](./2026-05-12-fictive-brief.md)

Rămâne un **exemplu inițial** de formă, dar **nu** este **output-ul oficial** al data pack-ului curent și **nu** este sursa numerică finală pentru demo.

---

## Flux demo validat

**Data pack fictiv** → **analiză read-only** → **Daily Brief regenerat** → **taskuri propuse** → **aprobare umană**

---

## Reguli

- **Nu** se comit brief-uri care conțin **PII** (emailuri complete, telefoane complete, mesaje integrale, documente identitate).
- **Nu** se comit **exporturi brute** din producție sau dump-uri nemascate.
- **Nu** se comit date **Stripe** / **KYC** sensibile în clar.
- Brief-urile comise trebuie să conțină **doar** sinteze, observații operaționale și **taskuri** formulate pentru **aprobare** și **execuție manuală**.
- Dacă un brief conține **date reale sensibile**, se păstrează **în afara** repo-ului (local securizat, vault, sau alt canal intern aprobat).

---

## Convenție de nume

Exemplu: `docs/internal/operator-briefs/2026-05-12.md` — vezi secțiunea 11 din `operator-brief-procedure.md`.

---

## Șablon

Structura secțiunilor: `docs/internal/operator-brief-template.md`.

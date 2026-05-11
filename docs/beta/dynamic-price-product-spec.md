# Preț in scadere — Product Spec

## 1. Concept
Vanzatorul porneste cu un pret atractiv si poate reduce treptat pretul pentru a accelera vanzarea. Cumparatorul poate urmari produsul si reactiona cand intra in bugetul lui.

## 2. De ce se potriveste Quick Exit
- Viteza are un pret.
- Evidentiaza oportunitati sub piata.
- Creeaza revenire recurenta in platforma.
- Se leaga natural de buy orders / cereri de cumparare.

## 3. Versiuni posibile
### V0 — Manual
- Seller apasa „Scade pretul”.
- Se actualizeaza `exit_price`.
- Badge „Pret in scadere”.
- Optional istoric simplu.

### V1 — Follow price
- Cumparatorul urmareste anuntul.
- Seteaza prag dorit.
- Primeste notificare cand pretul ajunge la prag.

### V2 — Programat
- Seller seteaza pret initial, minim, intervale de scadere.
- Sistemul ajusteaza automat conform regulilor setate.

### V3 — Matching cu cereri
- Cand pretul ajunge in bugetul unei cereri active, platforma sugereaza potrivire.

## 4. Ce NU facem initial
- Automatizari complexe de la inceput.
- Notificari push inainte de infrastructura dedicata.
- Promisiuni de vanzare.
- Mecanisme care pot sugera manipulare artificiala de pret.
- Escrow.

## 5. Riscuri
- Cumparatorii pot amana intentia, asteptand doar scaderi.
- Vanzatorii pot simti presiune necontrolata.
- Istoricul de pret poate expune strategie comerciala.
- Notificarile pot deveni spam daca nu sunt bine calibrate.

## 6. MVP recomandat
**V0**:
- Scadere manuala pret.
- Badge vizibil in UI.
- Optional `last_price_drop_at`.
- Fara alerte in prima faza.

## 7. Date necesare (posibil viitor)
- `previous_exit_price`
- `last_price_drop_at`
- `price_drop_count`
- `price_history`
- `watchlist`
- `target_price_alerts`

## 8. Intrebari deschise
- Publicam istoricul complet de pret sau partial?
- Afisam „a fost X, acum Y” permanent?
- Cine primeste alerte si in ce conditii?
- Cum legam in mod util cu cereri active fara zgomot?

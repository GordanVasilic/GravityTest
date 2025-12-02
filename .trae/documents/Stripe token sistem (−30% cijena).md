## Cilj
Uvesti sistem tokena bez email sinhronizacije: 1 GPX/TCX preuzimanje = 1 token, tokeni ne ističu, čuvaju se lokalno u browseru. Plaćanje ide preko Stripe Checkout-a.

## Paketi i cijene (USD, cijeli/0.5$)
- 5 tokena: $2.00
- 10 tokena: $4.00
- 25 tokena: $9.00
- 50 tokena: $15.00
- 1 preuzimanje troši 1 token.

## Backend (minimalno, Stripe)
- Tehnologija: `Node/Express` + `stripe`.
- Endpointi:
  - `POST /api/checkout/session` – kreira Stripe Checkout session za izabrani paket; vraća `url`.
  - `POST /api/checkout/verify` – prima `session_id` sa `success_url`, potvrđuje da je kupovina „completed“ i vraća `token_amount`.
- Webhook (opciono): `POST /api/webhook` – logovanje kupovina (tokeni ostaju lokalni).
- Tajne: `STRIPE_SECRET_KEY`, `WEBHOOK_SECRET` u `.env`.

## Frontend
- `BuyTokensButton` u gornjem desnom uglu (`src/App.jsx`) – otvara `TokensModal`.
- `TokensModal` (`src/components/TokensModal.jsx`): prikaz paketa/cijena (2/4/9/15 USD) i dugmadi „Kupi“. Poziv `checkout/session`, redirect na Stripe; po povratku koristi `session_id` za verifikaciju i lokalno dodaje tokene.
- `TokenBadge` – prikazuje trenutni saldo u headeru.
- `TokenStore` (`src/utils/TokenStore.js`) – localStorage: čitanje/pisanje salda, dekrement, inicijalizacija.
- `src/components/RunForm.jsx` – prije generisanja/preuzimanja GPX/TCX:
  - Ako saldo < 1: prikaz poruke i otvaranje `TokensModal`.
  - Ako saldo ≥ 1: izvršiti preuzimanje i smanjiti saldo za 1.
- Post-kupovina: na `success_url` pročitati `session_id`, pozvati `/api/checkout/verify`, uvećati lokalne tokene i prikazati potvrdu.

## Stripe konfiguracija
- Proizvodi/cijene (USD) sa metapodacima `token_amount`: 5, 10, 25, 50.
- Checkout: `mode: payment`, prikupljanje email-a ostaje uključeno radi Stripe potvrda (ne koristi se u app-u).
- `success_url`: `https://app/success?session_id={CHECKOUT_SESSION_ID}`; `cancel_url`: `https://app/cancel`.

## Validacija
- Testovi za `TokenStore` (inicijalni saldo, dekrement, povećanje). 
- Manualni tok: kupovina → povratak → `session_id` verifikovan → saldo uvećan; preuzimanje troši 1 token.
- Rješavanje grešaka: koristiti `https` u produkciji; provjeriti ekstenzije/blokere ako se pojavi mrežni `ERR_ABORTED`.

## Integracija u postojeći kod
- UI: `App.jsx` (dugme + badge), novi modal u `src/components/TokensModal.jsx`.
- Logika potrošnje: `RunForm.jsx`.
- Utility: `src/utils/TokenStore.js`.

## Koraci implementacije
1. Dodati minimalni backend (Express + Stripe) sa `checkout/session` i `checkout/verify` endpointima.
2. Kreirati Stripe proizvode/cijene (USD: 2/4/9/15) sa `token_amount` metapodacima (5/10/25/50).
3. Napraviti `TokenStore`, `TokenBadge`, `BuyTokensButton`, `TokensModal` i povezati u `App.jsx`.
4. Ugraditi provjere/potrošnju tokena u `RunForm.jsx`.
5. Dodati testove i izvršiti end-to-end probu.

Ako je ovo ok, krenuću sa implementacijom odmah.
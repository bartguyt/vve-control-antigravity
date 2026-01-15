# Member Management Documentation

## Overzicht
De Member Module beheert alle leden van de VvE. Het ondersteunt verschillende rollen, financiële koppelingen en statusbeheer.

## Features

### 1. Ledenlijst
- **Weergave**: Lijst van voornaam, achternaam, adres, email en rol.
- **Zoeken**: Filter op naam, adres of email.
- **Bulk Acties**: Selecteer meerdere leden om ze tegelijk te verwijderen.
- **Veiligheid**:
    - Leden met gekoppelde banktransacties kunnen **niet** verwijderd worden.
    - Een schild-icoon toont aan wanneer verwijderen niet mogelijk is.

### 2. Instellingen (`/members/settings`)
- Gebruikers kunnen zelf bepalen welke kolommen zichtbaar zijn.
- De volgorde van kolommen kan worden aangepast.
- Instellingen worden lokaal opgeslagen (per browser).

### 3. Lid Detail (`/members/:id`)
- Toont NAW-gegevens.
- Toont gekoppelde IBAN-rekeningen.
- Toont betalingsgeschiedenis (transacties).

## Technische Implementatie

### Database
- `profiles`: Hoofdtabel voor leden.
- `vve_memberships`: Koppelt users aan VvE's met een rol (admin, bestuur, lid).
- `bank_transactions`: Heeft een `linked_member_id` foreign key.

### Safe Delete Logic
Bij het verwijderen (enkel of bulk) checkt de `memberService` eerst of er `bank_transactions` zijn met dit `linked_member_id`.
- Als `count > 0`: Verwijderen geblokkeerd.
- Als `count == 0`: Verwijderen toegestaan (cascade delete voor memberships/ibans).

### Rollen
- **Admin/Super Admin**: Volledige toegang.
- **Bestuur**: Kan leden beheren.
- **Lid**: Kan alleen eigen gegevens zien (in theorie, momenteel RLS filter).

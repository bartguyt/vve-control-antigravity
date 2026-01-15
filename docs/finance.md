# Finance & Kascommissie Documentation

## Overzicht
De Financiële module koppelt banktransacties aan leden en maakt het mogelijk voor de Kascommissie om de administratie te controleren.

## Features

### 1. Bank Koppeling (Mock)
- Simuleert een bank connectie (Bunq/ING/Rabobank).
- Genereert random transacties en rekeningen.
- Ondersteunt Betaal- en Spaarrekeningen.

### 2. Transacties Koppelen
- In het Bank Overzicht kunnen transacties handmatig aan een lid worden gekoppeld.
- Gekoppelde transacties zijn zichtbaar op de detailpagina van het lid.

### 3. Veiligheid & Integriteit
- Een lid kan niet worden verwijderd zolang er financiële transacties aan gekoppeld zijn.
- Dit garandeert dat de boekhouding compleet blijft, zelfs als een lid verhuist.
- Om een lid te verwijderen moet eerst de financiële historie worden "ontkoppeld" of gearchiveerd (toekomstige feature).

## Technische Implementatie

### Database
- `bank_connections`: OAuth koppeling met bank.
- `bank_accounts`: Rekeningen onder een koppeling.
- `bank_transactions`: De mutaties.
    - `linked_member_id`: FK naar `profiles.id`.

### Services
- `bankService`: Voert de mock-logica uit en beheert de tabellen.
- `memberService`: Beheert de checks op transacties.

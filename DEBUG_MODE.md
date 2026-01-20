# Debug Mode Gebruikshandleiding

## Wat is Debug Mode?

Debug mode is een systeeminstelling die bepaalt of console logging actief is. Wanneer debug mode **UIT** staat, worden alle debug logs onderdrukt voor betere performance en een schonere console.

## Debug Mode In-/Uitschakelen

### Via Browser Console

Open de browser console (F12) en typ:

```javascript
// Debug mode INSCHAKELEN
debugUtils.enable()

// Debug mode UITSCHAKELEN  
debugUtils.disable()

// Status checken
debugUtils.isDebugEnabled()
```

### Via LocalStorage

Debug mode wordt opgeslagen in `localStorage` onder de key `vve_debug_mode`.

## Wat wordt gelogd?

Wanneer debug mode **AAN** staat, worden de volgende logs getoond:

### ContributionsPage
- Aantal payment records
- PaidByMember map size
- Sample payments (eerste 5)
- Contribution calculations

### ContributionService
- Orphaned member warnings
- Missing contribution creation logs

### BankService
- Partial payment warnings
- Insufficient amount warnings

## Voor Ontwikkelaars

### Gebruik in Code

```typescript
import { debugUtils } from '../../utils/debugUtils';

// In plaats van console.log
debugUtils.log('Debug info');

// In plaats van console.warn
debugUtils.warn('Warning message');

// Errors worden ALTIJD getoond (ook zonder debug mode)
debugUtils.error('Error message');

// Grouped logs
debugUtils.groupCollapsed('Group title');
debugUtils.log('Detail 1');
debugUtils.log('Detail 2');
debugUtils.groupEnd();
```

### Best Practices

1. **Gebruik `debugUtils.log()` voor debug informatie** die alleen tijdens development nuttig is
2. **Gebruik `debugUtils.warn()` voor waarschuwingen** die niet kritiek zijn
3. **Gebruik `debugUtils.error()` voor echte errors** - deze worden altijd getoond
4. **Gebruik `console.error()` NIET direct** - gebruik altijd `debugUtils.error()`

## Standaard Instelling

Debug mode is standaard **UIT** voor productie. Ontwikkelaars kunnen het lokaal aanzetten wanneer nodig.

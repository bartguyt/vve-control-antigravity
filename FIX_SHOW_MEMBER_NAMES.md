# FIX: Toon Lid Naam in Bank Transacties

## Probleem
Na het koppelen van een transactie aan een lid, toont de Bank pagina "Lid" in plaats van de naam van het lid.

## Oorzaak
De `getTransactions` query in `bankService.ts` haalt alleen `*` op van `bank_transactions`, zonder de gekoppelde profile informatie.

## Oplossing
Wijzig regel 284 in `src/features/finance/bankService.ts`:

**Van:**
```typescript
.select('*')
```

**Naar:**
```typescript
.select(`
    *,
    linked_member:profiles(id, first_name, last_name, email)
`)
```

## Volledige Functie (na wijziging):
```typescript
// 5. Get Transactions (Fetch from DB)
async getTransactions(accountId: string) {
    const { data } = await supabase
        .from('bank_transactions')
        .select(`
            *,
            linked_member:profiles(id, first_name, last_name, email)
        `)
        .eq('account_id', accountId)
        .order('booking_date', { ascending: false });

    return data || [];
},
```

## Resultaat
De Bank pagina zal nu de naam van het gekoppelde lid tonen (bijv. "Bart Guijt") in plaats van het generieke label "Lid".

export interface EnableBankingAccount {
    uid?: string; // Internal ID
    resourceId: string;
    name: string;
    cashAccountType: string;
    currency: string;
    usage?: string;
    bicFi?: string;
    psuStatus?: string;
}

export interface EnableBankingTransaction {
    entryReference: string;
    transactionAmount: {
        currency: string;
        amount: string;
    };
    creditor?: {
        name: string;
    };
    debtor?: {
        name: string;
    };
    creditDebitIndicator: 'CRDT' | 'DBIT';
    status: string;
    bookingDate: string;
    valueDate?: string;
    remittanceInformation: string[];

    // Aliases for DB/API compatibility (snake_case)
    entry_reference?: string;
    transaction_amount?: {
        currency: string;
        amount: string;
    };
    credit_debit_indicator?: 'CRDT' | 'DBIT';
    booking_date?: string;
    remittance_information?: string[];
}

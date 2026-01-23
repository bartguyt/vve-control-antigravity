/**
 * Mock Banking Provider Adapter
 *
 * Implements IBankingProvider with fake data for development and testing.
 * Does NOT require an Edge Function or external API.
 */

import type { IBankingProvider } from '../ports';
import type {
  BankInfo,
  BankAccount,
  BankConnection,
  AuthInitResult,
  AuthCallbackResult,
  SyncOptions,
  CreateTransactionParams,
} from '../types';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_BANKS: BankInfo[] = [
  {
    id: 'mock_rabobank',
    name: 'Mock Rabobank',
    country: 'NL',
    bic: 'RABONL2U',
  },
  {
    id: 'mock_ing',
    name: 'Mock ING Bank',
    country: 'NL',
    bic: 'INGBNL2A',
  },
  {
    id: 'mock_abn',
    name: 'Mock ABN AMRO',
    country: 'NL',
    bic: 'ABNANL2A',
  },
];

const MOCK_ACCOUNTS: Record<string, Array<{ uid: string; name: string; iban: string }>> = {
  mock_rabobank: [
    { uid: 'rabo_checking', name: 'Lopende Rekening', iban: 'NL91RABO0123456789' },
    { uid: 'rabo_savings', name: 'Spaarrekening', iban: 'NL91RABO0987654321' },
  ],
  mock_ing: [
    { uid: 'ing_main', name: 'Betaalrekening', iban: 'NL20INGB0001234567' },
  ],
  mock_abn: [
    { uid: 'abn_main', name: 'Zakelijke Rekening', iban: 'NL12ABNA0123456789' },
    { uid: 'abn_reserve', name: 'Reservefonds', iban: 'NL12ABNA0987654321' },
  ],
};

// Member names for realistic transactions
const MEMBER_NAMES = [
  'Familie De Vries',
  'J. Jansen',
  'Mw. Bakker',
  'Dhr. van der Berg',
  'Familie Mulder',
  'P.H. de Groot',
  'M. Visser',
  'K.L. Smit',
];

const EXPENSE_DESCRIPTIONS = [
  'Schoonmaakkosten januari',
  'Onderhoud lift',
  'Tuinonderhoud',
  'Glasverzekering',
  'Energie gemeenschappelijke ruimtes',
  'Reparatie intercom',
  'Schilderwerk trappenhuis',
  'WA-verzekering gebouw',
];

// ============================================================================
// ADAPTER IMPLEMENTATION
// ============================================================================

export class MockBankingAdapter implements IBankingProvider {
  readonly providerId = 'mock';
  readonly providerName = 'Mock Banking (Development)';
  readonly supportsOAuth = false;
  readonly supportsSync = true;

  private pendingConnections: Map<
    string,
    { bankId: string; associationId: string }
  > = new Map();

  // ==========================================================================
  // BANK DISCOVERY
  // ==========================================================================

  async getAvailableBanks(_country: string): Promise<BankInfo[]> {
    // Mock adapter returns same banks regardless of country
    return [...MOCK_BANKS];
  }

  // ==========================================================================
  // AUTHENTICATION (Simulated)
  // ==========================================================================

  async initAuth(
    bankId: string,
    redirectUri: string,
    associationId: string
  ): Promise<AuthInitResult> {
    // Generate a fake auth code
    const state = `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Store pending connection
    this.pendingConnections.set(state, { bankId, associationId });

    // For mock, we redirect immediately with a code
    const authUrl = `${redirectUri}?code=${state}&state=mock`;

    return {
      authUrl,
      state,
      metadata: { bankId, associationId },
    };
  }

  async handleCallback(
    code: string,
    associationId: string
  ): Promise<AuthCallbackResult> {
    // Find pending connection or use code as bank lookup
    const pending = this.pendingConnections.get(code);
    const bankId = pending?.bankId || 'mock_rabobank';

    // Clean up pending
    this.pendingConnections.delete(code);

    // Find bank info
    const bank = MOCK_BANKS.find((b) => b.id === bankId) || MOCK_BANKS[0];
    const accountDefs = MOCK_ACCOUNTS[bankId] || MOCK_ACCOUNTS.mock_rabobank;

    // Generate session ID
    const sessionId = `mock_session_${Date.now()}`;

    // Expires in 90 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const connection: BankConnection = {
      id: '',
      associationId,
      provider: 'mock',
      providerConnectionId: sessionId,
      status: 'active',
      bankName: bank.name,
      bankId: bank.id,
      expiresAt,
      lastSyncedAt: null,
      metadata: { bank },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const accounts: BankAccount[] = accountDefs.map((acc) => ({
      id: '',
      associationId,
      connectionId: '',
      externalAccountUid: acc.uid,
      name: acc.name,
      iban: acc.iban,
      bic: bank.bic || null,
      accountType: acc.name.toLowerCase().includes('spaar') ? 'SAVINGS' : 'CHECKING',
      currency: 'EUR',
      balance: this.randomBalance(),
      balanceDate: new Date(),
      isActive: true,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return { connection, accounts };
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  async checkConnectionStatus(
    _connectionId: string
  ): Promise<{ isValid: boolean; expiresAt: Date | null; needsReauth: boolean }> {
    // Mock connections are always valid
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    return {
      isValid: true,
      expiresAt,
      needsReauth: false,
    };
  }

  async revokeConnection(_connectionId: string): Promise<void> {
    // Mock - nothing to revoke
    console.log('Mock connection revoked');
  }

  // ==========================================================================
  // ACCOUNT OPERATIONS
  // ==========================================================================

  async getAccounts(connectionId: string): Promise<BankAccount[]> {
    // For mock, we just return the same accounts with updated balances
    return MOCK_ACCOUNTS.mock_rabobank.map((acc) => ({
      id: '',
      associationId: '',
      connectionId,
      externalAccountUid: acc.uid,
      name: acc.name,
      iban: acc.iban,
      bic: 'RABONL2U',
      accountType: acc.name.toLowerCase().includes('spaar') ? 'SAVINGS' as const : 'CHECKING' as const,
      currency: 'EUR',
      balance: this.randomBalance(),
      balanceDate: new Date(),
      isActive: true,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  // ==========================================================================
  // TRANSACTION OPERATIONS
  // ==========================================================================

  async fetchTransactions(
    _connectionId: string,
    _accountUid: string,
    options?: SyncOptions
  ): Promise<CreateTransactionParams[]> {
    const dateFrom = options?.dateFrom || this.getDateMonthsAgo(3);
    const dateTo = options?.dateTo || new Date();

    // Generate realistic mock transactions
    return this.generateMockTransactions(dateFrom, dateTo);
  }

  // ==========================================================================
  // MOCK DATA GENERATORS
  // ==========================================================================

  private generateMockTransactions(
    dateFrom: Date,
    dateTo: Date
  ): CreateTransactionParams[] {
    const transactions: CreateTransactionParams[] = [];
    const currentDate = new Date(dateFrom);

    while (currentDate <= dateTo) {
      // Generate 2-5 transactions per day
      const txCount = Math.floor(Math.random() * 4) + 2;

      for (let i = 0; i < txCount; i++) {
        const isCredit = Math.random() > 0.4; // 60% credits (contributions)

        if (isCredit) {
          // Member contribution
          const memberName =
            MEMBER_NAMES[Math.floor(Math.random() * MEMBER_NAMES.length)];
          const amount = this.randomContributionAmount();

          transactions.push({
            bankAccountId: '',
            externalReference: this.generateRef(currentDate, i),
            bookingDate: new Date(currentDate),
            valueDate: new Date(currentDate),
            amount,
            currency: 'EUR',
            creditDebit: 'CRDT',
            counterpartyName: memberName,
            counterpartyIban: this.generateFakeIban(),
            description: `Maandelijkse bijdrage ${currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`,
            status: 'BOOK',
            rawData: { mock: true },
          });
        } else {
          // Expense
          const description =
            EXPENSE_DESCRIPTIONS[
              Math.floor(Math.random() * EXPENSE_DESCRIPTIONS.length)
            ];
          const amount = this.randomExpenseAmount();

          transactions.push({
            bankAccountId: '',
            externalReference: this.generateRef(currentDate, i),
            bookingDate: new Date(currentDate),
            valueDate: new Date(currentDate),
            amount,
            currency: 'EUR',
            creditDebit: 'DBIT',
            counterpartyName: this.generateSupplierName(),
            counterpartyIban: this.generateFakeIban(),
            description,
            status: 'BOOK',
            rawData: { mock: true },
          });
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return transactions;
  }

  private randomBalance(): number {
    return Math.round((Math.random() * 50000 + 5000) * 100) / 100;
  }

  private randomContributionAmount(): number {
    // Common VVE contribution amounts
    const amounts = [125, 150, 175, 200, 225, 250, 300];
    return amounts[Math.floor(Math.random() * amounts.length)];
  }

  private randomExpenseAmount(): number {
    return Math.round((Math.random() * 2000 + 100) * 100) / 100;
  }

  private generateRef(date: Date, index: number): string {
    return `MOCK_${date.toISOString().split('T')[0].replace(/-/g, '')}_${index}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateFakeIban(): string {
    const banks = ['RABO', 'INGB', 'ABNA'];
    const bank = banks[Math.floor(Math.random() * banks.length)];
    const num = Math.floor(Math.random() * 9999999999)
      .toString()
      .padStart(10, '0');
    return `NL${Math.floor(Math.random() * 90 + 10)}${bank}${num}`;
  }

  private generateSupplierName(): string {
    const suppliers = [
      'Schoonmaakbedrijf De Glans',
      'Technisch Bureau Smit',
      'Groenbeheer Nederland',
      'Verzekeringen Direct',
      'Energie Collectief',
      'Liftservice BV',
      'Schildersbedrijf Kleur & Co',
    ];
    return suppliers[Math.floor(Math.random() * suppliers.length)];
  }

  private getDateMonthsAgo(months: number): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  }
}

/**
 * Factory function
 */
export function createMockBankingAdapter(): IBankingProvider {
  return new MockBankingAdapter();
}

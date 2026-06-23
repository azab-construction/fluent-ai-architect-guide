export type FinanceDirection = 'incoming' | 'outgoing';
export type FinanceTransactionStatus = 'draft' | 'issued' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export interface FinanceTransaction {
  id?: string;
  source: 'manual' | 'daftra' | 'import' | 'agent';
  direction: FinanceDirection;
  document_type: 'invoice' | 'receipt' | 'expense' | 'bill' | 'payment' | 'journal' | 'entry';
  document_no?: string | null;
  party_name?: string | null;
  party_type?: 'customer' | 'supplier' | 'employee' | 'owner' | 'other' | null;
  tx_date: string;
  due_date?: string | null;
  currency: string;
  subtotal: number;
  tax: number;
  discount: number;
  total?: number;
  paid_amount: number;
  status: FinanceTransactionStatus;
  account_code?: string | null;
  category?: string | null;
  cost_center?: string | null;
  project_ref?: string | null;
  description?: string | null;
  daftra_id?: string | null;
  daftra_payload?: Record<string, unknown>;
  attachments?: unknown[];
  created_at?: string;
  updated_at?: string;
}

export interface DaftraIntegration {
  id?: string;
  integration_key: string;
  display_name: string;
  base_url?: string | null;
  tenant_name?: string | null;
  account_identifier?: string | null;
  auth_type: string;
  secret_refs: Record<string, unknown>;
  endpoint_map: Record<string, unknown>;
  sync_config: Record<string, unknown>;
  last_sync_at?: string | null;
  last_health_status?: string | null;
  last_health_message?: string | null;
  is_enabled: boolean;
}

export interface FinanceStatement {
  id?: string;
  statement_key: string;
  statement_type: 'income_statement' | 'cash_flow' | 'balance_sheet' | 'trial_balance' | 'executive_report';
  period_start?: string | null;
  period_end?: string | null;
  currency: string;
  source: 'manual' | 'daftra' | 'agent' | 'import';
  data: Record<string, unknown>;
  narrative_report?: string | null;
  agent_model_id?: string | null;
  agent_deployment_name?: string | null;
  log_id?: string | null;
  created_at?: string;
}

export interface FinanceSummary {
  incoming: number;
  outgoing: number;
  net: number;
  receivables: number;
  payables: number;
  paidIncoming: number;
  paidOutgoing: number;
  countIncoming: number;
  countOutgoing: number;
}

export const EMPTY_TRANSACTION: FinanceTransaction = {
  source: 'manual',
  direction: 'incoming',
  document_type: 'invoice',
  tx_date: new Date().toISOString().slice(0, 10),
  currency: 'EGP',
  subtotal: 0,
  tax: 0,
  discount: 0,
  paid_amount: 0,
  status: 'draft',
  party_type: 'customer',
  daftra_payload: {},
  attachments: [],
};

export function computeTransactionTotal(tx: Pick<FinanceTransaction, 'subtotal' | 'tax' | 'discount' | 'total'>): number {
  if (typeof tx.total === 'number') return tx.total;
  return Number(tx.subtotal || 0) + Number(tx.tax || 0) - Number(tx.discount || 0);
}

export function summarizeFinance(transactions: FinanceTransaction[]): FinanceSummary {
  return transactions.reduce<FinanceSummary>((acc, tx) => {
    const total = computeTransactionTotal(tx);
    const paid = Number(tx.paid_amount || 0);
    if (tx.direction === 'incoming') {
      acc.incoming += total;
      acc.paidIncoming += paid;
      acc.receivables += Math.max(total - paid, 0);
      acc.countIncoming += 1;
    } else {
      acc.outgoing += total;
      acc.paidOutgoing += paid;
      acc.payables += Math.max(total - paid, 0);
      acc.countOutgoing += 1;
    }
    acc.net = acc.incoming - acc.outgoing;
    return acc;
  }, {
    incoming: 0,
    outgoing: 0,
    net: 0,
    receivables: 0,
    payables: 0,
    paidIncoming: 0,
    paidOutgoing: 0,
    countIncoming: 0,
    countOutgoing: 0,
  });
}

export function buildFinanceAgentPrompt(transactions: FinanceTransaction[], notes?: string): string {
  const summary = summarizeFinance(transactions);
  const rows = transactions.slice(0, 200).map(tx => ({
    direction: tx.direction,
    type: tx.document_type,
    no: tx.document_no,
    party: tx.party_name,
    date: tx.tx_date,
    category: tx.category,
    total: computeTransactionTotal(tx),
    paid: tx.paid_amount,
    status: tx.status,
    source: tx.source,
  }));

  return `أنت وكيل مالية العزب المتصل بسياق az-finance / gpt-5.1. حلل الصادر والوارد والقوائم المالية التالية.

المطلوب:
1. قائمة دخل مبسطة.
2. موقف التدفقات النقدية.
3. الذمم المدينة والدائنة.
4. مؤشرات مالية وتشغيلية.
5. توصيات تنفيذية قصيرة.
6. تنبيهات مخاطر إن وجدت.

ملخص رقمي:
${JSON.stringify(summary, null, 2)}

الحركات:
${JSON.stringify(rows, null, 2)}

ملاحظات المستخدم:
${notes || 'لا توجد ملاحظات.'}`;
}

export function formatMoney(value: number, currency = 'EGP'): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

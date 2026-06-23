import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  buildFinanceAgentPrompt,
  computeTransactionTotal,
  EMPTY_TRANSACTION,
  formatMoney,
  summarizeFinance,
  type DaftraIntegration,
  type FinanceStatement,
  type FinanceTransaction,
  type FinanceDirection,
} from '@/lib/finance-module';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Building2,
  Calculator,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Wallet,
} from 'lucide-react';

const statusOptions = ['draft', 'issued', 'paid', 'partial', 'overdue', 'cancelled'];
const documentTypes = ['invoice', 'receipt', 'expense', 'bill', 'payment', 'journal', 'entry'];

function numberInput(value: number | undefined, fallback = 0): string {
  return String(value ?? fallback);
}

function safeJson(value: unknown): string {
  return JSON.stringify(value || {}, null, 2);
}

function parseObject(value: string, label: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${label} يجب أن يكون JSON object`);
  return parsed as Record<string, unknown>;
}

const FinanceModule = () => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [daftra, setDaftra] = useState<DaftraIntegration | null>(null);
  const [daftraSecrets, setDaftraSecrets] = useState('{}');
  const [daftraEndpoints, setDaftraEndpoints] = useState('{}');
  const [daftraSync, setDaftraSync] = useState('{}');
  const [form, setForm] = useState<FinanceTransaction>(EMPTY_TRANSACTION);
  const [loading, setLoading] = useState(false);
  const [savingTx, setSavingTx] = useState(false);
  const [savingDaftra, setSavingDaftra] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentNotes, setAgentNotes] = useState('ركز على الربحية، التدفقات النقدية، الذمم المدينة والدائنة، وأي مخاطر تشغيلية.');
  const [agentReport, setAgentReport] = useState('');

  const summary = useMemo(() => summarizeFinance(transactions), [transactions]);
  const incoming = useMemo(() => transactions.filter(tx => tx.direction === 'incoming'), [transactions]);
  const outgoing = useMemo(() => transactions.filter(tx => tx.direction === 'outgoing'), [transactions]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: txRows, error: txErr }, { data: stRows, error: stErr }, { data: dfRows, error: dfErr }] = await Promise.all([
        (supabase as any).from('finance_transactions').select('*').order('tx_date', { ascending: false }).limit(250),
        (supabase as any).from('finance_statements').select('*').order('created_at', { ascending: false }).limit(20),
        (supabase as any).from('finance_daftra_integrations').select('*').eq('integration_key', 'daftra.primary').maybeSingle(),
      ]);
      if (txErr) throw txErr;
      if (stErr) throw stErr;
      if (dfErr) throw dfErr;
      setTransactions((txRows || []) as FinanceTransaction[]);
      setStatements((stRows || []) as FinanceStatement[]);
      if (dfRows) {
        const row = dfRows as DaftraIntegration;
        setDaftra(row);
        setDaftraSecrets(safeJson(row.secret_refs));
        setDaftraEndpoints(safeJson(row.endpoint_map));
        setDaftraSync(safeJson(row.sync_config));
      }
    } catch (e: any) {
      toast({ title: 'فشل تحميل بيانات المالية', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const updateForm = (key: keyof FinanceTransaction, value: string | number | null) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const setDirection = (direction: FinanceDirection) => {
    setForm(prev => ({
      ...prev,
      direction,
      document_type: direction === 'incoming' ? 'invoice' : 'expense',
      party_type: direction === 'incoming' ? 'customer' : 'supplier',
    }));
  };

  const saveTransaction = async () => {
    setSavingTx(true);
    try {
      const payload = {
        source: form.source,
        direction: form.direction,
        document_type: form.document_type,
        document_no: form.document_no || null,
        party_name: form.party_name || null,
        party_type: form.party_type || 'other',
        tx_date: form.tx_date,
        due_date: form.due_date || null,
        currency: form.currency || 'EGP',
        subtotal: Number(form.subtotal || 0),
        tax: Number(form.tax || 0),
        discount: Number(form.discount || 0),
        paid_amount: Number(form.paid_amount || 0),
        status: form.status,
        account_code: form.account_code || null,
        category: form.category || null,
        cost_center: form.cost_center || null,
        project_ref: form.project_ref || null,
        description: form.description || null,
        daftra_id: form.daftra_id || null,
        daftra_payload: form.daftra_payload || {},
        attachments: form.attachments || [],
      };
      const { error } = await (supabase as any).from('finance_transactions').insert(payload);
      if (error) throw error;
      toast({ title: 'تم حفظ الحركة المالية' });
      setForm(EMPTY_TRANSACTION);
      await loadData();
    } catch (e: any) {
      toast({ title: 'فشل حفظ الحركة', description: e.message, variant: 'destructive' });
    } finally {
      setSavingTx(false);
    }
  };

  const saveDaftra = async () => {
    setSavingDaftra(true);
    try {
      const payload = {
        integration_key: 'daftra.primary',
        display_name: daftra?.display_name || 'Daftra Primary',
        base_url: daftra?.base_url || null,
        tenant_name: daftra?.tenant_name || null,
        account_identifier: daftra?.account_identifier || null,
        auth_type: daftra?.auth_type || 'server_secret',
        secret_refs: parseObject(daftraSecrets, 'secret_refs'),
        endpoint_map: parseObject(daftraEndpoints, 'endpoint_map'),
        sync_config: parseObject(daftraSync, 'sync_config'),
        is_enabled: daftra?.is_enabled ?? true,
      };
      const { error } = await (supabase as any)
        .from('finance_daftra_integrations')
        .upsert(payload, { onConflict: 'integration_key' });
      if (error) throw error;
      toast({ title: 'تم حفظ إعدادات دفترة' });
      await loadData();
    } catch (e: any) {
      toast({ title: 'فشل حفظ إعدادات دفترة', description: e.message, variant: 'destructive' });
    } finally {
      setSavingDaftra(false);
    }
  };

  const runFinanceAgent = async () => {
    if (!transactions.length) {
      toast({ title: 'لا توجد حركات مالية للتحليل', variant: 'destructive' });
      return;
    }
    setAgentLoading(true);
    setAgentReport('');
    try {
      const financePrompt = buildFinanceAgentPrompt(transactions, agentNotes);
      const { data, error } = await supabase.functions.invoke('azure-ai-chat', {
        body: {
          task: 'finance-module:statements',
          model: 'gpt-5.1',
          deployment: 'az-finance',
          temperature: 0.2,
          max_tokens: 2500,
          messages: [
            {
              role: 'system',
              content: 'أنت وكيل مالية محترف للعزب. أجب بالعربية، وقدم قوائم مالية منظمة، مؤشرات، مخاطر، وتوصيات تنفيذية قابلة للتطبيق.',
            },
            { role: 'user', content: financePrompt },
          ],
        },
      });
      if (error) throw error;
      const content = data?.content || 'لا توجد استجابة';
      setAgentReport(content);

      const statementPayload = {
        statement_key: `finance-agent-${Date.now()}`,
        statement_type: 'executive_report',
        period_start: transactions[transactions.length - 1]?.tx_date || null,
        period_end: transactions[0]?.tx_date || null,
        currency: transactions[0]?.currency || 'EGP',
        source: 'agent',
        data: { summary, sample_size: transactions.length },
        narrative_report: content,
        agent_model_id: 'gpt-5.1',
        agent_deployment_name: 'az-finance',
        log_id: data?.log_id || null,
      };
      await (supabase as any).from('finance_statements').insert(statementPayload);
      await loadData();
    } catch (e: any) {
      toast({ title: 'فشل تشغيل وكيل المالية', description: e.message, variant: 'destructive' });
    } finally {
      setAgentLoading(false);
    }
  };

  const TransactionTable = ({ rows }: { rows: FinanceTransaction[] }) => (
    <div className="space-y-2">
      {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">لا توجد حركات بعد</Card>}
      {rows.map(tx => (
        <div key={tx.id || `${tx.document_no}-${tx.tx_date}`} className="p-3 rounded-md border grid gap-2 md:grid-cols-[1fr_130px_130px_110px] items-center">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{tx.party_name || 'بدون جهة'}</p>
              <Badge variant="outline" dir="ltr">{tx.document_type}</Badge>
              <Badge variant={tx.source === 'daftra' ? 'default' : 'secondary'} dir="ltr">{tx.source}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{tx.description || tx.category || '—'}</p>
            <p className="text-[11px] text-muted-foreground" dir="ltr">{tx.document_no || 'no-doc'} · {tx.tx_date}</p>
          </div>
          <div className="text-sm font-bold" dir="ltr">{formatMoney(computeTransactionTotal(tx), tx.currency)}</div>
          <div className="text-xs text-muted-foreground" dir="ltr">paid {formatMoney(tx.paid_amount || 0, tx.currency)}</div>
          <Badge variant={tx.status === 'paid' ? 'default' : 'outline'}>{tx.status}</Badge>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary/15 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">موديول المالية المخصص</h1>
                <p className="text-xs text-muted-foreground">دفترة · الصادر · الوارد · القوائم المالية · وكيل az-finance / gpt-5.1</p>
              </div>
            </div>
            <Button onClick={loadData} disabled={loading} variant="outline" size="sm">
              {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-2" />}
              تحديث
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">الوارد</p><p className="text-xl font-bold" dir="ltr">{formatMoney(summary.incoming)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">الصادر</p><p className="text-xl font-bold" dir="ltr">{formatMoney(summary.outgoing)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">الصافي</p><p className="text-xl font-bold" dir="ltr">{formatMoney(summary.net)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">ذمم مدينة</p><p className="text-xl font-bold" dir="ltr">{formatMoney(summary.receivables)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">ذمم دائنة</p><p className="text-xl font-bold" dir="ltr">{formatMoney(summary.payables)}</p></CardContent></Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">لوحة</TabsTrigger>
              <TabsTrigger value="daftra">دفترة</TabsTrigger>
              <TabsTrigger value="entry">إدخال</TabsTrigger>
              <TabsTrigger value="incoming">الوارد</TabsTrigger>
              <TabsTrigger value="outgoing">الصادر</TabsTrigger>
              <TabsTrigger value="statements">القوائم</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Bot className="w-5 h-5" />وكيل المالية</CardTitle>
                  <CardDescription>مرتبط بسياق Azure المالي: gpt-5.1 / az-finance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea value={agentNotes} onChange={e => setAgentNotes(e.target.value)} rows={4} />
                  <Button onClick={runFinanceAgent} disabled={agentLoading || !transactions.length} className="w-full">
                    {agentLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
                    تشغيل وكيل المالية
                  </Button>
                  {agentReport && <div className="p-4 rounded-md border text-sm whitespace-pre-wrap max-h-96 overflow-auto">{agentReport}</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Database className="w-5 h-5" />حالة البيانات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-md bg-muted/40"><p className="text-xs text-muted-foreground">حركات وارد</p><p className="font-bold">{summary.countIncoming}</p></div>
                    <div className="p-3 rounded-md bg-muted/40"><p className="text-xs text-muted-foreground">حركات صادر</p><p className="font-bold">{summary.countOutgoing}</p></div>
                    <div className="p-3 rounded-md bg-muted/40"><p className="text-xs text-muted-foreground">تقارير محفوظة</p><p className="font-bold">{statements.length}</p></div>
                    <div className="p-3 rounded-md bg-muted/40"><p className="text-xs text-muted-foreground">دفترة</p><p className="font-bold">{daftra?.is_enabled ? 'مفعل' : 'غير مفعل'}</p></div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="daftra">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-5 h-5" />ربط دفترة</CardTitle>
                  <CardDescription>لا تحفظ مفتاح API الخام هنا. خزّن اسم السر فقط داخل secret_refs، وضع المفتاح في Supabase Secrets.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1"><Label>Base URL</Label><Input dir="ltr" value={daftra?.base_url || ''} onChange={e => setDaftra(prev => ({ ...(prev || { integration_key: 'daftra.primary', display_name: 'Daftra Primary', auth_type: 'server_secret', secret_refs: {}, endpoint_map: {}, sync_config: {}, is_enabled: true }), base_url: e.target.value }))} placeholder="https://..." /></div>
                    <div className="space-y-1"><Label>Tenant</Label><Input dir="ltr" value={daftra?.tenant_name || ''} onChange={e => setDaftra(prev => ({ ...(prev || { integration_key: 'daftra.primary', display_name: 'Daftra Primary', auth_type: 'server_secret', secret_refs: {}, endpoint_map: {}, sync_config: {}, is_enabled: true }), tenant_name: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Account Identifier</Label><Input dir="ltr" value={daftra?.account_identifier || ''} onChange={e => setDaftra(prev => ({ ...(prev || { integration_key: 'daftra.primary', display_name: 'Daftra Primary', auth_type: 'server_secret', secret_refs: {}, endpoint_map: {}, sync_config: {}, is_enabled: true }), account_identifier: e.target.value }))} /></div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1"><Label>Auth Type</Label><Input dir="ltr" value={daftra?.auth_type || 'server_secret'} onChange={e => setDaftra(prev => ({ ...(prev || { integration_key: 'daftra.primary', display_name: 'Daftra Primary', auth_type: 'server_secret', secret_refs: {}, endpoint_map: {}, sync_config: {}, is_enabled: true }), auth_type: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Status</Label><Input dir="ltr" readOnly value={daftra?.last_health_status || 'unknown'} /></div>
                    <div className="space-y-1"><Label>Enabled</Label><Button type="button" variant={daftra?.is_enabled ? 'default' : 'outline'} className="w-full" onClick={() => setDaftra(prev => ({ ...(prev || { integration_key: 'daftra.primary', display_name: 'Daftra Primary', auth_type: 'server_secret', secret_refs: {}, endpoint_map: {}, sync_config: {}, is_enabled: true }), is_enabled: !(prev?.is_enabled ?? true) }))}>{daftra?.is_enabled ? <CheckCircle2 className="w-4 h-4 ml-2" /> : null}{daftra?.is_enabled ? 'مفعل' : 'غير مفعل'}</Button></div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1"><Label>secret_refs</Label><Textarea dir="ltr" className="font-mono text-xs" value={daftraSecrets} onChange={e => setDaftraSecrets(e.target.value)} rows={8} /></div>
                    <div className="space-y-1"><Label>endpoint_map</Label><Textarea dir="ltr" className="font-mono text-xs" value={daftraEndpoints} onChange={e => setDaftraEndpoints(e.target.value)} rows={8} /></div>
                    <div className="space-y-1"><Label>sync_config</Label><Textarea dir="ltr" className="font-mono text-xs" value={daftraSync} onChange={e => setDaftraSync(e.target.value)} rows={8} /></div>
                  </div>
                  <Button onClick={saveDaftra} disabled={savingDaftra}>
                    {savingDaftra ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                    حفظ إعدادات دفترة
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="entry">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5" />إدخال حركة مالية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Button variant={form.direction === 'incoming' ? 'default' : 'outline'} onClick={() => setDirection('incoming')}><ArrowDownLeft className="w-4 h-4 ml-2" />وارد</Button>
                    <Button variant={form.direction === 'outgoing' ? 'default' : 'outline'} onClick={() => setDirection('outgoing')}><ArrowUpRight className="w-4 h-4 ml-2" />صادر</Button>
                    <div className="space-y-1"><Label>Document Type</Label><select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.document_type} onChange={e => updateForm('document_type', e.target.value)}>{documentTypes.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
                    <div className="space-y-1"><Label>Status</Label><select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.status} onChange={e => updateForm('status', e.target.value)}>{statusOptions.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1"><Label>Document No</Label><Input dir="ltr" value={form.document_no || ''} onChange={e => updateForm('document_no', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Party</Label><Input value={form.party_name || ''} onChange={e => updateForm('party_name', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Date</Label><Input dir="ltr" type="date" value={form.tx_date} onChange={e => updateForm('tx_date', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Due Date</Label><Input dir="ltr" type="date" value={form.due_date || ''} onChange={e => updateForm('due_date', e.target.value)} /></div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-5">
                    <div className="space-y-1"><Label>Subtotal</Label><Input dir="ltr" type="number" value={numberInput(form.subtotal)} onChange={e => updateForm('subtotal', Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label>Tax</Label><Input dir="ltr" type="number" value={numberInput(form.tax)} onChange={e => updateForm('tax', Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label>Discount</Label><Input dir="ltr" type="number" value={numberInput(form.discount)} onChange={e => updateForm('discount', Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label>Paid</Label><Input dir="ltr" type="number" value={numberInput(form.paid_amount)} onChange={e => updateForm('paid_amount', Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label>Total</Label><Input dir="ltr" readOnly value={formatMoney(computeTransactionTotal(form), form.currency)} /></div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1"><Label>Category</Label><Input value={form.category || ''} onChange={e => updateForm('category', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Cost Center</Label><Input value={form.cost_center || ''} onChange={e => updateForm('cost_center', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Project Ref</Label><Input value={form.project_ref || ''} onChange={e => updateForm('project_ref', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Daftra ID</Label><Input dir="ltr" value={form.daftra_id || ''} onChange={e => updateForm('daftra_id', e.target.value)} /></div>
                  </div>
                  <div className="space-y-1"><Label>Description</Label><Textarea value={form.description || ''} onChange={e => updateForm('description', e.target.value)} rows={3} /></div>
                  <Button onClick={saveTransaction} disabled={savingTx}>
                    {savingTx ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                    حفظ الحركة
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="incoming"><TransactionTable rows={incoming} /></TabsContent>
            <TabsContent value="outgoing"><TransactionTable rows={outgoing} /></TabsContent>

            <TabsContent value="statements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Calculator className="w-5 h-5" />القوائم المالية المحلية</CardTitle>
                  <CardDescription>حساب سريع من الحركات الحالية قبل تشغيل الوكيل.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div className="p-3 rounded-md bg-muted/40"><p className="text-xs text-muted-foreground">الإيرادات</p><p className="font-bold" dir="ltr">{formatMoney(summary.incoming)}</p></div>
                  <div className="p-3 rounded-md bg-muted/40"><p className="text-xs text-muted-foreground">المصروفات</p><p className="font-bold" dir="ltr">{formatMoney(summary.outgoing)}</p></div>
                  <div className="p-3 rounded-md bg-muted/40"><p className="text-xs text-muted-foreground">صافي الدخل</p><p className="font-bold" dir="ltr">{formatMoney(summary.net)}</p></div>
                  <div className="p-3 rounded-md bg-muted/40"><p className="text-xs text-muted-foreground">تشغيل داخل</p><p className="font-bold" dir="ltr">{formatMoney(summary.paidIncoming)}</p></div>
                  <div className="p-3 rounded-md bg-muted/40"><p className="text-xs text-muted-foreground">تشغيل خارج</p><p className="font-bold" dir="ltr">{formatMoney(summary.paidOutgoing)}</p></div>
                  <div className="p-3 rounded-md bg-muted/40"><p className="text-xs text-muted-foreground">صافي نقدي</p><p className="font-bold" dir="ltr">{formatMoney(summary.paidIncoming - summary.paidOutgoing)}</p></div>
                </CardContent>
              </Card>

              {statements.map(statement => (
                <Card key={statement.id || statement.statement_key}>
                  <CardHeader>
                    <CardTitle className="text-base">{statement.statement_type}</CardTitle>
                    <CardDescription dir="ltr">{statement.statement_key} · {statement.created_at}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statement.narrative_report && <div className="whitespace-pre-wrap text-sm leading-relaxed">{statement.narrative_report}</div>}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default FinanceModule;

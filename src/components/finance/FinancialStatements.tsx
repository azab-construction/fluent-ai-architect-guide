import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb } from 'lucide-react';

export interface FinanceReport {
  summary?: string;
  period?: string;
  currency?: string;
  income_statement?: {
    revenue?: Array<{ name: string; amount: number }>;
    expenses?: Array<{ name: string; amount: number }>;
    gross_profit?: number;
    operating_profit?: number;
    net_income?: number;
  };
  balance_sheet?: {
    assets?: Array<{ name: string; amount: number }>;
    liabilities?: Array<{ name: string; amount: number }>;
    equity?: Array<{ name: string; amount: number }>;
    total_assets?: number;
    total_liabilities_equity?: number;
  };
  cash_flow?: { operating?: number; investing?: number; financing?: number; net_change?: number };
  kpis?: Array<{ name: string; value: string; trend?: 'up' | 'down' | 'flat'; note?: string }>;
  alerts?: string[];
  recommendations?: string[];
  narrative_report_ar?: string;
  charts?: { expenses_pie?: string; revenue_bar?: string; flow?: string };
}

const fmt = (n?: number, cur = '') =>
  typeof n === 'number' ? `${n.toLocaleString('ar-EG')} ${cur}`.trim() : '—';

const TrendIcon: React.FC<{ t?: string }> = ({ t }) =>
  t === 'up' ? <TrendingUp className="w-4 h-4 text-success" /> :
  t === 'down' ? <TrendingDown className="w-4 h-4 text-destructive" /> :
  <Minus className="w-4 h-4 text-muted-foreground" />;

const ItemTable: React.FC<{ items?: Array<{ name: string; amount: number }>; cur: string }> = ({ items, cur }) => {
  if (!items?.length) return <p className="text-xs text-muted-foreground py-2">لا توجد بنود</p>;
  const total = items.reduce((s, i) => s + (i.amount || 0), 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right">البند</TableHead>
          <TableHead className="text-left">المبلغ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it, i) => (
          <TableRow key={i}>
            <TableCell className="text-right">{it.name}</TableCell>
            <TableCell className="text-left font-mono">{fmt(it.amount, cur)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-semibold bg-muted/30">
          <TableCell className="text-right">الإجمالي</TableCell>
          <TableCell className="text-left font-mono">{fmt(total, cur)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

export const FinancialStatements: React.FC<{ report: FinanceReport }> = ({ report }) => {
  const cur = report.currency || '';
  const inc = report.income_statement;
  const bs = report.balance_sheet;
  const cf = report.cash_flow;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-xl">الملخص التنفيذي</CardTitle>
              {report.period && <p className="text-xs text-muted-foreground mt-1">الفترة: {report.period}</p>}
            </div>
            {cur && <Badge variant="outline">العملة: {cur}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{report.summary || '—'}</p>
        </CardContent>
      </Card>

      {/* KPIs */}
      {report.kpis?.length ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {report.kpis.map((k, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{k.name}</p>
                <TrendIcon t={k.trend} />
              </div>
              <p className="text-xl font-bold mt-1 font-mono">{k.value}</p>
              {k.note && <p className="text-[11px] text-muted-foreground mt-1">{k.note}</p>}
            </Card>
          ))}
        </div>
      ) : null}

      {/* Alerts */}
      {report.alerts?.length ? (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <p className="font-medium mb-1">تنبيهات</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {report.alerts.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Income Statement */}
      <Card>
        <CardHeader><CardTitle>قائمة الدخل</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2 text-success">الإيرادات</h4>
            <ItemTable items={inc?.revenue} cur={cur} />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 text-destructive">المصروفات</h4>
            <ItemTable items={inc?.expenses} cur={cur} />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <KV label="إجمالي الربح" v={fmt(inc?.gross_profit, cur)} />
            <KV label="الربح التشغيلي" v={fmt(inc?.operating_profit, cur)} />
            <KV label="صافي الربح" v={fmt(inc?.net_income, cur)} highlight />
          </div>
        </CardContent>
      </Card>

      {/* Balance Sheet */}
      <Card>
        <CardHeader><CardTitle>قائمة المركز المالي</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">الأصول</h4>
            <ItemTable items={bs?.assets} cur={cur} />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">الالتزامات</h4>
            <ItemTable items={bs?.liabilities} cur={cur} />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">حقوق الملكية</h4>
            <ItemTable items={bs?.equity} cur={cur} />
          </div>
          <div className="md:col-span-3 grid grid-cols-2 gap-3 pt-3 border-t">
            <KV label="إجمالي الأصول" v={fmt(bs?.total_assets, cur)} />
            <KV label="إجمالي الالتزامات + حقوق الملكية" v={fmt(bs?.total_liabilities_equity, cur)} />
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow */}
      <Card>
        <CardHeader><CardTitle>قائمة التدفقات النقدية</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KV label="التشغيلية" v={fmt(cf?.operating, cur)} />
          <KV label="الاستثمارية" v={fmt(cf?.investing, cur)} />
          <KV label="التمويلية" v={fmt(cf?.financing, cur)} />
          <KV label="صافي التغير" v={fmt(cf?.net_change, cur)} highlight />
        </CardContent>
      </Card>

      {/* Recommendations */}
      {report.recommendations?.length ? (
        <Alert>
          <Lightbulb className="w-4 h-4" />
          <AlertDescription>
            <p className="font-medium mb-1">توصيات</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {report.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Narrative */}
      {report.narrative_report_ar && (
        <Card>
          <CardHeader><CardTitle>التقرير التحليلي</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-loose whitespace-pre-wrap">{report.narrative_report_ar}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const KV: React.FC<{ label: string; v: string; highlight?: boolean }> = ({ label, v, highlight }) => (
  <div className={`p-3 rounded-md ${highlight ? 'bg-primary/10 border border-primary/30' : 'bg-muted/40'}`}>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className={`font-mono mt-1 ${highlight ? 'text-lg font-bold text-primary' : 'text-sm font-semibold'}`}>{v}</p>
  </div>
);

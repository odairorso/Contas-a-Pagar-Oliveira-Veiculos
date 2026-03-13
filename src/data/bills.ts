export type BillStatus = "paid" | "pending" | "overdue" | "scheduled";

export interface Bill {
  id: string;
  vendor: string;
  description: string;
  amount: number;
  dueDate: string;
  status: BillStatus;
  category: string;
}

export const mockBills: Bill[] = [
  { id: "1", vendor: "Aluguel Escritório Central", description: "Aluguel mensal", amount: 8500, dueDate: "2026-03-15", status: "pending", category: "Aluguel" },
  { id: "2", vendor: "Energia Elétrica - CEMIG", description: "Conta de luz", amount: 1245.80, dueDate: "2026-03-10", status: "overdue", category: "Utilidades" },
  { id: "3", vendor: "Internet Vivo Fibra", description: "Plano empresarial", amount: 459.90, dueDate: "2026-03-20", status: "scheduled", category: "Telecomunicações" },
  { id: "4", vendor: "Fornecedor ABC Ltda", description: "Material de escritório", amount: 2340, dueDate: "2026-03-05", status: "paid", category: "Suprimentos" },
  { id: "5", vendor: "Contabilidade Silva & Associados", description: "Honorários mensais", amount: 3200, dueDate: "2026-03-18", status: "pending", category: "Serviços" },
  { id: "6", vendor: "Seguro Empresarial Porto", description: "Parcela 4/12", amount: 1890, dueDate: "2026-03-22", status: "scheduled", category: "Seguros" },
  { id: "7", vendor: "Água e Esgoto - COPASA", description: "Conta de água", amount: 387.50, dueDate: "2026-03-08", status: "overdue", category: "Utilidades" },
  { id: "8", vendor: "Limpeza Brilhante ME", description: "Serviço de limpeza mensal", amount: 1600, dueDate: "2026-02-28", status: "paid", category: "Serviços" },
  { id: "9", vendor: "Software CRM - Salesforce", description: "Licença mensal", amount: 4500, dueDate: "2026-03-25", status: "scheduled", category: "Software" },
  { id: "10", vendor: "Manutenção Ar Condicionado", description: "Manutenção preventiva", amount: 750, dueDate: "2026-03-12", status: "overdue", category: "Manutenção" },
];

export function getStatusLabel(status: BillStatus): string {
  const labels: Record<BillStatus, string> = {
    paid: "Pago",
    pending: "Pendente",
    overdue: "Vencido",
    scheduled: "Agendado",
  };
  return labels[status];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function normalizeDateInput(dateStr: string): string | null {
  const value = String(dateStr ?? "").trim();
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const [, day, month, year] = br;
    return `${year}-${month}-${day}`;
  }

  const fromDate = new Date(value);
  if (Number.isNaN(fromDate.getTime())) {
    return null;
  }
  const year = fromDate.getFullYear();
  const month = String(fromDate.getMonth() + 1).padStart(2, "0");
  const day = String(fromDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateSortKey(dateStr: string): number {
  const normalized = normalizeDateInput(dateStr);
  if (!normalized) {
    return Number.MAX_SAFE_INTEGER;
  }
  const [year, month, day] = normalized.split("-").map(Number);
  return year * 10000 + month * 100 + day;
}

export function monthLabelFromDate(dateStr: string): string {
  const normalized = normalizeDateInput(dateStr);
  if (!normalized) {
    return "";
  }
  const [year, month] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(date);
}

export function monthKeyFromDate(dateStr: string): string {
  const normalized = normalizeDateInput(dateStr);
  if (!normalized) {
    return "";
  }
  const [year, month] = normalized.split("-");
  return `${year}-${month}`;
}

export function formatDate(dateStr: string): string {
  const normalized = normalizeDateInput(dateStr);
  if (!normalized) {
    return dateStr;
  }
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

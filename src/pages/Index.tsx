import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, CheckCircle2, CalendarClock, Search, Users, TrendingUp, Database } from "lucide-react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { MetricCard } from "@/components/MetricCard";
import { BillsTable } from "@/components/BillsTable";
import { AddBillDialog } from "@/components/AddBillDialog";
import { EditBillDialog } from "@/components/EditBillDialog";
import { Reports } from "@/components/Reports";
import { dateSortKey, formatCurrency, monthKeyFromDate, monthLabelFromDate, type Bill, type BillStatus } from "@/data/bills";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const statusFilters: { label: string; value: BillStatus | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Vencidos", value: "overdue" },
  { label: "Agendados", value: "scheduled" },
  { label: "Pagos", value: "paid" },
];

type DataSource = "api" | "local";

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

interface ApiErrorPayload {
  error?: string;
  details?: string;
}

const pageByPath: Record<string, "dashboard" | "contas" | "fornecedores" | "relatorios" | "configuracoes"> = {
  "/": "dashboard",
  "/contas": "contas",
  "/fornecedores": "fornecedores",
  "/relatorios": "relatorios",
  "/configuracoes": "configuracoes",
};

const Index = () => {
  const location = useLocation();
  const [bills, setBills] = useState<Bill[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BillStatus | "all">("all");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierForm, setSupplierForm] = useState({ name: "", email: "", phone: "" });
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<DataSource>("local");
  const page = pageByPath[location.pathname] ?? "dashboard";

  const readApiError = async (response: Response): Promise<string> => {
    try {
      const raw = await response.text();
      if (!raw) {
        return `HTTP ${response.status}`;
      }
      try {
        const payload = JSON.parse(raw) as ApiErrorPayload;
        return payload.details || payload.error || `HTTP ${response.status}`;
      } catch {
        return `${response.status} ${raw.slice(0, 180)}`;
      }
    } catch {
      return `HTTP ${response.status}`;
    }
  };

  const loadBills = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/bills");
      if (!response.ok) {
        const message = await readApiError(response);
        throw new Error(`Falha ao buscar contas: ${message}`);
      }
      const data = (await response.json()) as Bill[];
      setBills(data);
      return true;
    } catch (error) {
      setBills([]);
      toast.error(error instanceof Error ? error.message : "Falha ao buscar contas");
      return false;
    }
  }, []);

  const loadSuppliers = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/suppliers");
      if (!response.ok) {
        const message = await readApiError(response);
        throw new Error(`Falha ao buscar fornecedores: ${message}`);
      }
      const data = (await response.json()) as Supplier[];
      setSuppliers(data);
      return true;
    } catch (error) {
      setSuppliers([]);
      toast.error(error instanceof Error ? error.message : "Falha ao buscar fornecedores");
      return false;
    }
  }, []);

  const reloadData = useCallback(async () => {
    setIsLoading(true);
    const [billsOk, suppliersOk] = await Promise.all([loadBills(), loadSuppliers()]);
    setSource(billsOk || suppliersOk ? "api" : "local");
    setIsLoading(false);
  }, [loadBills, loadSuppliers]);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

  useEffect(() => {
    if (page === "contas") {
      void loadSuppliers();
    }
  }, [page, loadSuppliers]);

  const metrics = useMemo(() => {
    const overdue = bills.filter((b) => b.status === "overdue");
    const pending = bills.filter((b) => b.status === "pending");
    const paid = bills.filter((b) => b.status === "paid");
    const total = bills.reduce((sum, b) => sum + b.amount, 0);
    return {
      overdue: { count: overdue.length, total: overdue.reduce((s, b) => s + b.amount, 0) },
      pending: { count: pending.length, total: pending.reduce((s, b) => s + b.amount, 0) },
      paid: { count: paid.length, total: paid.reduce((s, b) => s + b.amount, 0) },
      total,
    };
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills
      .filter((b) => {
      const matchesSearch = b.vendor.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
      })
      .sort((a, b) => dateSortKey(a.dueDate) - dateSortKey(b.dueDate));
  }, [bills, search, statusFilter]);

  const upcomingBills = useMemo(() => {
    return [...bills]
      .filter((bill) => bill.status !== "paid")
      .sort((a, b) => dateSortKey(a.dueDate) - dateSortKey(b.dueDate))
      .slice(0, 5);
  }, [bills]);

  const supplierTotals = useMemo(() => {
    const grouped = new Map<string, { vendor: string; total: number; open: number; paid: number }>();
    for (const bill of bills) {
      const current = grouped.get(bill.vendor) ?? { vendor: bill.vendor, total: 0, open: 0, paid: 0 };
      current.total += bill.amount;
      if (bill.status === "paid") {
        current.paid += 1;
      } else {
        current.open += 1;
      }
      grouped.set(bill.vendor, current);
    }
    return [...grouped.values()].sort((a, b) => b.total - a.total);
  }, [bills]);

  const supplierNames = useMemo(() => {
    return [...new Set(
      suppliers
        .map((supplier) => supplier.name.trim())
        .filter((name) => name.length > 0)
    )].sort((a, b) => a.localeCompare(b));
  }, [suppliers]);

  const monthlyTotals = useMemo(() => {
    const grouped = new Map<string, { key: string; month: string; total: number; paid: number; open: number }>();
    for (const bill of bills) {
      const key = monthKeyFromDate(bill.dueDate);
      const month = monthLabelFromDate(bill.dueDate);
      if (!key || !month) {
        continue;
      }
      const current = grouped.get(key) ?? { key, month, total: 0, paid: 0, open: 0 };
      current.total += bill.amount;
      if (bill.status === "paid") {
        current.paid += bill.amount;
      } else {
        current.open += bill.amount;
      }
      grouped.set(key, current);
    }
    return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [bills]);

  const syncCreatedBill = async (bill: Bill | Bill[]): Promise<Bill | Bill[]> => {
    const response = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bill),
    });
    if (!response.ok) {
      const message = await readApiError(response);
      throw new Error(`Falha ao salvar conta: ${message}`);
    }
    return (await response.json()) as Bill | Bill[];
  };

  const syncPaidBill = async (id: string): Promise<void> => {
    const response = await fetch(`/api/bills/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    if (!response.ok) {
      const message = await readApiError(response);
      throw new Error(`Falha ao atualizar conta: ${message}`);
    }
  };

  const syncDeleteBill = async (id: string): Promise<void> => {
    const response = await fetch(`/api/bills/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const message = await readApiError(response);
      throw new Error(`Falha ao excluir conta: ${message}`);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, status: "paid" as BillStatus } : b)));
    if (source === "api") {
      try {
        await syncPaidBill(id);
      } catch {
        toast.error("Não foi possível sincronizar com o banco.");
      }
    }
    toast.success("Conta marcada como paga!");
  };

  const handleDelete = async (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
    if (source === "api") {
      try {
        await syncDeleteBill(id);
      } catch {
        toast.error("Não foi possível sincronizar com o banco.");
      }
    }
    toast.success("Conta removida!");
  };

  const handleSaveEdit = async (bill: Bill) => {
    setBills((prev) => prev.map((b) => (b.id === bill.id ? bill : b)));
    
    if (source === "api") {
      try {
        const response = await fetch(`/api/bills/${bill.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bill),
        });
        if (!response.ok) {
          throw new Error("Falha ao salvar edição");
        }
      } catch {
        toast.error("Alteração salva localmente, mas falhou ao sincronizar.");
      }
    }
    toast.success("Conta atualizada!");
    setEditingBill(null);
  };

  const handleAdd = async (bill: Bill | Bill[]) => {
    if (source !== "api") {
      setBills((prev) => {
        if (Array.isArray(bill)) {
          return [...bill, ...prev];
        }
        return [bill, ...prev];
      });
      toast.success(Array.isArray(bill) ? "Novas contas adicionadas!" : "Nova conta adicionada!");
      return;
    }
    try {
      const created = await syncCreatedBill(bill);
      setBills((prev) => {
        if (Array.isArray(created)) {
          return [...created, ...prev];
        }
        return [created as Bill, ...prev];
      });
      toast.success(Array.isArray(created) ? "Novas contas adicionadas!" : "Nova conta adicionada!");
    } catch {
      setBills((prev) => {
        if (Array.isArray(bill)) {
          return [...bill, ...prev];
        }
        return [bill, ...prev];
      });
      toast.error("Conta criada localmente, sem sincronizar no banco.");
    }
  };

  const handleAddSupplier = async () => {
    const name = supplierForm.name.trim();
    if (!name) {
      toast.error("Informe o nome do fornecedor.");
      return;
    }

    const localSupplier: Supplier = {
      id: Date.now().toString(),
      name,
      email: supplierForm.email.trim(),
      phone: supplierForm.phone.trim(),
      createdAt: new Date().toISOString(),
    };

    setIsSavingSupplier(true);
    if (source !== "api") {
      setSuppliers((prev) => [localSupplier, ...prev]);
      setSupplierForm({ name: "", email: "", phone: "" });
      setIsSavingSupplier(false);
      toast.success("Fornecedor cadastrado localmente.");
      return;
    }

    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localSupplier),
      });
      if (!response.ok) {
        throw new Error("Falha ao salvar fornecedor");
      }
      const created = (await response.json()) as Supplier;
      setSuppliers((prev) => [created, ...prev]);
      setSupplierForm({ name: "", email: "", phone: "" });
      toast.success("Fornecedor cadastrado.");
    } catch {
      setSuppliers((prev) => [localSupplier, ...prev]);
      toast.error("Fornecedor salvo localmente, sem sincronizar no banco.");
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const titleByPage: Record<typeof page, string> = {
    dashboard: "Dashboard",
    contas: "Contas",
    fornecedores: "Fornecedores",
    relatorios: "Relatórios",
    configuracoes: "Configurações",
  };

  const subtitleByPage: Record<typeof page, string> = {
    dashboard: "Visão geral financeira das contas a pagar",
    contas: "Gerencie todas as suas contas e pagamentos",
    fornecedores: "Acompanhe volume financeiro por fornecedor",
    relatorios: "Resumo mensal de contas pagas e em aberto",
    configuracoes: "Parâmetros de integração e preferências",
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 p-4 pt-16 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{titleByPage[page]}</h1>
              <p className="text-sm text-muted-foreground mt-1">{subtitleByPage[page]}</p>
            </div>
            {page === "contas" && (
              <AddBillDialog
                onAdd={(bill) => void handleAdd(bill)}
                suppliers={supplierNames}
                onRefreshSuppliers={loadSuppliers}
              />
            )}
            {page !== "contas" && (
              <Badge variant={source === "api" ? "default" : "secondary"}>
                {source === "api" ? "Conectado ao Neon" : "Modo local"}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Total Vencido"
              value={formatCurrency(metrics.overdue.total)}
              subtitle={`${metrics.overdue.count} conta(s)`}
              icon={<AlertTriangle className="w-5 h-5" />}
              variant="destructive"
            />
            <MetricCard
              title="Pendentes"
              value={formatCurrency(metrics.pending.total)}
              subtitle={`${metrics.pending.count} conta(s)`}
              icon={<Clock className="w-5 h-5" />}
              variant="warning"
            />
            <MetricCard
              title="Pagas no Mês"
              value={formatCurrency(metrics.paid.total)}
              subtitle={`${metrics.paid.count} conta(s)`}
              icon={<CheckCircle2 className="w-5 h-5" />}
              variant="success"
            />
            <MetricCard
              title="Total Geral"
              value={formatCurrency(metrics.total)}
              subtitle={`${bills.length} conta(s)`}
              icon={<CalendarClock className="w-5 h-5" />}
              variant="default"
            />
          </div>

          {isLoading && (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Carregando dados...</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && page === "contas" && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por fornecedor..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {statusFilters.map((f) => (
                    <Button
                      key={f.value}
                      variant={statusFilter === f.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(f.value)}
                      className="text-xs"
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>

              <BillsTable
                bills={filteredBills}
                onMarkPaid={(id) => void handleMarkPaid(id)}
                onDelete={(id) => void handleDelete(id)}
                onEdit={(bill) => setEditingBill(bill)}
              />
              <EditBillDialog
                open={!!editingBill}
                onOpenChange={(open) => !open && setEditingBill(null)}
                bill={editingBill}
                onSave={(bill) => void handleSaveEdit(bill)}
                suppliers={supplierNames}
              />
            </>
          )}

          {!isLoading && page === "dashboard" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Próximos vencimentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{bill.vendor}</p>
                      <p className="text-xs text-muted-foreground">{bill.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(bill.amount)}</p>
                      <p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("pt-BR").format(new Date(bill.dueDate))}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!isLoading && page === "fornecedores" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cadastrar fornecedor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Nome do fornecedor"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="E-mail"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    placeholder="Telefone"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                  <Button onClick={() => void handleAddSupplier()} disabled={isSavingSupplier} className="w-full">
                    {isSavingSupplier ? "Salvando..." : "Salvar fornecedor"}
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fornecedores cadastrados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suppliers.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</p>
                  )}
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 border rounded-lg">
                      <p className="font-medium text-sm">{supplier.name}</p>
                      <p className="text-sm text-muted-foreground">{supplier.email || "Sem e-mail"}</p>
                      <p className="text-sm text-muted-foreground">{supplier.phone || "Sem telefone"}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {!isLoading && page === "relatorios" && (
            <Reports 
              bills={bills} 
              onMarkPaid={(id) => void handleMarkPaid(id)}
              onDelete={(id) => void handleDelete(id)}
              onEdit={(bill) => setEditingBill(bill)}
            />
          )}

          {!isLoading && page === "configuracoes" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Banco de Dados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Status: {source === "api" ? "Conectado ao Neon pela API da Vercel" : "Sem API ativa (modo local)"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Fornecedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{suppliers.length} fornecedor(es) cadastrado(s).</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Saúde da aplicação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Total de contas: {bills.length}</p>
                  <Button variant="outline" onClick={() => void reloadData()} className="w-full">
                    Recarregar dados
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {!isLoading && page === "fornecedores" && supplierTotals.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Movimento financeiro por fornecedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supplierTotals.map((supplier) => (
                  <div key={supplier.vendor} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border rounded-lg">
                    <p className="font-medium text-sm">{supplier.vendor}</p>
                    <p className="text-sm text-muted-foreground">Total: {formatCurrency(supplier.total)}</p>
                    <p className="text-sm text-muted-foreground">Em aberto: {supplier.open}</p>
                    <p className="text-sm text-muted-foreground">Pagas: {supplier.paid}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Bill, BillStatus } from "@/data/bills";

const categories = ["Aluguel", "Utilidades", "Telecomunicações", "Suprimentos", "Serviços", "Seguros", "Software", "Manutenção", "Outros"];

interface AddBillDialogProps {
  onAdd: (bill: Bill | Bill[]) => void;
  suppliers: string[];
  onRefreshSuppliers?: () => void;
}

export function AddBillDialog({ onAdd, suppliers, onRefreshSuppliers }: AddBillDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  
  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState(2);
  const [frequency, setFrequency] = useState("monthly");

  const [form, setForm] = useState({
    vendor: "",
    description: "",
    amount: "",
    dueDate: "",
    category: "",
    status: "pending" as BillStatus,
  });

  const parseDueDateToIso = (value: string): string | null => {
    const input = value.trim();
    const brMatch = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!brMatch) {
      return null;
    }

    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    const date = new Date(year, month - 1, day);
    const isValid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

    if (!isValid) {
      return null;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isoToDate = (iso: string): Date => {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const dateToIso = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const normalizeDueDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dueDateIso = parseDueDateToIso(form.dueDate);
    if (!dueDateIso) {
      toast.error("Informe o vencimento no formato dd/mm/aaaa.");
      return;
    }

    if (isRecurring && installments > 1) {
      const bills: Bill[] = [];
      const baseDate = isoToDate(dueDateIso);
      const baseAmount = parseFloat(form.amount);

      for (let i = 0; i < installments; i++) {
        const nextDate = new Date(baseDate);
        if (frequency === "monthly") {
          nextDate.setMonth(baseDate.getMonth() + i);
        } else if (frequency === "weekly") {
          nextDate.setDate(baseDate.getDate() + (i * 7));
        }

        bills.push({
          id: (Date.now() + i).toString(),
          vendor: form.vendor,
          description: `${form.description} (${i + 1}/${installments})`,
          amount: baseAmount,
          dueDate: dateToIso(nextDate), // Store as ISO for consistency with backend expectation? No, frontend uses localized? Wait.
          // The form.dueDate is DD/MM/YYYY. The backend expects ISO? 
          // parseBill uses toIsoDate which handles DD/MM/YYYY or YYYY-MM-DD.
          // But here we are passing to onAdd which passes to Index.tsx which passes to syncCreatedBill which does JSON.stringify.
          // If we send YYYY-MM-DD, toIsoDate in backend handles it.
          // Let's use DD/MM/YYYY format for consistency if the app uses it internally, 
          // BUT the Bill type in frontend usually stores what?
          // Looking at BillsTable, it calls formatDate(bill.dueDate).
          // Index.tsx calls dateSortKey.
          // Let's stick to what form.dueDate provides. 
          // Actually, let's provide DD/MM/YYYY string if that's what the UI expects, OR provide ISO if the UI handles it.
          // The current `form.dueDate` is DD/MM/YYYY.
          // `parseBill` in backend handles both.
          // `toBill` in backend returns ISO.
          // So frontend `Bill` objects likely have ISO dates from backend, but `form` has DD/MM/YYYY.
          // Let's send ISO or DD/MM/YYYY.
          // To be safe, let's format `nextDate` as DD/MM/YYYY for the frontend state consistency if needed, 
          // OR as ISO.
          // Let's check `toBill` in backend again. It returns YYYY-MM-DD.
          // So the frontend `bills` state expects YYYY-MM-DD.
          // `form.dueDate` is DD/MM/YYYY.
          // When we call `onAdd(newBill)`, `newBill.dueDate` was `form.dueDate` (DD/MM/YYYY).
          // Then `Index.tsx` `handleAdd` adds it to state.
          // So locally created bills have DD/MM/YYYY.
          // Fetched bills have YYYY-MM-DD.
          // This is a potential inconsistency in the frontend state.
          // `dateSortKey` handles both?
          // Let's check `src/data/bills.ts` later.
          // For now, let's keep consistent with existing `handleSubmit` which uses `form.dueDate`.
          // So I should convert `nextDate` back to DD/MM/YYYY.
          
          // Actually, `handleSubmit` creates `newBill` with `dueDate: form.dueDate`.
          // `form.dueDate` is whatever the user typed (DD/MM/YYYY).
          // So I should produce DD/MM/YYYY for the generated bills too.
          
          status: form.status,
          category: form.category,
        } as any); // Type assertion because dueDate might be treated loosely
        
        // Wait, I should format the date properly
        const d = String(nextDate.getDate()).padStart(2, "0");
        const m = String(nextDate.getMonth() + 1).padStart(2, "0");
        const y = nextDate.getFullYear();
        bills[i].dueDate = `${d}/${m}/${y}`;
      }
      
      onAdd(bills);
    } else {
      const newBill: Bill = {
        id: Date.now().toString(),
        vendor: form.vendor,
        description: form.description,
        amount: parseFloat(form.amount),
        dueDate: form.dueDate,
        status: form.status,
        category: form.category,
      };
      onAdd(newBill);
    }

    setForm({ vendor: "", description: "", amount: "", dueDate: "", category: "", status: "pending" });
    setIsRecurring(false);
    setInstallments(2);
    setOpen(false);
  };

  const normalizedSuppliers = useMemo(() => {
    return new Set(suppliers.map((supplier) => supplier.trim().toLowerCase()));
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const query = form.vendor.trim().toLowerCase();
    if (!query) {
      return suppliers.slice(0, 8);
    }
    return suppliers
      .filter((supplier) => supplier.toLowerCase().includes(query))
      .slice(0, 8);
  }, [form.vendor, suppliers]);

  const hasValidSupplier = normalizedSuppliers.has(form.vendor.trim().toLowerCase());

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          onRefreshSuppliers?.();
        } else {
          setIsSuggestionsOpen(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Conta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Conta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="vendor">Fornecedor</Label>
            <Input
              id="vendor"
              value={form.vendor}
              onChange={(e) => {
                setForm({ ...form, vendor: e.target.value });
                setIsSuggestionsOpen(true);
              }}
              onFocus={() => setIsSuggestionsOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsSuggestionsOpen(false), 120);
              }}
              placeholder={suppliers.length > 0 ? "Digite para buscar fornecedor" : "Cadastre fornecedores na aba Fornecedores"}
              autoComplete="off"
            />
            {isSuggestionsOpen && filteredSuppliers.length > 0 && (
              <div className="absolute z-50 top-[86px] w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-44 overflow-auto">
                {filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setForm({ ...form, vendor: supplier });
                      setIsSuggestionsOpen(false);
                    }}
                  >
                    {supplier}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição da conta" />
          </div>
          
          {/* Recurrence Toggle */}
          <div className="flex items-center space-x-2 py-2">
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
            <Label htmlFor="recurring">Parcelar / Repetir lançamento</Label>
          </div>

          {isRecurring && (
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-dashed">
              <div className="space-y-2">
                <Label htmlFor="installments">Nº de Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="2"
                  max="60"
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value) || 2)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{isRecurring ? "Valor da Parcela (R$)" : "Valor (R$)"}</Label>
              <Input id="amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">{isRecurring ? "1º Vencimento" : "Vencimento"}</Label>
              <Input
                id="dueDate"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: normalizeDueDateInput(e.target.value) })}
                placeholder="dd/mm/aaaa"
                inputMode="numeric"
                maxLength={10}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Conta</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

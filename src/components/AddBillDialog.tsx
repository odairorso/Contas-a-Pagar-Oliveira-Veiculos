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
import { toast } from "sonner";
import type { Bill, BillStatus } from "@/data/bills";

const categories = ["Aluguel", "Utilidades", "Telecomunicações", "Suprimentos", "Serviços", "Seguros", "Software", "Manutenção", "Outros"];

interface AddBillDialogProps {
  onAdd: (bill: Bill) => void;
  suppliers: string[];
  onRefreshSuppliers?: () => void;
}

export function AddBillDialog({ onAdd, suppliers, onRefreshSuppliers }: AddBillDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
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
    setForm({ vendor: "", description: "", amount: "", dueDate: "", category: "", status: "pending" });
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input id="amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Vencimento</Label>
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
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: BillStatus) => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={!hasValidSupplier}>Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

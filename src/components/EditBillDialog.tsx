import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface EditBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (bill: Bill) => void;
  bill: Bill | null;
  suppliers: string[];
}

export function EditBillDialog({ open, onOpenChange, onSave, bill, suppliers }: EditBillDialogProps) {
  const [form, setForm] = useState({
    vendor: "",
    description: "",
    amount: "",
    dueDate: "",
    category: "",
    status: "pending" as BillStatus,
  });

  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  useEffect(() => {
    if (bill && open) {
      setForm({
        vendor: bill.vendor,
        description: bill.description,
        amount: bill.amount.toString(),
        dueDate: isoToDisplayDate(bill.dueDate),
        category: bill.category,
        status: bill.status,
      });
    }
  }, [bill, open]);

  const isoToDisplayDate = (iso: string): string => {
    if (!iso) return "";
    // Handle YYYY-MM-DD
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
    return iso;
  };

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
    if (!bill) return;

    const dueDateIso = parseDueDateToIso(form.dueDate);
    if (!dueDateIso) {
      toast.error("Informe o vencimento no formato dd/mm/aaaa.");
      return;
    }
    const updatedBill: Bill = {
      ...bill,
      vendor: form.vendor,
      description: form.description,
      amount: parseFloat(form.amount),
      dueDate: dueDateIso,
      status: form.status,
      category: form.category,
    };
    onSave(updatedBill);
    onOpenChange(false);
  };

  const filteredSuppliers = useMemo(() => {
    const query = form.vendor.trim().toLowerCase();
    if (!query) {
      return suppliers.slice(0, 8);
    }
    return suppliers
      .filter((supplier) => supplier.toLowerCase().includes(query))
      .slice(0, 8);
  }, [form.vendor, suppliers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Conta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="edit-vendor">Fornecedor</Label>
            <Input
              id="edit-vendor"
              value={form.vendor}
              onChange={(e) => {
                setForm({ ...form, vendor: e.target.value });
                setIsSuggestionsOpen(true);
              }}
              onFocus={() => setIsSuggestionsOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsSuggestionsOpen(false), 120);
              }}
              placeholder="Nome do fornecedor"
              autoComplete="off"
            />
             {isSuggestionsOpen && filteredSuppliers.length > 0 && (
              <div className="absolute z-50 top-[70px] w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-44 overflow-auto">
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
            <Label htmlFor="edit-description">Descrição</Label>
            <Input
              id="edit-description"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição da conta"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Valor (R$)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dueDate">Vencimento</Label>
              <Input
                id="edit-dueDate"
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

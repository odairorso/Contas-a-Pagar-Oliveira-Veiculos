import { motion } from "framer-motion";
import { MoreHorizontal, Eye, CheckCircle2, Trash2, Pencil } from "lucide-react";
import { type Bill, formatCurrency, formatDate } from "@/data/bills";
import { StatusBadge } from "./StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface BillsTableProps {
  bills: Bill[];
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (bill: Bill) => void;
}

export function BillsTable({ bills, onMarkPaid, onDelete, onEdit }: BillsTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="bg-card rounded-xl border shadow-sm overflow-x-auto"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-muted-foreground whitespace-nowrap">Fornecedor</TableHead>
            <TableHead className="font-semibold text-muted-foreground whitespace-nowrap">Categoria</TableHead>
            <TableHead className="font-semibold text-muted-foreground whitespace-nowrap">Vencimento</TableHead>
            <TableHead className="font-semibold text-muted-foreground text-right whitespace-nowrap">Valor</TableHead>
            <TableHead className="font-semibold text-muted-foreground whitespace-nowrap">Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((bill, i) => (
            <motion.tr
              key={bill.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="border-b last:border-0 hover:bg-muted/50 transition-colors"
            >
              <TableCell className="whitespace-nowrap">
                <div>
                  <p className="font-medium text-card-foreground text-sm">{bill.vendor}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{bill.description}</p>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{bill.category}</TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(bill.dueDate)}</TableCell>
              <TableCell className="text-right font-semibold text-sm text-card-foreground whitespace-nowrap">{formatCurrency(bill.amount)}</TableCell>
              <TableCell className="whitespace-nowrap"><StatusBadge status={bill.status} /></TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2" onClick={() => onEdit(bill)}>
                      <Pencil className="w-4 h-4" /> Editar
                    </DropdownMenuItem>
                    {/* <DropdownMenuItem className="gap-2">
                      <Eye className="w-4 h-4" /> Detalhes
                    </DropdownMenuItem> */}
                    {bill.status !== "paid" && (
                      <DropdownMenuItem className="gap-2" onClick={() => onMarkPaid(bill.id)}>
                        <CheckCircle2 className="w-4 h-4" /> Marcar como pago
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="gap-2 text-destructive" onClick={() => onDelete(bill.id)}>
                      <Trash2 className="w-4 h-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, CheckCircle2, Clock, DollarSign, Filter, TrendingUp, TrendingDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type Bill, formatCurrency } from "@/data/bills";
import { BillsTable } from "@/components/BillsTable";

interface ReportsProps {
  bills: Bill[];
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (bill: Bill) => void;
}

export function Reports({ bills, onMarkPaid, onDelete, onEdit }: ReportsProps) {
  // Default to current month
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });
  
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Helper to parse bill date string (YYYY-MM-DD or DD/MM/YYYY) to Date object
  const parseDate = (dateStr: string): Date => {
    if (dateStr.includes("/")) {
      const [d, m, y] = dateStr.split("/").map(Number);
      return new Date(y, m - 1, d);
    }
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const filteredBills = useMemo(() => {
    if (!dateRange?.from) return [];
    
    const from = dateRange.from;
    const to = dateRange.to || dateRange.from; // If 'to' is undefined, assume single day selection

    // Normalize time to compare dates only
    const fromTime = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    const toTime = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();

    return bills.filter((bill) => {
      const billDate = parseDate(bill.dueDate);
      const billTime = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate()).getTime();
      
      const matchesDate = billTime >= fromTime && billTime <= toTime;
      const matchesStatus = statusFilter === "all" || 
                           (statusFilter === "paid" && bill.status === "paid") ||
                           (statusFilter === "pending" && bill.status !== "paid"); // Pending includes overdue, scheduled, pending

      return matchesDate && matchesStatus;
    });
  }, [bills, dateRange, statusFilter]);

  const metrics = useMemo(() => {
    const total = filteredBills.reduce((acc, bill) => acc + bill.amount, 0);
    const paid = filteredBills.filter(b => b.status === "paid").reduce((acc, bill) => acc + bill.amount, 0);
    const pending = filteredBills.filter(b => b.status !== "paid").reduce((acc, bill) => acc + bill.amount, 0);
    const count = filteredBills.length;
    
    return { total, paid, pending, count };
  }, [filteredBills]);

  const categoryData = useMemo(() => {
    const data = new Map<string, number>();
    filteredBills.forEach(bill => {
      const current = data.get(bill.category) || 0;
      data.set(bill.category, current + bill.amount);
    });
    
    return Array.from(data.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredBills]);

  const dailyData = useMemo(() => {
    const data = new Map<string, number>();
    
    // Initialize map with 0 for range if needed, but sparse is fine for now
    filteredBills.forEach(bill => {
        // Use bill date as key
        const date = parseDate(bill.dueDate);
        const key = format(date, "dd/MM");
        const current = data.get(key) || 0;
        data.set(key, current + bill.amount);
    });

    // Sort by date key? dd/MM is not sortable directly if across months, 
    // but filteredBills are usually within a range.
    // Better to sort the array.
    return Array.from(data.entries())
        .map(([name, value]) => ({ name, value }))
        // Simple sort assuming same month or consistent format. 
        // If range spans years, dd/MM is ambiguous. But usually reports are monthly.
        // Let's improve sort key if needed.
        .sort((a, b) => {
            const [d1, m1] = a.name.split("/").map(Number);
            const [d2, m2] = b.name.split("/").map(Number);
            if (m1 !== m2) return m1 - m2;
            return d1 - d2;
        });
  }, [filteredBills]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Filters Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
                <Filter className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Filtros do Relatório</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Popover>
            <PopoverTrigger asChild>
                <Button
                id="date"
                variant={"outline"}
                className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                    dateRange.to ? (
                    <>
                        {format(dateRange.from, "dd/MM/y", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/y", { locale: ptBR })}
                    </>
                    ) : (
                    format(dateRange.from, "dd/MM/y", { locale: ptBR })
                    )
                ) : (
                    <span>Selecione o período</span>
                )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
                />
            </PopoverContent>
            </Popover>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">A Pagar (Aberto)</SelectItem>
            </SelectContent>
            </Select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total do Período</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.total)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.count} lançamentos encontrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pago</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(metrics.paid)}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.paid / (metrics.total || 1)) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(metrics.pending)}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.pending / (metrics.total || 1)) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
                <CardDescription>Distribuição dos gastos no período selecionado</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        Sem dados para exibir
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Evolução Diária</CardTitle>
                <CardDescription>Gastos acumulados por dia</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                {dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => `R$${value}`} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Bar dataKey="value" fill="#8884d8" name="Valor" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        Sem dados para exibir
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
          <CardHeader>
              <CardTitle>Detalhamento</CardTitle>
              <CardDescription>Lista completa de contas do filtro atual</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredBills.length > 0 ? (
                <div className="rounded-md border">
                    <BillsTable 
                        bills={filteredBills} 
                        onMarkPaid={onMarkPaid} 
                        onDelete={onDelete} 
                        onEdit={onEdit}
                    />
                </div>
            ) : (
                <div className="py-8 text-center text-muted-foreground">
                    Nenhum registro encontrado para este filtro.
                </div>
            )}
          </CardContent>
      </Card>
    </div>
  );
}

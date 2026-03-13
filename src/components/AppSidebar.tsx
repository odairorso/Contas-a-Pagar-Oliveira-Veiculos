import { LayoutDashboard, FileText, Users, BarChart3, Settings, CreditCard, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: FileText, label: "Contas", to: "/contas" },
  { icon: Users, label: "Fornecedores", to: "/fornecedores" },
  { icon: BarChart3, label: "Relatórios", to: "/relatorios" },
  { icon: Settings, label: "Configurações", to: "/configuracoes" },
];

function SidebarContent() {
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">FinPagar</h1>
          <p className="text-xs text-sidebar-muted">Contas a Pagar</p>
        </div>
      </div>

      <nav className="flex-1 px-3 mt-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mx-3 mb-4 rounded-lg bg-sidebar-accent">
        <p className="text-xs font-medium text-sidebar-foreground">Precisa de ajuda?</p>
        <p className="text-xs text-sidebar-muted mt-1">Acesse nossa central de suporte</p>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <>
      <aside className="hidden md:flex w-64 min-h-screen bg-sidebar text-sidebar-foreground flex-col shrink-0 border-r">
        <SidebarContent />
      </aside>

      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background shadow-sm border">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 border-r bg-sidebar">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

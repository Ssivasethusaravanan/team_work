import { getSession } from "../../lib/auth";
import { redirect } from "next/navigation";
import {
  Plus,
  Search,
  Menu,
  LayoutDashboard,
  Settings,
  LogOut,
  Bell,
  UserCircle2,
  TrendingUp,
  Receipt,
  Users2,
  CircleDollarSign
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Sidebar (Tablet/Desktop) */}
      <aside className="hidden md:flex w-20 lg:w-64 border-r border-white/10 flex-col py-8 px-4 gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl">M</div>
          <span className="hidden lg:block font-bold text-xl tracking-tight">ModelPro</span>
        </div>

        <nav className="flex-1 space-y-2">
          <div className="lg:px-2 py-3">
            <p className="hidden lg:block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Main Menu</p>
            <div className="space-y-1">
              <SidebarItem icon={<LayoutDashboard size={20} />} label="Overview" active />
              <SidebarItem icon={<Receipt size={20} />} label="Invoices" />
              <SidebarItem icon={<Users2 size={20} />} label="Customers" />
              <SidebarItem icon={<TrendingUp size={20} />} label="Analytics" />
            </div>
          </div>

          <div className="lg:px-2 py-3">
            <p className="hidden lg:block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Support</p>
            <div className="space-y-1">
              <SidebarItem icon={<Settings size={20} />} label="Settings" />
            </div>
          </div>
        </nav>

        <div className="px-2">
          <form action="/api/auth/logout" method="POST">
            <button className="flex items-center gap-3 text-neutral-400 hover:text-red-400 transition-colors w-full py-2">
              <LogOut size={20} />
              <span className="hidden lg:block text-sm font-medium">Log Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto max-h-screen">
        {/* Header */}
        <header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-6 sticky top-0 bg-black/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 md:hidden">
            <Menu className="text-neutral-400" />
            <span className="font-bold">ModelPro</span>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-xl group relative">
            <Search className="absolute left-3 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 rounded-full hover:bg-white/5 text-neutral-400 relative">
              <Bell size={20} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full" />
            </button>
            <div className="w-px h-6 bg-white/10 hidden md:block mx-1" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-tight">{user.name}</p>
                <p className="text-[10px] text-neutral-500 font-medium">{user.role || 'Enterprise Admin'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-neutral-800 border-2 border-white/10 flex items-center justify-center">
                <UserCircle2 className="w-7 h-7 text-neutral-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Dash Content */}
        <div className="p-6 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-indigo-400 text-xs font-bold tracking-[0.2em] uppercase mb-1">Workspace Dashboard</p>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                  Welcome back, <span className="gradient-text">{user.name.split(' ')[0]}</span>
                </h1>
                <p className="text-neutral-400 mt-2 max-w-lg">
                  You are currently managing the <span className="text-white font-semibold">[{user.tenantId}]</span> workspace.
                  Here&apos;s what changed since your last login.
                </p>
              </div>
              <button className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                <Plus size={20} />
                New Invoice
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Monthly Revenue"
              value="$128,430.00"
              trend="+12.5%"
              icon={<CircleDollarSign className="text-indigo-400" />}
            />
            <StatCard
              label="Pending Invoices"
              value="24"
              trend="+3 this week"
              icon={<Receipt className="text-purple-400" />}
            />
            <StatCard
              label="Active Users"
              value="1,204"
              trend="+8%"
              icon={<Users2 className="text-emerald-400" />}
            />
            <StatCard
              label="System Health"
              value="99.99%"
              trend="Stable"
              icon={<TrendingUp className="text-indigo-400" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Section */}
            <section className="lg:col-span-2 glass rounded-3xl p-8 min-h-[300px]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Revenue Dynamics</h2>
                <div className="flex gap-2 text-xs font-bold">
                  <span className="px-3 py-1 bg-white/5 rounded-full text-indigo-400">7 Days</span>
                  <span className="px-3 py-1 text-neutral-500">30 Days</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/5 rounded-2xl text-neutral-600">
                <TrendingUp size={48} className="mb-4 opacity-10" />
                <p className="text-sm">Revenue charts will be populated after data synchronization.</p>
              </div>
            </section>

            {/* Side Section */}
            <section className="glass rounded-3xl p-8">
              <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
              <div className="space-y-6">
                <ActivityItem title="Invoice #INV-2024-001" time="2 min ago" type="Paid" />
                <ActivityItem title="New client registered" time="15 min ago" type="System" />
                <ActivityItem title="Payout processed" time="1 hour ago" type="Billing" />
                <ActivityItem title="Server maintenance" time="3 hours ago" type="Admin" />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-3 px-3 rounded-xl cursor-not-allowed transition-all ${active ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}>
      {icon}
      <span className="hidden lg:block text-sm font-medium">{label}</span>
    </div>
  );
}

function StatCard({ label, value, trend, icon }: { label: string, value: string, trend: string, icon: React.ReactNode }) {
  return (
    <div className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all cursor-default">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-indigo-500/5 rounded-lg border border-white/5 group-hover:bg-indigo-500/10 transition-colors">
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-neutral-400'}`}>
          {trend}
        </span>
      </div>
      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function ActivityItem({ title, time, type }: { title: string, time: string, type: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />
      <div>
        <p className="text-sm font-bold leading-none">{title}</p>
        <p className="text-[10px] text-neutral-500 font-medium py-1">{time} • <span className="text-indigo-400/80">{type}</span></p>
      </div>
    </div>
  );
}

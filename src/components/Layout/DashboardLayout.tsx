import { NavLink, Outlet } from "react-router-dom";
import { Map } from "lucide-react";
import { twMerge } from "tailwind-merge";

const navItems = [
  // { to: "/segments-management", label: "Segments", icon: Layers },
  { to: "/map", label: "Map", icon: Map },
];

export function DashboardLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900">
      {/* Navigation Sidebar */}
      <nav className="w-20 h-full bg-slate-950 border-r border-slate-700 flex flex-col items-center py-4 gap-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              twMerge(
                "size-17 aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200",
                isActive
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )
            }
            title={label}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

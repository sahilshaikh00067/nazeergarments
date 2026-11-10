
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Package,
  Layers3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const groups = [
  {
    title: "OVERVIEW",
    links: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
      { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "MANAGEMENT",
    links: [
      { label: "Orders", path: "/admin/orders", icon: ShoppingBag },
      { label: "Products", path: "/admin/products", icon: Package },
      { label: "Categories", path: "/admin/categories", icon: Layers3 },
      { label: "Customers", path: "/admin/customers", icon: Users },
    ],
  },
  {
    title: "PREFERENCES",
    links: [
      { label: "Settings", path: "/admin/settings", icon: Settings },
    ],
  },
];

export default function AdminShell({ title, subtitle, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const sidebar = (
    <aside className="flex h-full flex-col bg-[#11110F] text-white">
      <div className="flex h-[88px] items-center justify-between border-b border-white/10 px-7">
        <div>
          <h1 className="font-serif text-[25px] tracking-[0.16em] text-[#D4B477]">
            NAZEER
          </h1>
          <p className="mt-1 text-[8px] tracking-[0.42em] text-white/50">
            GARMENTS ADMIN
          </p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-white/60 lg:hidden"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-8">
        {groups.map((group) => (
          <div key={group.title} className="mb-8">
            <p className="mb-4 px-3 text-[9px] font-semibold tracking-[0.23em] text-white/35">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.links.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/admin"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-3 text-[12px] transition ${
                      isActive
                        ? "bg-[#C6A66B]/15 text-[#D8B97E]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <Icon size={17} strokeWidth={1.7} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-5">
        <div className="mb-4 rounded-lg bg-white/[0.04] p-3">
          <p className="truncate text-xs font-semibold">
            {user?.first_name || user?.username || "Administrator"}
          </p>
          <p className="mt-1 text-[10px] text-white/40">Administrator</p>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-xs text-white/50 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#25241F]">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[265px] lg:block">
        {sidebar}
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[265px] transition-transform lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </div>

      <main className="min-h-screen lg:ml-[265px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#EAE7E0] bg-white/95 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-[#44413A] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <p className="text-[9px] font-semibold tracking-[0.2em] text-[#A18A60]">
                NAZEER GARMENTS
              </p>
              <h2 className="mt-1 text-sm font-semibold">{title}</h2>
            </div>
          </div>
          <span className="hidden text-xs text-[#8D887F] sm:block">
            {new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </header>

        <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">
          <div className="mb-8">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#A58A5B]">
              MANAGEMENT
            </p>
            <h1 className="mt-2 font-serif text-3xl text-[#24231F] sm:text-[38px]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-xs text-[#99958D]">{subtitle}</p>
            )}
          </div>
          {children}
          <footer className="mt-10 border-t border-[#E7E3DA] py-6 text-[10px] tracking-wide text-[#AAA59C]">
            © {new Date().getFullYear()} AZEER GARMENTS. ALL RIGHTS RESERVED.
          </footer>
        </div>
      </main>
    </div>
  );
}

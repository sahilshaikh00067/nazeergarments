import { useEffect, useState } from "react";
import api from "../services/api";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Bell,
  Settings,
  Menu,
  X,
  ChevronRight,
  CalendarDays,
  RefreshCw,
  Truck,
  Clock3,
  CheckCircle2,
  XCircle,
  Eye,
  LogOut,
  BarChart3,
  Layers3,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* -----------------------------------------
   HELPERS
----------------------------------------- */

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
};

const getStatusStyle = (status) => {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-blue-50 text-blue-700",
    processing: "bg-violet-50 text-violet-700",
    packed: "bg-indigo-50 text-indigo-700",
    shipped: "bg-sky-50 text-sky-700",
    out_for_delivery: "bg-orange-50 text-orange-700",
    delivered: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-700",
    returned: "bg-rose-50 text-rose-700",
    refunded: "bg-gray-100 text-gray-600",
  };

  return styles[String(status || "").toLowerCase()] ||
    "bg-gray-100 text-gray-600";
};

const formatStatus = (status) => {
  return String(status || "Unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/* -----------------------------------------
   STAT CARD
----------------------------------------- */

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  isCurrency = false,
  loading = false,
}) {
  const positive = Number(change) >= 0;

  return (
    <div className="admin-stat-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-[#8C8982]">
            {title}
          </p>

          <h3 className="mt-4 text-[27px] font-semibold tracking-tight text-[#20201D]">
            {loading
              ? "..."
              : isCurrency
                ? formatCurrency(value)
                : formatNumber(value)}
          </h3>

          <p className="mt-2 text-xs text-[#99958D]">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5F0E6] text-[#A98548]">
          <Icon size={20} strokeWidth={1.7} />
        </div>
      </div>

      {change !== undefined && change !== null && (
        <div className="mt-5 flex items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
              positive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {positive ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownRight size={13} />
            )}
            {Math.abs(Number(change))}%
          </span>

          <span className="text-[11px] text-[#A09C94]">
            vs previous period
          </span>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------
   SIDEBAR
----------------------------------------- */

function AdminSidebar({ activePage, setActivePage, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    {
      section: "OVERVIEW",
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          path: "/admin",
        },
        {
          label: "Analytics",
          icon: BarChart3,
          path: "/admin/analytics",
        },
      ],
    },
    {
      section: "MANAGEMENT",
      items: [
        {
          label: "Orders",
          icon: ShoppingBag,
          path: "/admin/orders",
        },
        {
          label: "Products",
          icon: Package,
          path: "/admin/products",
        },
        {
          label: "Categories",
          icon: Layers3,
          path: "/admin/categories",
        },
        {
          label: "Customers",
          icon: Users,
          path: "/admin/customers",
        },
      ],
    },
    {
      section: "PREFERENCES",
      items: [
        {
          label: "Settings",
          icon: Settings,
          path: "/admin/settings",
        },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[265px] flex-col bg-[#11110F] text-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
            type="button"
            onClick={() => setMobileOpen(false)}
            className="text-white/60 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-8">
          {menuItems.map((group) => (
            <div key={group.section} className="mb-9">
              <p className="mb-4 px-3 text-[9px] font-semibold tracking-[0.23em] text-white/35">
                {group.section}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activePage === item.path;

                  return (
                    <button
                      type="button"
                      key={item.path}
                      onClick={() => {
                        setActivePage(item.path);
                        setMobileOpen(false);

                        if (item.path !== "/admin") {
                          navigate(item.path);
                        } else {
                          navigate("/admin");
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[12px] transition-all ${
                        active
                          ? "bg-[#C6A66B]/15 text-[#D8B97E]"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon size={17} strokeWidth={1.7} />

                      <span className="flex-1">{item.label}</span>

                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D4B477]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 p-5">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C6A66B] text-xs font-bold text-[#171612]">
              Z
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                Store Administrator
              </p>
              <p className="mt-1 text-[10px] text-white/40">
                Administrator
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-xs text-white/50 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

/* -----------------------------------------
   REVENUE CHART
----------------------------------------- */

function RevenueChart({ chartData = [] }) {
  const validData = Array.isArray(chartData) ? chartData : [];

  const maxValue = Math.max(
    ...validData.map((item) => Number(item.revenue || 0)),
    1
  );

  return (
    <div className="admin-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-[20px] text-[#25241F]">
            Revenue Overview
          </h3>
          <p className="mt-1 text-xs text-[#99958D]">
            Revenue data supplied by your dashboard API
          </p>
        </div>

        <span className="rounded-md bg-[#F6F1E7] px-3 py-2 text-[10px] font-semibold tracking-wider text-[#A18450]">
          REVENUE
        </span>
      </div>

      {validData.length > 0 ? (
        <div className="mt-8 flex h-[210px] items-end gap-3 overflow-x-auto border-b border-[#EDE9E0] pb-2">
          {validData.map((item, index) => {
            const value = Number(item.revenue || 0);
            const height = Math.max((value / maxValue) * 100, 3);

            return (
              <div
                key={`${item.label || item.date || "day"}-${index}`}
                className="flex min-w-[30px] flex-1 flex-col items-center justify-end gap-2"
              >
                <div className="group relative flex h-[170px] w-full items-end justify-center">
                  <div
                    title={formatCurrency(value)}
                    className="w-full max-w-[38px] rounded-t-md bg-[#C4A46C] transition-all duration-300 hover:bg-[#987644]"
                    style={{ height: `${height}%` }}
                  />
                </div>

                <span className="whitespace-nowrap text-[9px] text-[#99958D]">
                  {item.label || item.date || ""}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 flex h-[210px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E6E0D5] text-center">
          <BarChart3 size={28} className="text-[#C4A46C]" />
          <p className="mt-3 text-sm font-medium text-[#77736B]">
            Revenue chart data unavailable
          </p>
          <p className="mt-1 text-xs text-[#AAA59C]">
            Add revenue_by_day data to your dashboard API response.
          </p>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------
   RECENT ORDERS
----------------------------------------- */

function RecentOrders({ orders = [], onViewAll }) {
  return (
    <div className="admin-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEAE2] px-6 py-5">
        <div>
          <h3 className="font-serif text-[20px] text-[#25241F]">
            Recent Orders
          </h3>
          <p className="mt-1 text-xs text-[#99958D]">
            Latest customer activity
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-[#A18450] hover:text-[#71552C]"
        >
          VIEW ALL <ChevronRight size={15} />
        </button>
      </div>

      {orders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead>
              <tr className="bg-[#FAF9F6] text-[9px] uppercase tracking-[0.16em] text-[#99958D]">
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody>
              {orders.slice(0, 6).map((order, index) => (
                <tr
                  key={order.id || order.order_id || index}
                  className="border-t border-[#F0EDE7] transition hover:bg-[#FAF9F6]"
                >
                  <td className="px-6 py-4 text-xs font-semibold text-[#292821]">
                    #{order.order_id || order.id || "—"}
                  </td>

                  <td className="px-6 py-4">
                    <p className="text-xs font-medium text-[#393831]">
                      {order.customer_name || order.full_name || "Customer"}
                    </p>
                    <p className="mt-1 text-[10px] text-[#A19D95]">
                      {order.email || order.phone || ""}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-[11px] text-[#8F8B83]">
                    {order.created_at
                      ? new Date(order.created_at).toLocaleDateString("en-IN")
                      : "—"}
                  </td>

                  <td className="px-6 py-4 text-xs font-semibold text-[#292821]">
                    {formatCurrency(order.total)}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-[9px] font-semibold ${getStatusStyle(
                        order.status
                      )}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-14 text-center">
          <ShoppingBag
            size={30}
            className="mx-auto text-[#C7B58F]"
            strokeWidth={1.4}
          />

          <p className="mt-3 text-sm font-medium text-[#77736B]">
            No recent orders available
          </p>

          <p className="mt-1 text-xs text-[#AAA59C]">
            Orders will appear here when the API returns recent_orders.
          </p>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------
   MAIN DASHBOARD
----------------------------------------- */

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePage, setActivePage] = useState("/admin");

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/dashboard/");

      const result = response.data?.data || response.data;

      setDashboard(result);
    } catch (err) {
      console.error("Admin dashboard error:", err);

      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Unable to load dashboard information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = dashboard?.stats || dashboard || {};

  const recentOrders = Array.isArray(dashboard?.recent_orders)
    ? dashboard.recent_orders
    : Array.isArray(dashboard?.orders)
      ? dashboard.orders
      : [];

  const revenueData = Array.isArray(dashboard?.revenue_by_day)
    ? dashboard.revenue_by_day
    : [];

  const adminName =
    user?.first_name ||
    user?.full_name ||
    user?.username ||
    "Administrator";

  const statCards = [
    {
      title: "Total Revenue",
      value: stats.total_revenue,
      change: stats.revenue_change,
      description: "Paid orders revenue",
      icon: IndianRupee,
      isCurrency: true,
    },
    {
      title: "Total Orders",
      value: stats.total_orders,
      change: stats.orders_change,
      description: "All recorded orders",
      icon: ShoppingBag,
    },
    {
      title: "Total Customers",
      value: stats.total_customers,
      change: stats.customers_change,
      description: "Registered customers",
      icon: Users,
    },
    {
      title: "Total Products",
      value: stats.total_products,
      change: stats.products_change,
      description: "Products in catalogue",
      icon: Package,
    },
  ];

  return (
    <div className="admin-root min-h-screen bg-[#F5F4F0] text-[#25241F]">
      <style>{`
        .admin-root {
          font-family: 'DM Sans', sans-serif;
        }

        .admin-root .admin-panel {
          background: #FFFFFF;
          border: 1px solid #EDEAE3;
          border-radius: 13px;
          box-shadow: 0 3px 18px rgba(35, 32, 25, 0.025);
        }

        .admin-root .admin-stat-card {
          background: #FFFFFF;
          border: 1px solid #EDEAE3;
          border-radius: 13px;
          padding: 22px;
          box-shadow: 0 3px 18px rgba(35, 32, 25, 0.025);
          transition: transform .25s ease, box-shadow .25s ease;
        }

        .admin-root .admin-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(35, 32, 25, 0.06);
        }

        .admin-root .admin-serif {
          font-family: 'Playfair Display', serif;
        }

        .admin-root button {
          cursor: pointer;
        }
      `}</style>

      <AdminSidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main className="min-h-screen lg:ml-[265px]">
        {/* HEADER */}

        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#EAE7E0] bg-white/95 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="text-[#44413A] lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-[9px] font-semibold tracking-[0.2em] text-[#A18A60]">
                NAZEER GARMENTS
              </p>
              <h2 className="mt-1 text-sm font-semibold text-[#25241F]">
                Admin Overview
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-2 rounded-lg border border-[#EAE7E0] px-3 py-2 md:flex">
              <CalendarDays size={14} className="text-[#A18A60]" />
              <span className="text-[10px] text-[#77736B]">
                {new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              title="Refresh dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#EAE7E0] text-[#77736B] transition hover:bg-[#F6F1E7] hover:text-[#9A7844]"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
            </button>

            <button
              type="button"
              title="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#EAE7E0] text-[#77736B]"
            >
              <Bell size={16} />
              <span className="absolute right-[7px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#C6A66B]" />
            </button>

            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#171713] text-xs font-semibold text-[#D4B477] sm:flex">
              {adminName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* CONTENT */}

        <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">
          {/* PAGE TITLE */}

          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.22em] text-[#A58A5B]">
                CONTROL CENTRE
              </p>

              <h1 className="admin-serif mt-2 text-[32px] leading-tight text-[#24231F] sm:text-[38px]">
                Welcome back, {adminName}
              </h1>

              <p className="mt-2 text-xs text-[#99958D]">
                Here's what's happening with your store today.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/orders")}
              className="flex items-center gap-2 rounded-lg bg-[#171713] px-5 py-3 text-[10px] font-semibold tracking-[0.13em] text-white transition hover:bg-[#A18450]"
            >
              <ShoppingBag size={14} />
              MANAGE ORDERS
              <ArrowUpRight size={14} />
            </button>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-red-600" />
                <p className="text-xs text-red-700">{error}</p>
              </div>

              <button
                type="button"
                onClick={loadDashboard}
                className="text-xs font-semibold text-red-700 underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* STAT CARDS */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <StatCard
                key={card.title}
                {...card}
                loading={loading}
              />
            ))}
          </div>

          {/* SECONDARY INFO */}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="admin-panel flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 size={20} />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#99958D]">
                  Pending Orders
                </p>
                <h3 className="mt-1 text-xl font-semibold">
                  {loading ? "..." : formatNumber(stats.pending_orders)}
                </h3>
              </div>
            </div>

            <div className="admin-panel flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Truck size={20} />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#99958D]">
                  Shipped Orders
                </p>
                <h3 className="mt-1 text-xl font-semibold">
                  {loading ? "..." : formatNumber(stats.shipped_orders)}
                </h3>
              </div>
            </div>

            <div className="admin-panel flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle size={20} />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#99958D]">
                  Low Stock Products
                </p>
                <h3 className="mt-1 text-xl font-semibold">
                  {loading ? "..." : formatNumber(stats.low_stock_products)}
                </h3>
              </div>
            </div>
          </div>

          {/* CHART + QUICK SUMMARY */}

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
            <RevenueChart chartData={revenueData} />

            <div className="admin-panel p-6">
              <h3 className="font-serif text-[20px] text-[#25241F]">
                Order Summary
              </h3>

              <p className="mt-1 text-xs text-[#99958D]">
                Current order status overview
              </p>

              <div className="mt-7 space-y-5">
                {[
                  {
                    label: "Delivered",
                    value: stats.delivered_orders,
                    icon: CheckCircle2,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "Processing",
                    value: stats.processing_orders,
                    icon: Clock3,
                    color: "bg-violet-500",
                  },
                  {
                    label: "Shipped",
                    value: stats.shipped_orders,
                    icon: Truck,
                    color: "bg-sky-500",
                  },
                  {
                    label: "Cancelled",
                    value: stats.cancelled_orders,
                    icon: XCircle,
                    color: "bg-red-500",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2 w-2 rounded-full ${item.color}`}
                        />

                        <span className="text-xs text-[#77736B]">
                          {item.label}
                        </span>
                      </div>

                      <span className="text-sm font-semibold text-[#302F29]">
                        {loading ? "..." : formatNumber(item.value)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => navigate("/admin/orders")}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-[#E9E4DA] py-3 text-[10px] font-semibold tracking-wider text-[#8C7044] transition hover:bg-[#F8F5EF]"
              >
                VIEW ORDER MANAGEMENT
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* RECENT ORDERS */}

          <div className="mt-6">
            <RecentOrders
              orders={recentOrders}
              onViewAll={() => navigate("/admin/orders")}
            />
          </div>

          {/* FOOTER */}

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E3DA] py-6">
            <p className="text-[10px] tracking-wide text-[#AAA59C]">
              © {new Date().getFullYear()} NAZEER GARMENTS. ALL RIGHTS RESERVED.
            </p>

            <p className="text-[10px] tracking-wide text-[#AAA59C]">
              CRAFTED WITH PRECISION.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

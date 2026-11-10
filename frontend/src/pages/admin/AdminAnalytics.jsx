
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, IndianRupee, ShoppingBag, Users, Package } from "lucide-react";
import api from "../../services/api";
import AdminShell from "../../components/admin/AdminShell";

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/analytics/");
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary || {};
  const revenue = data?.revenue_by_day || [];
  const maxRevenue = Math.max(...revenue.map(x => Number(x.revenue || 0)), 1);

  const cards = [
    { label: "Total Revenue", value: money(summary.total_revenue), icon: IndianRupee },
    { label: "All Orders", value: summary.total_orders ?? 0, icon: ShoppingBag },
    { label: "Customers", value: summary.total_customers ?? 0, icon: Users },
    { label: "Products", value: summary.total_products ?? 0, icon: Package },
  ];

  return (
    <AdminShell title="Analytics" subtitle="Store revenue, orders and best-selling products over the last 30 days.">
      <div className="mb-5 flex justify-end">
        <button onClick={load} className="flex items-center gap-2 rounded-lg border border-[#E8E4DB] bg-white px-4 py-3 text-sm"><RefreshCw size={15} /> Refresh</button>
      </div>

      {error && <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-[#EDEAE3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#99958D]">{label}</p>
              <span className="rounded-xl bg-[#F5F0E6] p-3 text-[#A18450]"><Icon size={18} /></span>
            </div>
            <p className="mt-5 text-2xl font-semibold">{loading ? "..." : value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl border border-[#EDEAE3] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl">Daily Revenue</h2>
              <p className="mt-1 text-xs text-[#99958D]">{data?.period?.from || "—"} to {data?.period?.to || "—"}</p>
            </div>
            <span className="rounded-md bg-[#F6F1E7] px-3 py-2 text-[10px] font-semibold text-[#A18450]">30 DAYS</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-sm text-gray-500">Loading chart...</div>
          ) : revenue.length === 0 ? (
            <div className="py-20 text-center text-sm text-gray-500">No revenue data for this period.</div>
          ) : (
            <div className="mt-8 flex h-64 items-end gap-2 overflow-x-auto border-b border-[#EDE9E0] pb-2">
              {revenue.map((item) => {
                const value = Number(item.revenue || 0);
                const height = Math.max((value / maxRevenue) * 100, 2);
                return (
                  <div key={item.date} className="flex min-w-[30px] flex-1 flex-col items-center justify-end gap-2">
                    <div className="group relative flex h-52 w-full items-end justify-center">
                      <div title={`${item.date}: ${money(value)}`} className="w-full max-w-[38px] rounded-t bg-[#C4A46C] transition hover:bg-[#987644]" style={{ height: `${height}%` }} />
                    </div>
                    <span className="text-[9px] text-[#99958D]">{item.date?.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#EDEAE3] bg-white p-6">
          <h2 className="font-serif text-xl">Orders by Status</h2>
          <p className="mt-1 text-xs text-[#99958D]">Current order distribution</p>
          <div className="mt-6 space-y-4">
            {(data?.orders_by_status || []).map(row => {
              const total = Number(summary.total_orders || 0);
              const percent = total ? (Number(row.count) / total) * 100 : 0;
              return (
                <div key={row.status}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="capitalize text-[#77736B]">{String(row.status).replaceAll("_", " ")}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#F0EDE7]">
                    <div className="h-full rounded-full bg-[#C4A46C]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
            {!loading && !(data?.orders_by_status || []).length && <p className="text-sm text-gray-500">No order data available.</p>}
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-[#EDEAE3] bg-white">
        <div className="border-b border-[#EEEAE2] px-5 py-4">
          <h2 className="font-serif text-xl">Top Selling Products</h2>
          <p className="mt-1 text-xs text-[#99958D]">Based on paid and delivered orders</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-left">
            <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-wider text-[#99958D]">
              <tr><th className="px-5 py-4">Product</th><th className="px-5 py-4">Quantity Sold</th><th className="px-5 py-4">Revenue</th></tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE7]">
              {(data?.top_products || []).map((p, i) => (
                <tr key={`${p.name}-${i}`}>
                  <td className="px-5 py-4 text-sm font-semibold">{p.name}</td>
                  <td className="px-5 py-4 text-sm">{p.quantity_sold}</td>
                  <td className="px-5 py-4 text-sm font-semibold">{money(p.revenue)}</td>
                </tr>
              ))}
              {!loading && !(data?.top_products || []).length && <tr><td colSpan="3" className="px-5 py-12 text-center text-sm text-gray-500">No sales data available.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

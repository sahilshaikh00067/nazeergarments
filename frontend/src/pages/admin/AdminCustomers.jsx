
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, UserRound, ShieldCheck, ShieldOff } from "lucide-react";
import api from "../../services/api";
import AdminShell from "../../components/admin/AdminShell";

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/customers/");
      setCustomers(res.data?.customers || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter(c =>
      [c.name, c.email, c.phone].some(v => String(v || "").toLowerCase().includes(q))
    );
  }, [customers, search]);

  const toggleStatus = async (customer) => {
    const next = !customer.is_active;
    const action = next ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${action} ${customer.name}?`)) return;

    try {
      await api.patch(`/admin/customers/${customer.id}/status/`, {
        is_active: next,
      });
      setNotice(`Customer ${action}d successfully.`);
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to update customer.");
    }
  };

  return (
    <AdminShell title="Customers" subtitle="View registered customers, order activity and account status.">
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#EDEAE3] bg-white p-5">
          <p className="text-xs text-[#99958D]">Registered Customers</p>
          <p className="mt-3 text-2xl font-semibold text-[#A18450]">{customers.length}</p>
        </div>
        <div className="rounded-xl border border-[#EDEAE3] bg-white p-5">
          <p className="text-xs text-[#99958D]">Active Accounts</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-700">{customers.filter(c => c.is_active).length}</p>
        </div>
        <div className="rounded-xl border border-[#EDEAE3] bg-white p-5">
          <p className="text-xs text-[#99958D]">Inactive Accounts</p>
          <p className="mt-3 text-2xl font-semibold text-red-600">{customers.filter(c => !c.is_active).length}</p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#99958D]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or phone..." className="w-full rounded-lg border border-[#E8E4DB] bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#C6A66B]" />
        </div>
        <button onClick={load} className="flex items-center justify-center gap-2 rounded-lg border border-[#E8E4DB] bg-white px-5 py-3 text-sm"><RefreshCw size={15} /> Refresh</button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <div className="overflow-hidden rounded-xl border border-[#EDEAE3] bg-white">
        <div className="border-b border-[#EEEAE2] px-5 py-4 text-sm font-semibold">
          Customer Directory <span className="ml-2 text-xs font-normal text-[#99958D]">{filtered.length} customers</span>
        </div>
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-500">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-wider text-[#99958D]">
                <tr>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Orders</th>
                  <th className="px-5 py-4">Total Spent</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4">Account</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE7]">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-[#FAF9F6]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F0E6] text-[#A18450]"><UserRound size={16} /></span>
                        <div>
                          <p className="text-sm font-semibold">{c.name || "Customer"}</p>
                          <p className="text-xs text-[#99958D]">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm">{c.phone || "—"}</td>
                    <td className="px-5 py-4 text-sm">{c.total_orders ?? 0}</td>
                    <td className="px-5 py-4 text-sm font-semibold">{money(c.total_spent)}</td>
                    <td className="px-5 py-4 text-xs text-[#77736B]">{c.joined_at ? new Date(c.joined_at).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleStatus(c)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${c.is_active ? "border-red-100 text-red-600 hover:bg-red-50" : "border-emerald-100 text-emerald-700 hover:bg-emerald-50"}`}>
                        {c.is_active ? <><ShieldOff size={14} /> Deactivate</> : <><ShieldCheck size={14} /> Activate</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

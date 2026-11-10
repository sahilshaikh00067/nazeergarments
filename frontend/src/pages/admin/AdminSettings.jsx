
import { useEffect, useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import AdminShell from "../../components/admin/AdminShell";

const KEY = "zazeer_admin_preferences";

const defaults = {
  storeName: "Nazeer Garments",
  supportEmail: "",
  supportPhone: "",
  currency: "INR",
  lowStockAlert: true,
  orderNotifications: true,
  compactTable: false,
};

export default function AdminSettings() {
  const [form, setForm] = useState(defaults);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setForm({ ...defaults, ...JSON.parse(saved) });
    } catch {
      setForm(defaults);
    }
  }, []);

  const update = (key, value) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const save = (e) => {
    e.preventDefault();
    localStorage.setItem(KEY, JSON.stringify(form));
    setNotice("Preferences saved in this browser.");
  };

  const reset = () => {
    if (!window.confirm("Reset these browser preferences?")) return;
    localStorage.removeItem(KEY);
    setForm(defaults);
    setNotice("Preferences reset.");
  };

  return (
    <AdminShell title="Settings" subtitle="Manage preferences for this admin browser.">
      <form onSubmit={save} className="space-y-6">
        <section className="rounded-xl border border-[#EDEAE3] bg-white p-6">
          <h2 className="font-serif text-xl">Store Information</h2>
          <p className="mt-1 text-xs text-[#99958D]">Browser-side admin display preferences.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-[#77736B]">
              Store name
              <input value={form.storeName} onChange={e => update("storeName", e.target.value)} className="mt-2 w-full rounded-lg border border-[#E8E4DB] px-3 py-3 text-sm" />
            </label>
            <label className="text-xs text-[#77736B]">
              Currency
              <select value={form.currency} onChange={e => update("currency", e.target.value)} className="mt-2 w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-3 text-sm">
                <option value="INR">INR — Indian Rupee</option>
              </select>
            </label>
            <label className="text-xs text-[#77736B]">
              Support email
              <input type="email" value={form.supportEmail} onChange={e => update("supportEmail", e.target.value)} className="mt-2 w-full rounded-lg border border-[#E8E4DB] px-3 py-3 text-sm" />
            </label>
            <label className="text-xs text-[#77736B]">
              Support phone
              <input value={form.supportPhone} onChange={e => update("supportPhone", e.target.value)} className="mt-2 w-full rounded-lg border border-[#E8E4DB] px-3 py-3 text-sm" />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-[#EDEAE3] bg-white p-6">
          <h2 className="font-serif text-xl">Admin Preferences</h2>
          <div className="mt-5 space-y-5">
            {[
              ["lowStockAlert", "Low stock reminders", "Show low stock related reminders in the admin workflow."],
              ["orderNotifications", "Order notifications preference", "Preference only; notification delivery is not connected yet."],
              ["compactTable", "Compact table preference", "Save a compact-table preference for future admin UI use."],
            ].map(([key, label, description]) => (
              <label key={key} className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="mt-1 block text-xs text-[#99958D]">{description}</span>
                </span>
                <input type="checkbox" checked={form[key]} onChange={e => update(key, e.target.checked)} className="mt-1 h-4 w-4 accent-[#A18450]" />
              </label>
            ))}
          </div>
        </section>

        {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={reset} className="flex items-center gap-2 rounded-lg border border-[#E8E4DB] bg-white px-5 py-3 text-sm"><RotateCcw size={15} /> Reset</button>
          <button className="flex items-center gap-2 rounded-lg bg-[#171713] px-6 py-3 text-sm text-white"><Save size={15} /> Save Preferences</button>
        </div>
      </form>
    </AdminShell>
  );
}

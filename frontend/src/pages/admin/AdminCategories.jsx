
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import api from "../../services/api";
import AdminShell from "../../components/admin/AdminShell";

const blank = { name: "", parent: "", is_active: true, sort_order: 0 };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/categories/");
      setCategories(res.data?.categories || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setEditing(null);
    setForm(blank);
    setOpen(true);
    setError("");
  };

  const startEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      parent: item.parent ? String(item.parent) : "",
      is_active: item.is_active,
      sort_order: item.sort_order ?? 0,
    });
    setOpen(true);
    setError("");
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      name: form.name.trim(),
      parent: form.parent ? Number(form.parent) : null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order),
    };

    try {
      if (editing) {
        await api.patch(`/admin/categories/${editing.id}/`, payload);
        setNotice("Category updated successfully.");
      } else {
        await api.post("/admin/categories/", payload);
        setNotice("Category created successfully.");
      }
      setOpen(false);
      await load();
    } catch (e2) {
      setError(
        e2.response?.data?.detail ||
        JSON.stringify(e2.response?.data || "Could not save category.")
      );
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (item) => {
    if (!window.confirm(`Deactivate category "${item.name}"?`)) return;
    try {
      await api.delete(`/admin/categories/${item.id}/`);
      setNotice("Category deactivated.");
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to deactivate category.");
    }
  };

  return (
    <AdminShell title="Categories" subtitle="Organise your product catalogue and category hierarchy.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#EDEAE3] bg-white px-5 py-4">
            <p className="text-xs text-[#99958D]">Total Categories</p>
            <p className="mt-2 text-2xl font-semibold text-[#A18450]">{categories.length}</p>
          </div>
          <div className="rounded-xl border border-[#EDEAE3] bg-white px-5 py-4">
            <p className="text-xs text-[#99958D]">Active</p>
            <p className="mt-2 text-2xl font-semibold text-[#A18450]">{categories.filter(c => c.is_active).length}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-lg border border-[#E8E4DB] bg-white p-3"><RefreshCw size={16} /></button>
          <button onClick={startCreate} className="flex items-center gap-2 rounded-lg bg-[#171713] px-5 py-3 text-sm text-white"><Plus size={16} /> Add Category</button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <div className="overflow-hidden rounded-xl border border-[#EDEAE3] bg-white">
        <div className="border-b border-[#EEEAE2] px-5 py-4 text-sm font-semibold">All Categories</div>
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-500">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500">No categories created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-wider text-[#99958D]">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Slug</th>
                  <th className="px-5 py-4">Products</th>
                  <th className="px-5 py-4">Sort Order</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE7]">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF9F6]">
                    <td className="px-5 py-4 text-sm font-semibold">{c.name}</td>
                    <td className="px-5 py-4 text-xs text-[#99958D]">{c.slug}</td>
                    <td className="px-5 py-4 text-sm">{c.product_count ?? 0}</td>
                    <td className="px-5 py-4 text-sm">{c.sort_order}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(c)} className="rounded-md border border-[#E8E4DB] p-2 text-[#8B7045]"><Pencil size={15} /></button>
                        <button onClick={() => deactivate(c)} className="rounded-md border border-red-100 p-2 text-red-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={save} className="w-full max-w-lg rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editing ? "Edit Category" : "New Category"}</h2>
              <button type="button" onClick={() => setOpen(false)}>✕</button>
            </div>
            <label className="block text-xs text-[#77736B]">
              Category name
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-2 w-full rounded-lg border border-[#E8E4DB] px-3 py-3 text-sm" />
            </label>
            <label className="mt-4 block text-xs text-[#77736B]">
              Parent category (optional)
              <select value={form.parent} onChange={e => setForm(p => ({ ...p, parent: e.target.value }))} className="mt-2 w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-3 text-sm">
                <option value="">No parent</option>
                {categories.filter(c => c.id !== editing?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-xs text-[#77736B]">
              Sort order
              <input type="number" min="0" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} className="mt-2 w-full rounded-lg border border-[#E8E4DB] px-3 py-3 text-sm" />
            </label>
            <label className="mt-4 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
              Active category
            </label>
            <button disabled={saving} className="mt-7 w-full rounded-lg bg-[#171713] py-3 text-sm text-white disabled:opacity-50">{saving ? "Saving..." : "Save Category"}</button>
          </form>
        </div>
      )}
    </AdminShell>
  );
}


import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, RefreshCw, Pencil, Trash2, X, Boxes } from "lucide-react";
import api from "../../services/api";
import AdminShell from "../../components/admin/AdminShell";

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const emptyForm = {
  name: "",
  category: "",
  description: "",
  brand: "",
  fabric: "",
  mrp: "",
  price: "",
  low_stock_threshold: 5,
  is_active: true,
  is_featured: false,
  is_bestseller: false,
  is_new: false,
  specs: "{}",
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [variantProduct, setVariantProduct] = useState(null);
  const [variantForm, setVariantForm] = useState({
    sku: "",
    size: "",
    color: "",
    price_override: "",
    stock: 0,
    is_available: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productRes, categoryRes] = await Promise.all([
        api.get("/admin/products/"),
        api.get("/admin/categories/"),
      ]);
      setProducts(
        productRes.data?.products || productRes.data?.results || []
      );
      setCategories(
        categoryRes.data?.categories || categoryRes.data?.results || []
      );
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          "Products could not be loaded. Check the admin API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) =>
      [p.name, p.brand, p.category_name, p.slug]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [products, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      category: categories[0]?.id ? String(categories[0].id) : "",
    });
    setModal(true);
    setError("");
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      category: String(p.category || ""),
      description: p.description || "",
      brand: p.brand || "",
      fabric: p.fabric || "",
      mrp: p.mrp ?? "",
      price: p.price ?? "",
      low_stock_threshold: p.low_stock_threshold ?? 5,
      is_active: Boolean(p.is_active),
      is_featured: Boolean(p.is_featured),
      is_bestseller: Boolean(p.is_bestseller),
      is_new: Boolean(p.is_new),
      specs: JSON.stringify(p.specs || {}, null, 2),
    });
    setModal(true);
    setError("");
  };

  const update = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const saveProduct = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!form.category) {
      setError("Please create/select a category first.");
      return;
    }

    let specs;
    try {
      specs = JSON.parse(form.specs || "{}");
      if (!specs || Array.isArray(specs) || typeof specs !== "object") {
        throw new Error("Specs must be a JSON object.");
      }
    } catch {
      setError("Specs must be valid JSON, for example: {\"fit\":\"Regular\"}");
      return;
    }

    const payload = {
      ...form,
      category: Number(form.category),
      mrp: Number(form.mrp),
      price: Number(form.price),
      low_stock_threshold: Number(form.low_stock_threshold),
      specs,
    };

    try {
      setSaving(true);
      if (editing) {
        await api.patch(`/admin/products/${editing.id}/`, payload);
        setNotice("Product updated successfully.");
      } else {
        await api.post("/admin/products/", payload);
        setNotice("Product created successfully.");
      }
      setModal(false);
      await loadData();
    } catch (e2) {
      const data = e2.response?.data;
      setError(
        data?.detail ||
          (data && typeof data === "object"
            ? Object.entries(data)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                .join(" | ")
            : "Unable to save product.")
      );
    } finally {
      setSaving(false);
    }
  };

  const deactivateProduct = async (p) => {
    if (!window.confirm(`Deactivate "${p.name}"?`)) return;
    try {
      await api.delete(`/admin/products/${p.id}/`);
      setNotice("Product deactivated. Existing order history is preserved.");
      await loadData();
    } catch (e) {
      setError(e.response?.data?.detail || "Could not deactivate product.");
    }
  };

  const addVariant = async (e) => {
    e.preventDefault();
    if (!variantProduct) return;
    try {
      setSaving(true);
      await api.post(
        `/admin/products/${variantProduct.id}/variants/`,
        {
          ...variantForm,
          stock: Number(variantForm.stock),
          price_override:
            variantForm.price_override === ""
              ? null
              : Number(variantForm.price_override),
        }
      );
      setVariantProduct(null);
      setVariantForm({
        sku: "",
        size: "",
        color: "",
        price_override: "",
        stock: 0,
        is_available: true,
      });
      setNotice("Variant added successfully.");
      await loadData();
    } catch (e2) {
      setError(
        e2.response?.data?.detail ||
          JSON.stringify(e2.response?.data || "Could not add variant.")
      );
    } finally {
      setSaving(false);
    }
  };

  const changeVariant = async (variant, product) => {
    const nextStock = window.prompt(
      `Enter new stock quantity for ${variant.sku}:`,
      String(variant.stock)
    );
    if (nextStock === null) return;
    if (!/^\d+$/.test(nextStock)) {
      setError("Stock must be a whole number zero or greater.");
      return;
    }
    try {
      await api.patch(`/admin/variants/${variant.id}/`, {
        stock: Number(nextStock),
      });
      setNotice(`Stock updated for ${product.name}.`);
      await loadData();
    } catch (e) {
      setError(e.response?.data?.detail || "Stock update failed.");
    }
  };

  return (
    <AdminShell
      title="Products"
      subtitle="Create products, update prices and manage inventory variants."
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total Products", products.length],
          ["Active", products.filter((p) => p.is_active).length],
          ["Inactive", products.filter((p) => !p.is_active).length],
          [
            "Low Stock",
            products.filter(
              (p) => Number(p.total_stock || 0) <= Number(p.low_stock_threshold || 5)
            ).length,
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#EDEAE3] bg-white p-5">
            <p className="text-xs text-[#99958D]">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-[#A18450]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#99958D]" size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, brand or category..."
            className="w-full rounded-lg border border-[#E8E4DB] bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#C6A66B]"
          />
        </div>
        <button
          onClick={loadData}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#E8E4DB] bg-white px-4 py-3 text-sm"
        >
          <RefreshCw size={15} /> Refresh
        </button>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#171713] px-5 py-3 text-sm text-white hover:bg-[#A18450]"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <div className="overflow-hidden rounded-xl border border-[#EDEAE3] bg-white">
        <div className="border-b border-[#EEEAE2] px-5 py-4 text-sm font-semibold">
          Product Catalogue <span className="ml-2 text-xs font-normal text-[#99958D]">{filtered.length} items</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm text-gray-500">Loading products...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500">No products found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-wider text-[#99958D]">
                <tr>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Price / MRP</th>
                  <th className="px-5 py-4">Stock</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE7]">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF9F6]">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="mt-1 text-xs text-[#99958D]">{p.brand || "No brand"} · #{p.id}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#77736B]">{p.category_name || "—"}</td>
                    <td className="px-5 py-4 text-sm">
                      <p className="font-semibold">{money(p.price)}</p>
                      <p className="text-xs text-[#99958D]">MRP {money(p.mrp)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold">{p.total_stock ?? "—"}</p>
                      <p className="text-xs text-[#99958D]">{p.variants?.length || 0} variants</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openEdit(p)} className="rounded-md border border-[#E8E4DB] p-2 text-[#8B7045]" title="Edit product"><Pencil size={15} /></button>
                        <button onClick={() => setVariantProduct(p)} className="rounded-md border border-[#E8E4DB] p-2 text-[#8B7045]" title="Add variant"><Boxes size={15} /></button>
                        <button onClick={() => deactivateProduct(p)} className="rounded-md border border-red-100 p-2 text-red-600" title="Deactivate"><Trash2 size={15} /></button>
                      </div>
                      {p.variants?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.variants.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => changeVariant(v, p)}
                              title="Click to update stock"
                              className="rounded bg-[#F5F0E6] px-2 py-1 text-[10px] text-[#8B7045]"
                            >
                              {v.sku}: {v.stock}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <form onSubmit={saveProduct} className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#A18450]">PRODUCT CATALOGUE</p>
                <h2 className="mt-1 text-xl font-semibold">{editing ? "Edit Product" : "Create Product"}</h2>
              </div>
              <button type="button" onClick={() => setModal(false)}><X /></button>
            </div>

            {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["name", "Product name", "text"],
                ["brand", "Brand", "text"],
                ["fabric", "Fabric", "text"],
                ["mrp", "MRP", "number"],
                ["price", "Selling price", "number"],
                ["low_stock_threshold", "Low stock threshold", "number"],
              ].map(([key, label, type]) => (
                <label key={key} className="text-xs text-[#77736B]">
                  {label}
                  <input
                    required={["name", "mrp", "price"].includes(key)}
                    type={type}
                    min={type === "number" ? "0" : undefined}
                    step={["mrp", "price"].includes(key) ? "0.01" : "1"}
                    value={form[key]}
                    onChange={(e) => update(key, e.target.value)}
                    className="mt-2 w-full rounded-lg border border-[#E8E4DB] px-3 py-3 text-sm text-[#25241F] outline-none focus:border-[#C6A66B]"
                  />
                </label>
              ))}

              <label className="text-xs text-[#77736B] sm:col-span-2">
                Category
                <select required value={form.category} onChange={(e) => update("category", e.target.value)} className="mt-2 w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-3 text-sm">
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>

              <label className="text-xs text-[#77736B] sm:col-span-2">
                Description
                <textarea rows="3" value={form.description} onChange={(e) => update("description", e.target.value)} className="mt-2 w-full rounded-lg border border-[#E8E4DB] px-3 py-3 text-sm" />
              </label>

              <label className="text-xs text-[#77736B] sm:col-span-2">
                Specs (JSON object)
                <textarea rows="4" value={form.specs} onChange={(e) => update("specs", e.target.value)} className="mt-2 w-full rounded-lg border border-[#E8E4DB] px-3 py-3 font-mono text-xs" />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-4">
              {[
                ["is_active", "Active"],
                ["is_featured", "Featured"],
                ["is_bestseller", "Bestseller"],
                ["is_new", "New arrival"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form[key]} onChange={(e) => update(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(false)} className="rounded-lg border px-5 py-3 text-sm">Cancel</button>
              <button disabled={saving} className="rounded-lg bg-[#171713] px-6 py-3 text-sm text-white disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {variantProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={addVariant} className="w-full max-w-lg rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Variant — {variantProduct.name}</h2>
              <button type="button" onClick={() => setVariantProduct(null)}><X /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["sku", "SKU", "text"],
                ["size", "Size", "text"],
                ["color", "Color", "text"],
                ["stock", "Stock", "number"],
                ["price_override", "Price override (optional)", "number"],
              ].map(([key, label, type]) => (
                <label key={key} className="text-xs text-[#77736B]">
                  {label}
                  <input
                    required={key === "sku"}
                    type={type}
                    min={type === "number" ? "0" : undefined}
                    step={key === "price_override" ? "0.01" : "1"}
                    value={variantForm[key]}
                    onChange={(e) => setVariantForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="mt-2 w-full rounded-lg border border-[#E8E4DB] px-3 py-3 text-sm"
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={variantForm.is_available} onChange={(e) => setVariantForm((p) => ({ ...p, is_available: e.target.checked }))} />
              Available for sale
            </label>
            <button disabled={saving} className="mt-6 w-full rounded-lg bg-[#171713] py-3 text-sm text-white">
              {saving ? "Saving..." : "Add Variant"}
            </button>
          </form>
        </div>
      )}
    </AdminShell>
  );
}

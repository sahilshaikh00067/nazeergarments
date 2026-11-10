
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

const statusColors = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  processing: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  packed: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  shipped: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  out_for_delivery: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    status: "pending",
    courier: "",
    tracking_number: "",
  });

  const fetchOrders = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/admin/orders/");
      const data = response.data;

      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Orders load nahi ho paaye. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        String(order.order_id || "").toLowerCase().includes(searchText) ||
        String(order.name || order.customer_name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(order.phone || "").toLowerCase().includes(searchText) ||
        String(order.email || "").toLowerCase().includes(searchText);

      const matchesStatus =
        filterStatus === "all" || order.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      processing: orders.filter(
        (o) => ["confirmed", "processing", "packed"].includes(o.status)
      ).length,
      shipped: orders.filter(
        (o) => ["shipped", "out_for_delivery"].includes(o.status)
      ).length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    };
  }, [orders]);

  const openEditor = (order) => {
    setSelectedOrder(order);
    setSuccess("");
    setForm({
      status: order.status || "pending",
      courier: order.courier || "",
      tracking_number: order.tracking_number || "",
    });
  };

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const saveOrder = async () => {
    if (!selectedOrder) return;

    const orderPk = selectedOrder.id ?? selectedOrder.pk;

    if (!orderPk) {
      setError(
        "Order ka database ID response mein nahi mila. Backend response check karo."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.patch(`/admin/orders/${orderPk}/`, {
        status: form.status,
        courier: form.courier.trim(),
        tracking_number: form.tracking_number.trim(),
      });

      setSuccess("Order successfully updated.");

      await fetchOrders();

      setSelectedOrder(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Order update nahi ho paaya."
      );
    } finally {
      setSaving(false);
    }
  };

  const getItems = (order) =>
    Array.isArray(order.items) ? order.items : [];

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white px-4 py-7 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1500px]">

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-[0.35em] text-[#C6A66B]">
              NAZEER GARMENTS / MANAGEMENT
            </p>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Orders
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Manage customer orders, delivery and tracking information.
            </p>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              fetchOrders();
            }}
            className="rounded-lg border border-white/10 px-5 py-3 text-sm text-gray-300 transition hover:border-[#C6A66B] hover:text-[#C6A66B]"
          >
            ↻ Refresh Orders
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["Total Orders", stats.total],
            ["Pending", stats.pending],
            ["Processing", stats.processing],
            ["Shipped", stats.shipped],
            ["Delivered", stats.delivered],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.07] bg-[#121212] p-5"
            >
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-[#D6B77C]">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Search and filter */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, customer, phone or email..."
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#121212] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#C6A66B]"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#121212] px-4 py-3 text-sm text-gray-300 outline-none focus:border-[#C6A66B]"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {/* Orders table */}
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121212]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <h2 className="text-sm font-semibold">All Orders</h2>
            <span className="text-xs text-gray-500">
              {filteredOrders.length} orders
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-sm text-gray-500">
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-gray-400">No orders found.</p>
              <p className="mt-2 text-xs text-gray-600">
                Try changing your search or filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-white/[0.025] text-[10px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Order</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id ?? order.pk ?? order.order_id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-5">
                        <p className="text-sm font-medium text-[#D6B77C]">
                          {order.order_id || `#${order.id}`}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {getItems(order).length} item(s)
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm text-gray-200">
                          {order.name || order.customer_name || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {order.phone || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-5 text-sm font-medium">
                        {formatPrice(order.total)}
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-xs uppercase text-gray-300">
                          {order.payment_method || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {order.payment_status || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-medium ${
                            statusColors[order.status] ||
                            "border-white/10 bg-white/5 text-gray-400"
                          }`}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-xs text-gray-500">
                        {formatDate(order.created_at)}
                      </td>

                      <td className="px-5 py-5">
                        <button
                          onClick={() => openEditor(order)}
                          className="rounded-md border border-[#C6A66B]/30 px-3 py-2 text-xs text-[#D6B77C] transition hover:bg-[#C6A66B] hover:text-black"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order details and edit modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
            <div className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#151515] shadow-2xl">

              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <p className="text-[10px] tracking-[0.25em] text-[#C6A66B]">
                    ORDER MANAGEMENT
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {selectedOrder.order_id || `#${selectedOrder.id}`}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-2xl text-gray-500 hover:text-white"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">

                {/* Customer */}
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#C6A66B]">
                    Customer Details
                  </h3>

                  <div className="grid gap-3 rounded-lg border border-white/[0.07] bg-black/20 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="mt-1 text-sm">{selectedOrder.name || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="mt-1 text-sm">{selectedOrder.phone || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="mt-1 break-all text-sm">{selectedOrder.email || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Payment</p>
                      <p className="mt-1 text-sm">
                        {selectedOrder.payment_method || "—"} /{" "}
                        {selectedOrder.payment_status || "—"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500">Delivery Address</p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-300">
                        {[
                          selectedOrder.address,
                          selectedOrder.city,
                          selectedOrder.state,
                          selectedOrder.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Products */}
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#C6A66B]">
                    Ordered Products
                  </h3>

                  <div className="space-y-2">
                    {getItems(selectedOrder).length ? (
                      getItems(selectedOrder).map((item, index) => (
                        <div
                          key={item.id || index}
                          className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.07] p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {item.name || "Product"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {[item.size, item.color]
                                .filter(Boolean)
                                .join(" / ")}
                              {" "}· Qty: {item.quantity || 1}
                            </p>
                          </div>

                          <p className="whitespace-nowrap text-sm text-[#D6B77C]">
                            {formatPrice(
                              Number(item.unit_price || 0) *
                                Number(item.quantity || 1)
                            )}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No product details available.
                      </p>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 rounded-lg bg-black/20 p-4 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Discount</span>
                      <span>{formatPrice(selectedOrder.discount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Shipping</span>
                      <span>{formatPrice(selectedOrder.shipping)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-3 font-semibold">
                      <span>Total</span>
                      <span className="text-[#D6B77C]">
                        {formatPrice(selectedOrder.total)}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Update order */}
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#C6A66B]">
                    Update Delivery & Status
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs text-gray-400">
                        Order Status
                      </label>

                      <select
                        value={form.status}
                        onChange={(e) =>
                          updateField("status", e.target.value)
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none focus:border-[#C6A66B]"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs text-gray-400">
                        Courier Company
                      </label>

                      <input
                        type="text"
                        value={form.courier}
                        onChange={(e) =>
                          updateField("courier", e.target.value)
                        }
                        placeholder="e.g. Delhivery, Blue Dart, DTDC"
                        className="w-full rounded-lg border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#C6A66B]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs text-gray-400">
                        Tracking Number
                      </label>

                      <input
                        type="text"
                        value={form.tracking_number}
                        onChange={(e) =>
                          updateField("tracking_number", e.target.value)
                        }
                        placeholder="Enter tracking number"
                        className="w-full rounded-lg border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#C6A66B]"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    disabled={saving}
                    className="flex-1 rounded-lg border border-white/10 px-5 py-3 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
                  >
                    Close
                  </button>

                  <button
                    onClick={saveOrder}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-[#C6A66B] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#d8bd89] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

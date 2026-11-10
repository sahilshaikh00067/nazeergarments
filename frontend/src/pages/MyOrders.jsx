import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Package,
  RefreshCw,
} from "lucide-react";

import { api } from "../services/api";

/* -------------------------------------------------------------------------- */
/*  CONFIG + HELPERS                                                          */
/* -------------------------------------------------------------------------- */

const TRACKING_STEPS = [
  { key: "pending", title: "Order Placed", description: "Your order has been received." },
  { key: "confirmed", title: "Order Confirmed", description: "Your order has been confirmed." },
  { key: "processing", title: "Processing", description: "Your items are being prepared." },
  { key: "packed", title: "Packed", description: "Your order has been packed." },
  { key: "shipped", title: "Shipped", description: "Your order has been handed over for delivery." },
  { key: "out_for_delivery", title: "Out for Delivery", description: "Your order is on its way to you." },
  { key: "delivered", title: "Delivered", description: "Your order has been delivered successfully." },
];

const STATUS_ALIASES = { completed: "delivered" };

const TERMINAL_STATUSES = ["cancelled", "return_requested", "returned", "refunded"];

const FILTERS = [
  { id: "all", label: "All orders" },
  { id: "active", label: "In progress" },
  { id: "delivered", label: "Delivered" },
  { id: "closed", label: "Cancelled & returns" },
];

const normalizeStatus = (status) => {
  const value = String(status || "pending").toLowerCase();
  return STATUS_ALIASES[value] || value;
};

const formatStatus = (status) =>
  String(status || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatPrice = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const formatDate = (value, includeTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const getStatusStyle = (status) => {
  const value = normalizeStatus(status);
  if (value === "delivered") return "bg-green-50 text-green-700 border-green-200";
  if (TERMINAL_STATUSES.includes(value)) return "bg-red-50 text-red-700 border-red-200";
  if (["shipped", "out_for_delivery"].includes(value))
    return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const getStatusDot = (status) => {
  const value = normalizeStatus(status);
  if (value === "delivered") return "bg-green-600";
  if (TERMINAL_STATUSES.includes(value)) return "bg-red-600";
  if (["shipped", "out_for_delivery"].includes(value)) return "bg-blue-600";
  return "bg-amber-500";
};

const getPaymentStyle = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "paid") return "bg-green-50 text-green-700";
  if (["failed", "expired", "refunded"].includes(value)) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
};

const getFilterGroup = (status) => {
  const value = normalizeStatus(status);
  if (value === "delivered") return "delivered";
  if (TERMINAL_STATUSES.includes(value)) return "closed";
  return "active";
};

/* -------------------------------------------------------------------------- */
/*  SMALL COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-black hover:text-white"
    >
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
    </button>
  );
}

function SectionHeading({ eyebrow, title, right }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[11px] text-gray-400">{eyebrow}</p>
        <h3 className="mt-1.5 font-luxury text-2xl">{title}</h3>
      </div>
      {right}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  TRACKING TIMELINE (animates when the card opens)                          */
/* -------------------------------------------------------------------------- */

function TrackingTimeline({ status }) {
  const currentStatus = normalizeStatus(status);
  const currentIndex = TRACKING_STEPS.findIndex((s) => s.key === currentStatus);

  if (TERMINAL_STATUSES.includes(currentStatus)) {
    const messages = {
      cancelled: "This order has been cancelled.",
      return_requested: "A return has been requested for this order.",
      returned: "This order has been returned.",
      refunded: "This order has been marked as refunded.",
    };

    return (
      <div className="border border-red-100 bg-red-50/60 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
            <AlertTriangle size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">
              {formatStatus(currentStatus)}
            </p>
            <p className="mt-2 text-xs leading-6 text-red-700">
              {messages[currentStatus] ||
                "This order is no longer in the normal delivery process."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div>
        {TRACKING_STEPS.map((step, index) => {
          const completed = currentIndex >= 0 && index < currentIndex;
          const active = index === currentIndex;
          const upcoming = currentIndex === -1 || index > currentIndex;
          const delay = `${index * 110}ms`;

          return (
            <div key={step.key} className="relative flex min-h-[86px] gap-4">
              {/* connector line: grey base + gold fill that draws in */}
              {index !== TRACKING_STEPS.length - 1 && (
                <div className="absolute left-[15px] top-8 h-[58px] w-[2px] overflow-hidden bg-gray-200">
                  {completed && (
                    <div
                      className="mo-fill h-full w-full bg-[#B89B72]"
                      style={{ "--d": delay }}
                    />
                  )}
                </div>
              )}

              {/* indicator */}
              <div className="relative z-10 shrink-0">
                {active && (
                  <span className="mo-pulse absolute inset-0 rounded-full border-2 border-[#B89B72]" />
                )}
                <div
                  style={{ "--d": delay }}
                  className={`mo-dot relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs ${
                    completed
                      ? "border-[#B89B72] bg-[#B89B72] text-white"
                      : active
                      ? "border-[#B89B72] bg-white text-[#9A7C53]"
                      : "border-gray-200 bg-white text-gray-400"
                  }`}
                >
                  {completed ? <Check size={14} strokeWidth={3} /> : index + 1}
                </div>
              </div>

              {/* text */}
              <div className="pb-7">
                <p
                  className={`text-sm font-medium ${
                    upcoming ? "text-gray-400" : "text-[#24211D]"
                  }`}
                >
                  {step.title}
                  {active && (
                    <span className="ml-2 rounded-full bg-[#B89B72]/15 px-2 py-0.5 text-[10px] font-semibold text-[#9A7C53]">
                      Current
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {currentIndex === -1 && (
        <p className="mt-2 text-[11px] text-gray-400">
          The order has an unrecognized status. Please refresh for the latest
          information.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ORDER ITEM                                                                */
/* -------------------------------------------------------------------------- */

function OrderItem({ item }) {
  const quantity = Number(item.qty ?? item.quantity ?? 1);
  const unitPrice = Number(item.unit_price);
  const lineTotal =
    item.line_total != null
      ? Number(item.line_total)
      : Number.isFinite(unitPrice)
      ? unitPrice * quantity
      : null;

  return (
    <div className="flex flex-col justify-between gap-3 border-b border-black/[0.06] py-4 transition-colors last:border-0 hover:bg-[#FCFBF8] sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-medium text-[#25231F]">
          {item.name || item.product_name || "Product"}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {item.size && (
            <span className="border border-black/10 px-2 py-0.5 text-[11px] text-gray-600">
              Size {item.size}
            </span>
          )}
          {item.color && (
            <span className="border border-black/10 px-2 py-0.5 text-[11px] text-gray-600">
              {item.color}
            </span>
          )}
          <span className="border border-black/10 px-2 py-0.5 text-[11px] text-gray-600">
            Qty {quantity}
          </span>
        </div>

        {item.unit_price != null && (
          <p className="mt-2 text-xs text-gray-400">
            Unit price: {formatPrice(item.unit_price)}
          </p>
        )}
      </div>

      <p className="text-sm font-medium sm:text-right">
        {lineTotal != null ? formatPrice(lineTotal) : "—"}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ORDER DETAILS                                                             */
/* -------------------------------------------------------------------------- */

function OrderDetails({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const status = normalizeStatus(order.status);
  const paymentMethod = String(order.payment_method || "—").toUpperCase();
  const paymentStatus = String(order.payment_status || "unpaid").toLowerCase();
  const trackingNumber = order.tracking_number || order.tracking;

  const orderAddress = [order.address, order.city, order.state, order.pincode]
    .filter(Boolean)
    .join(", ");

  let step = 0;
  const delay = () => ({ transitionDelay: `${120 + step++ * 90}ms` });

  return (
    <div className="border-t border-black/[0.07]">
      {/* Tracking */}
      <section style={delay()} className="mo-sec bg-[#FCFBF8] px-5 py-7 md:px-8">
        <SectionHeading
          eyebrow="Order journey"
          title="Tracking Timeline"
          right={
            <span
              className={`flex items-center gap-2 border px-3 py-2 text-[11px] font-medium ${getStatusStyle(
                status
              )}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(status)}`} />
              {formatStatus(status)}
            </span>
          }
        />

        <div className="mt-7">
          <TrackingTimeline status={status} />
        </div>

        <p className="mt-2 border-t border-black/[0.06] pt-4 text-[11px] leading-5 text-gray-400">
          Tracking updates are based on the latest order status received from
          the store. This timeline does not show the courier's live GPS
          location.
        </p>
      </section>

      {/* Items */}
      <section style={delay()} className="mo-sec px-5 py-7 md:px-8">
        <SectionHeading
          eyebrow="Your selection"
          title="Order Items"
          right={
            <span className="text-xs text-gray-500">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          }
        />

        <div className="mt-3">
          {items.length > 0 ? (
            items.map((item, i) => (
              <OrderItem key={item.id ?? `${item.name}-${i}`} item={item} />
            ))
          ) : (
            <p className="py-5 text-sm text-gray-500">
              Product details are not available.
            </p>
          )}
        </div>
      </section>

      {/* Payment + Summary */}
      <section
        style={delay()}
        className="mo-sec border-t border-black/[0.06] bg-[#FCFBF8] px-5 py-7 md:px-8"
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <p className="text-[11px] text-gray-400">Transaction</p>
            <h3 className="mb-5 mt-1.5 font-luxury text-2xl">Payment Details</h3>

            <div className="space-y-4">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-gray-500">Payment method</span>
                <span className="font-medium">{paymentMethod}</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">Payment status</span>
                <span
                  className={`px-3 py-1 text-[11px] font-medium ${getPaymentStyle(
                    paymentStatus
                  )}`}
                >
                  {formatStatus(paymentStatus)}
                </span>
              </div>

              {order.razorpay_payment_id && (
                <div className="text-sm">
                  <p className="mb-1 text-gray-500">Payment reference</p>
                  <div className="flex items-center gap-2">
                    <p className="break-all text-xs font-medium">
                      {order.razorpay_payment_id}
                    </p>
                    <CopyButton
                      value={order.razorpay_payment_id}
                      label="payment reference"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[11px] text-gray-400">Amount breakdown</p>
            <h3 className="mb-5 mt-1.5 font-luxury text-2xl">Order Summary</h3>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Discount</span>
                <span className="text-green-700">
                  - {formatPrice(order.discount ?? 0)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Shipping</span>
                <span>{formatPrice(order.shipping ?? 0)}</span>
              </div>

              <div className="flex justify-between gap-3 border-t border-black/10 pt-4">
                <span className="font-semibold">Total amount</span>
                <span className="font-luxury text-xl font-semibold">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shipment */}
      {(trackingNumber || order.courier) && (
        <section
          style={delay()}
          className="mo-sec border-t border-black/[0.06] px-5 py-7 md:px-8"
        >
          <p className="text-[11px] text-gray-400">Delivery information</p>
          <h3 className="mb-5 mt-1.5 font-luxury text-2xl">Shipment Details</h3>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {order.courier && (
              <div>
                <p className="text-[11px] text-gray-400">Courier partner</p>
                <p className="mt-2 text-sm font-medium">{order.courier}</p>
              </div>
            )}

            {trackingNumber && (
              <div>
                <p className="text-[11px] text-gray-400">Tracking number</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="break-all text-sm font-medium">{trackingNumber}</p>
                  <CopyButton value={trackingNumber} label="tracking number" />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Address */}
      {(orderAddress || order.customer_name || order.phone || order.email) && (
        <section
          style={delay()}
          className="mo-sec border-t border-black/[0.06] px-5 py-7 md:px-8"
        >
          <p className="text-[11px] text-gray-400">Delivery destination</p>
          <h3 className="mb-5 mt-1.5 font-luxury text-2xl">Shipping Details</h3>

          <div className="space-y-2 text-sm text-gray-600">
            {order.customer_name && (
              <p className="font-medium text-[#25231F]">{order.customer_name}</p>
            )}
            {order.phone && <p>{order.phone}</p>}
            {order.email && <p>{order.email}</p>}
            {orderAddress && <p>{orderAddress}</p>}
          </div>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                      */
/* -------------------------------------------------------------------------- */

export default function MyOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const goBack = () => {
    // previous page, or the account page if the user landed here directly
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/account");
  };

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await api.get("/orders/mine/");
      const data = response.data;

      const orderList = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.orders)
        ? data.orders
        : [];

      setOrders(orderList);

      // Open the latest order automatically on first load.
      setExpandedOrder((previous) => {
        if (previous) return previous;
        const firstOrder = orderList[0];
        return firstOrder ? firstOrder.order_id ?? firstOrder.id ?? null : null;
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Unable to load your orders. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleOrder = (orderKey) =>
    setExpandedOrder((previous) => (previous === orderKey ? null : orderKey));

  const counts = useMemo(() => {
    const c = { all: orders.length, active: 0, delivered: 0, closed: 0 };
    orders.forEach((o) => {
      c[getFilterGroup(o.status)] += 1;
    });
    return c;
  }, [orders]);

  const visibleOrders = useMemo(
    () =>
      filter === "all"
        ? orders
        : orders.filter((o) => getFilterGroup(o.status) === filter),
    [orders, filter]
  );

  const hasOrders = !loading && !error && orders.length > 0;

  return (
    <main className="mo-page min-h-screen text-[#171717]">
      <OrdersStyles />

      {/* ------------------------------ TOP BAR ------------------------------ */}
      <div className="sticky top-0 z-40 border-b border-black/10 bg-[#FAF8F3]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-10">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="group flex items-center gap-3 text-xs font-medium"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 bg-white transition duration-300 group-hover:-translate-x-1 group-hover:border-black group-hover:bg-black group-hover:text-white">
              <ArrowLeft size={17} />
            </span>
            <span className="hidden sm:inline">Back</span>
          </button>

          <p className="text-[11px] tracking-[0.3em] text-gray-500">
            NAZEER GARMENTS
          </p>

          <Link
            to="/account"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 transition hover:text-black"
          >
            <span className="hidden sm:inline">My Account</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* ------------------------------ HERO ------------------------------- */}
      <section className="relative overflow-hidden border-b border-black/10">
        <div className="mo-orb pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#B89B72]/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-16">
          <p className="mo-rise mb-4 text-xs font-medium text-[#A48754]">
            Your purchases
          </p>

          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="mo-rise" style={{ animationDelay: "80ms" }}>
              <h1 className="font-luxury text-4xl tracking-tight md:text-6xl">
                My Orders
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-gray-500">
                Your purchases, order details and delivery journey, all in one
                place.
              </p>
            </div>

            {hasOrders && (
              <dl
                className="mo-rise grid w-full grid-cols-3 divide-x divide-black/10 border border-black/10 bg-white md:w-auto"
                style={{ animationDelay: "160ms" }}
              >
                {[
                  { k: "Total orders", v: counts.all },
                  { k: "In progress", v: counts.active },
                  { k: "Delivered", v: counts.delivered },
                ].map(({ k, v }) => (
                  <div key={k} className="px-5 py-4 sm:px-8">
                    <dt className="text-[11px] text-gray-400">{k}</dt>
                    <dd className="mt-1 font-luxury text-2xl tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------- ORDERS ------------------------------ */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-10 md:py-14">
        {/* filters + refresh */}
        {hasOrders && (
          <div className="mo-rise mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div
              role="tablist"
              aria-label="Filter orders"
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex shrink-0 items-center gap-2 border px-4 py-2.5 text-xs font-medium transition-all duration-500 ${
                    filter === f.id
                      ? "border-black bg-black text-white"
                      : "border-black/15 bg-white text-gray-600 hover:border-black hover:text-black"
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                      filter === f.id ? "bg-white/20" : "bg-black/5"
                    }`}
                  >
                    {counts[f.id]}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="mo-btn group flex w-fit items-center gap-2 border border-black/15 bg-white px-4 py-2.5 text-xs font-medium disabled:opacity-60"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : "transition-transform duration-500 group-hover:rotate-180"}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-6" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border border-black/[0.06] bg-white p-5 md:p-8">
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j}>
                      <div className="mo-skel h-2.5 w-16" />
                      <div className="mo-skel mt-3 h-4 w-24" />
                    </div>
                  ))}
                </div>
                <div className="mo-skel mt-8 h-3 w-40" />
              </div>
            ))}
            <p className="text-center text-xs text-gray-400">Loading your orders</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mo-rise border border-red-100 bg-white p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={22} />
            </div>
            <p className="mt-6 font-luxury text-2xl">Something went wrong</p>
            <p className="mt-3 text-sm text-gray-500">{error}</p>
            <button
              type="button"
              onClick={() => fetchOrders()}
              className="mo-btn mo-btn-dark mt-7 inline-flex items-center gap-2 bg-black px-8 py-3 text-xs font-medium tracking-[0.15em] text-white"
            >
              <RefreshCw size={13} />
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && orders.length === 0 && (
          <div className="mo-rise border border-black/[0.06] bg-white px-6 py-20 text-center">
            <div className="mo-float mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-black/[0.06] bg-[#FAF8F3] text-[#A48754] shadow-[0_20px_40px_-20px_rgba(164,135,84,0.5)]">
              <Package size={30} strokeWidth={1.3} />
            </div>

            <p className="mt-7 text-xs text-gray-400">Nothing here yet</p>

            <h2 className="mt-3 font-luxury text-3xl md:text-4xl">
              Your story starts here.
            </h2>

            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-500">
              You haven't placed any orders yet. Explore our collection and
              discover something made for your style.
            </p>

            <Link
              to="/shop"
              className="mo-btn mo-btn-dark group mt-8 inline-flex items-center gap-3 bg-black px-9 py-4 text-xs font-medium tracking-[0.15em] text-white"
            >
              EXPLORE COLLECTION
              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1.5"
              />
            </Link>
          </div>
        )}

        {/* Filter has no matches */}
        {hasOrders && visibleOrders.length === 0 && (
          <div className="mo-rise border border-black/[0.06] bg-white py-16 text-center">
            <p className="font-luxury text-2xl">No orders in this view</p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-4 text-xs font-medium text-[#A48754] underline-offset-4 hover:underline"
            >
              Show all orders
            </button>
          </div>
        )}

        {/* Order cards */}
        {hasOrders && visibleOrders.length > 0 && (
          <div className="space-y-6" key={filter}>
            {visibleOrders.map((order, index) => {
              const orderKey = order.order_id ?? order.id ?? index;
              const status = normalizeStatus(order.status);
              const isExpanded = expandedOrder === orderKey;
              const items = Array.isArray(order.items) ? order.items : [];
              const displayId = order.order_id || order.id || "—";

              return (
                <article
                  key={orderKey}
                  style={{ animationDelay: `${Math.min(index, 6) * 80}ms` }}
                  className={`mo-rise overflow-hidden border bg-white transition-all duration-500 ${
                    isExpanded
                      ? "border-black/25 shadow-[0_40px_70px_-45px_rgba(0,0,0,0.5)]"
                      : "border-black/[0.06] hover:border-black/20 hover:shadow-[0_24px_40px_-30px_rgba(0,0,0,0.4)]"
                  }`}
                >
                  {/* gold accent bar that grows when open */}
                  <div
                    className="h-[2px] origin-left bg-gradient-to-r from-[#B89B72] to-[#E6CFA5] transition-transform duration-700 ease-out"
                    style={{ transform: `scaleX(${isExpanded ? 1 : 0})` }}
                  />

                  {/* Header */}
                  <div className="p-5 md:p-8">
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                      <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
                        <div>
                          <p className="text-[11px] text-gray-400">Order ID</p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <p className="break-all text-sm font-medium">{displayId}</p>
                            {displayId !== "—" && (
                              <CopyButton value={displayId} label="order ID" />
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] text-gray-400">Order status</p>
                          <span
                            className={`mt-2 inline-flex items-center gap-2 border px-3 py-1.5 text-[11px] font-medium ${getStatusStyle(
                              status
                            )}`}
                          >
                            <span className="relative flex h-1.5 w-1.5">
                              {["shipped", "out_for_delivery"].includes(status) && (
                                <span
                                  className={`mo-ping absolute inline-flex h-full w-full rounded-full ${getStatusDot(
                                    status
                                  )}`}
                                />
                              )}
                              <span
                                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${getStatusDot(
                                  status
                                )}`}
                              />
                            </span>
                            {formatStatus(status)}
                          </span>
                        </div>

                        <div>
                          <p className="text-[11px] text-gray-400">Order total</p>
                          <p className="mt-2 text-sm font-medium">
                            {formatPrice(order.total)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] text-gray-400">Payment</p>
                          <p className="mt-2 text-sm font-medium capitalize">
                            {order.payment_method || "—"}
                            {" · "}
                            {order.payment_status || "unpaid"}
                          </p>
                        </div>
                      </div>

                      <div className="lg:text-right">
                        <p className="text-[11px] text-gray-400">Order date</p>
                        <p className="mt-2 text-sm">
                          {formatDate(order.created_at, true)}
                        </p>
                      </div>
                    </div>

                    {/* Expand row */}
                    <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-black/[0.06] pt-5">
                      <p className="text-xs text-gray-500">
                        {items.length} {items.length === 1 ? "product" : "products"}{" "}
                        in this order
                      </p>

                      <button
                        type="button"
                        onClick={() => toggleOrder(orderKey)}
                        aria-expanded={isExpanded}
                        aria-controls={`order-panel-${orderKey}`}
                        className="group flex items-center gap-3 text-xs font-semibold tracking-[0.12em] transition hover:text-[#9A7C53]"
                      >
                        {isExpanded ? "HIDE ORDER DETAILS" : "VIEW ORDER DETAILS"}
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full border border-black/15 transition duration-500 group-hover:border-[#9A7C53] ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <ChevronDown size={14} />
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded details (smooth height animation) */}
                  <div
                    id={`order-panel-${orderKey}`}
                    className={`mo-collapse ${isExpanded ? "is-open" : ""}`}
                    aria-hidden={!isExpanded}
                  >
                    <div className="mo-collapse-inner">
                      <OrderDetails order={order} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  STYLES                                                                    */
/* -------------------------------------------------------------------------- */

function OrdersStyles() {
  return (
    <style>{`
      .mo-page {
        background:
          radial-gradient(1100px 420px at 50% -8%, #F4EBDA 0%, transparent 60%),
          #FAF8F3;
      }

      .mo-rise {
        opacity: 0;
        transform: translateY(26px);
        animation: mo-rise 0.8s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes mo-rise { to { opacity: 1; transform: translateY(0); } }

      /* smooth height animation without measuring */
      .mo-collapse {
        display: grid;
        grid-template-rows: 0fr;
        visibility: hidden;
        transition: grid-template-rows 0.7s cubic-bezier(.22,1,.36,1), visibility 0s linear 0.7s;
      }
      .mo-collapse.is-open {
        grid-template-rows: 1fr;
        visibility: visible;
        transition: grid-template-rows 0.7s cubic-bezier(.22,1,.36,1), visibility 0s;
      }
      .mo-collapse-inner { min-height: 0; overflow: hidden; }

      /* sections inside fade up one by one when opened */
      .mo-sec {
        opacity: 0;
        transform: translateY(16px);
        transition: opacity 0.6s ease, transform 0.7s cubic-bezier(.22,1,.36,1);
      }
      .is-open .mo-sec { opacity: 1; transform: translateY(0); }

      /* timeline draws in when opened */
      .mo-fill {
        transform: scaleY(0);
        transform-origin: top;
        transition: transform 0.5s ease;
        transition-delay: 0s;
      }
      .is-open .mo-fill {
        transform: scaleY(1);
        transition-delay: calc(var(--d, 0ms) + 250ms);
      }
      .mo-dot {
        transform: scale(0.6);
        opacity: 0;
        transition: transform 0.5s cubic-bezier(.34,1.56,.64,1), opacity 0.4s ease;
      }
      .is-open .mo-dot {
        transform: scale(1);
        opacity: 1;
        transition-delay: var(--d, 0ms);
      }
      .mo-pulse { animation: mo-pulse 2s ease-out infinite; }
      @keyframes mo-pulse {
        0%   { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(1.7); opacity: 0; }
      }

      .mo-ping { animation: mo-ping 1.8s cubic-bezier(0,0,.2,1) infinite; }
      @keyframes mo-ping { 75%, 100% { transform: scale(2.6); opacity: 0; } }

      .mo-orb { animation: mo-orb 14s ease-in-out infinite; }
      @keyframes mo-orb {
        0%,100% { transform: translate(0,0) scale(1); }
        50%     { transform: translate(-40px,30px) scale(1.15); }
      }

      .mo-float { animation: mo-float 4.5s ease-in-out infinite; }
      @keyframes mo-float {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-8px); }
      }

      /* buttons fill from below on hover */
      .mo-btn { position: relative; overflow: hidden; transition: color 0.4s; }
      .mo-btn::before {
        content: "";
        position: absolute;
        inset: 0;
        background: #171717;
        transform: translateY(101%);
        transition: transform 0.5s cubic-bezier(.22,1,.36,1);
      }
      .mo-btn:hover:not(:disabled) { color: #fff; }
      .mo-btn:hover:not(:disabled)::before { transform: translateY(0); }
      .mo-btn > * { position: relative; z-index: 1; }
      .mo-btn-dark::before { background: #A48754; }

      .mo-skel {
        background: linear-gradient(90deg, #F1EDE5 25%, #F9F6EF 50%, #F1EDE5 75%);
        background-size: 200% 100%;
        animation: mo-skel 1.4s ease-in-out infinite;
      }
      @keyframes mo-skel {
        from { background-position: 200% 0; }
        to   { background-position: -200% 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .mo-page *, .mo-page *::before, .mo-page *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0s !important;
        }
        .mo-rise { opacity: 1; transform: none; }
      }
    `}</style>
  );
}
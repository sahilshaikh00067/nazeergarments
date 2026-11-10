import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const RAZORPAY_SCRIPT =
  "https://checkout.razorpay.com/v1/checkout.js";

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () =>
      reject(new Error("Unable to load Razorpay."));

    document.body.appendChild(script);
  });

const formatPrice = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const initialForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  payment_method: "cod",
  coupon: "",
};

const getErrorMessage = (error) => {
  const data = error.response?.data;

  if (data?.errors) {
    return Object.values(data.errors).flat().join(" ");
  }

  if (data?.detail) return data.detail;
  if (data?.message) return data.message;

  return error.message || "Something went wrong. Please try again.";
};

export default function Checkout() {
  const navigate = useNavigate();

  const { cartItems, subtotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingOrder, setPendingOrder] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    setForm((old) => ({
      ...old,
      name: user.full_name || old.name,
      email: user.email || old.email,
      phone: user.phone || old.phone,
    }));
  }, [isAuthenticated, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((old) => ({
      ...old,
      [name]: name === "phone" || name === "pincode"
        ? value.replace(/\D/g, "")
        : value,
    }));
  };

  const verifyPayment = async (order, paymentResponse) => {
    setPaymentLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await api.post("/payments/verify/", {
        order_id: order.order_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      });

      if (response.data?.payment_status !== "paid") {
        throw new Error(
          "Payment verification is pending. Please do not pay again."
        );
      }

      clearCart();
      setPendingOrder(null);

      setCompletedOrder({
        orderId: order.order_id,
        paymentMethod: "online",
        refundReview: Boolean(
          response.data.late_payment_needs_refund
        ),
status: response.data.order_status || "pending",
      });
    } catch (err) {
      setError(
        "Payment may have been received, but verification is not complete. " +
        "Please do not place another order. Order ID: " +
        order.order_id
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const openRazorpay = async (order) => {
    setError("");
    setNotice("");

    try {
      await loadRazorpay();

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: "INR",
        name: "NAZEER GARMENTS",
        description: `Order ${order.order_id}`,
        order_id: order.razorpay_order_id,

        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },

        theme: {
          color: "#A48754",
        },

        handler: (paymentResponse) => {
          verifyPayment(order, paymentResponse);
        },

        modal: {
          ondismiss: () => {
            setNotice(
              "Payment window closed. Your existing order is retained. " +
              "You can continue payment without creating another order."
            );
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response) => {
        setError(
          response.error?.description ||
          "Payment failed. You can retry using the same order."
        );
      });

      razorpay.open();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!cartItems.length) {
      setError("Your shopping bag is empty.");
      return;
    }

    if (pendingOrder) {
      setError(
        "You already have a pending online order. Continue that payment first."
      );
      return;
    }

    const items = cartItems.map((item) => ({
      variant_id: Number(item.variantId),
      qty: Number(item.quantity),
    }));

    if (
      items.some(
        (item) =>
          !Number.isInteger(item.variant_id) ||
          item.variant_id <= 0 ||
          !Number.isInteger(item.qty) ||
          item.qty < 1
      )
    ) {
      setError(
        "A cart item has invalid variant information. Please remove it and add the product again."
      );
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await api.post("/checkout/", {
        ...form,
        coupon: form.coupon.trim(),
        items,
      });

      const order = response.data;

      if (form.payment_method === "cod") {
        clearCart();

        setCompletedOrder({
          orderId: order.order_id,
          paymentMethod: "cod",
          refundReview: false,
          status: order.status || "confirmed",
        });

        return;
      }

setPendingOrder(order);

if (
    !order.razorpay_order_id ||
    !order.key_id ||
    !order.amount
) {
    setError(
        "Order created, but Razorpay details are missing. Please contact support with Order ID: " +
        order.order_id
    );
    return;
}

await openRazorpay(order);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (completedOrder) {
    return (
      <>
        <Header />

        <main className="min-h-[75vh] bg-[#FAF8F3] px-5 py-20">
          <div className="mx-auto max-w-xl bg-white p-8 text-center shadow-sm sm:p-12">
            <ShieldCheck
              size={48}
              className="mx-auto text-[#A48754]"
            />

            <p className="mt-6 text-[10px] tracking-[4px] text-[#A48754]">
              NAZEER GARMENTS
            </p>

            <h1 className="mt-4 font-serif text-4xl">
              Order Received
            </h1>

            <p className="mt-5 text-sm text-gray-600">
              Your order reference is:
            </p>

            <p className="mt-2 break-all font-semibold">
              {completedOrder.orderId}
            </p>

            {completedOrder.refundReview ? (
              <p className="mt-6 text-sm text-amber-700">
                Payment received, but this order requires refund review.
                Please contact support.
              </p>
            ) : (
              <p className="mt-6 text-sm text-gray-600">
                {completedOrder.paymentMethod === "cod"
                  ? "Your Cash on Delivery order has been placed."
                  : "Your payment has been recorded. Check your order status for confirmation."}
              </p>
            )}

            <Link
              to={isAuthenticated ? "/my-orders" : "/shop"}
              className="mt-8 inline-block bg-[#25231F] px-9 py-4 text-[10px] tracking-[2px] text-white"
            >
              {isAuthenticated ? "VIEW MY ORDERS" : "CONTINUE SHOPPING"}
            </Link>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#FAF8F3] px-5 py-12 text-[#25231F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1200px]">
          <Link
            to="/cart"
            className="mb-8 inline-flex items-center gap-2 text-xs text-[#817B72]"
          >
            <ArrowLeft size={15} />
            BACK TO BAG
          </Link>

          <div className="mb-10 text-center">
            <p className="mb-3 text-[10px] font-semibold tracking-[4px] text-[#A48754]">
              COMPLETE YOUR PURCHASE
            </p>

            <h1 className="font-serif text-4xl sm:text-5xl">
              Secure <span className="italic text-[#B89B72]">Checkout</span>
            </h1>
          </div>

          {error && (
            <div className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="mb-6 border border-[#E5DED3] bg-white p-4 text-sm text-[#817B72]">
              {notice}
            </div>
          )}

          {pendingOrder && (
            <div className="mb-6 border border-[#D8C5A5] bg-white p-5">
              <p className="text-sm font-semibold">
                Pending order: {pendingOrder.order_id}
              </p>

              <button
                type="button"
                disabled={paymentLoading}
                onClick={() => openRazorpay(pendingOrder)}
                className="mt-4 bg-[#25231F] px-7 py-3 text-[10px] tracking-[2px] text-white disabled:opacity-50"
              >
                CONTINUE PAYMENT
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]"
          >
            <section className="bg-white p-6 sm:p-9">
              <h2 className="mb-7 border-b border-[#E5DED3] pb-5 font-serif text-2xl">
                Delivery Information
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {[
                  ["name", "Full Name", "text", "Your full name"],
                  ["phone", "Mobile Number", "tel", "10-digit mobile number"],
                  ["email", "Email Address", "email", "Your email"],
                  ["pincode", "PIN Code", "text", "6-digit PIN code"],
                  ["city", "City", "text", "City"],
                  ["state", "State", "text", "State"],
                ].map(([name, label, type, placeholder]) => (
                  <div key={name}>
                    <label className="mb-2 block text-xs font-medium">
                      {label}
                    </label>

                    <input
                      name={name}
                      type={type}
                      value={form[name]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      required
                      maxLength={
                        name === "phone" ? 10 :
                        name === "pincode" ? 6 :
                        undefined
                      }
                      className="w-full border border-[#DCD4C8] px-4 py-3 text-sm outline-none focus:border-[#A48754]"
                    />
                  </div>
                ))}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-medium">
                    Complete Address
                  </label>

                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={4}
                    required
                    placeholder="House number, street, area, landmark"
                    className="w-full resize-y border border-[#DCD4C8] px-4 py-3 text-sm outline-none focus:border-[#A48754]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-medium">
                    Coupon Code (Optional)
                  </label>

                  <input
                    name="coupon"
                    value={form.coupon}
                    onChange={handleChange}
                    placeholder="Enter coupon code"
                    className="w-full border border-[#DCD4C8] px-4 py-3 text-sm outline-none focus:border-[#A48754]"
                  />
                </div>
              </div>

              <h2 className="mb-5 mt-10 border-b border-[#E5DED3] pb-5 font-serif text-2xl">
                Payment Method
              </h2>

              <div className="space-y-3">
                {[
                  ["cod", "Cash on Delivery", "Pay when your order arrives."],
                  ["online", "Online Payment", "Secure payment powered by Razorpay."],
                ].map(([value, title, description]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer gap-4 border p-4 ${
                      form.payment_method === value
                        ? "border-[#A48754] bg-[#FAF8F3]"
                        : "border-[#E5DED3]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={value}
                      checked={form.payment_method === value}
                      onChange={handleChange}
                    />

                    <span>
                      <span className="block text-sm font-semibold">
                        {title}
                      </span>
                      <span className="mt-1 block text-xs text-[#817B72]">
                        {description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || paymentLoading || !cartItems.length || Boolean(pendingOrder)}
                className="mt-8 w-full bg-[#25231F] px-6 py-4 text-[10px] font-semibold tracking-[2px] text-white transition hover:bg-[#A48754] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "PROCESSING ORDER..."
                  : form.payment_method === "cod"
                    ? "PLACE COD ORDER"
                    : "CONTINUE TO PAYMENT"}
              </button>

              <p className="mt-4 flex items-center justify-center gap-2 text-[10px] text-[#817B72]">
                <Lock size={13} />
                Your information is securely processed.
              </p>
            </section>

            <aside className="h-fit border border-[#E5DED3] bg-white p-6 sm:p-8">
              <h2 className="border-b border-[#E5DED3] pb-5 font-serif text-2xl">
                Order Summary
              </h2>

              <div className="space-y-5 py-6">
                {cartItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-1 text-[#817B72]">
                        {item.size} {item.color && `· ${item.color}`} · Qty {item.quantity}
                      </p>
                    </div>

                    <strong>
                      {formatPrice(item.price * item.quantity)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="flex justify-between border-t border-[#E5DED3] py-5">
                <span className="text-sm text-[#817B72]">
                  Estimated Subtotal
                </span>

                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <p className="text-[11px] leading-5 text-[#817B72]">
                Final price, discount and shipping are calculated and validated
                by the server before your order is created.
              </p>
            </aside>
          </form>
        </div>
      </main>

      <Footer />
    </>
  );
}
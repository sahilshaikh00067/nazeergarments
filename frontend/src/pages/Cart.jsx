import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";

/* -------------------------------------------------------------------------- */
/*  CONFIG + HELPERS                                                          */
/* -------------------------------------------------------------------------- */

const LEAVE_MS = 450; // must match .ct-leave duration
const LOW_STOCK = 3; // show "only X left" at or below this

// Edit these to match your real store policies
const ASSURANCES = [
  { Icon: ShieldCheck, text: "Secure checkout" },
  { Icon: Sparkles, text: "Quality checked pieces" },
];

const formatPrice = (price) => `₹${Number(price || 0).toLocaleString("en-IN")}`;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* Smoothly counts a number up or down when it changes */
function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (reducedMotion()) {
      setValue(target);
      from.current = target;
      return;
    }

    const start = performance.now();
    const begin = from.current;
    let raf;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const next = begin + (target - begin) * eased;
      setValue(next);
      from.current = next;
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return Math.round(value);
}

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                      */
/* -------------------------------------------------------------------------- */

export default function Cart() {
  const { cartItems, cartCount, subtotal, updateQuantity, removeItem, clearCart } =
    useCart();

  const navigate = useNavigate();

  const [leavingKey, setLeavingKey] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const animatedSubtotal = useCountUp(Number(subtotal || 0));

  const goBack = () => {
    // previous page, or the shop if the user landed here directly
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/shop");
  };

  const wait = (ms) =>
    new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));

  const handleRemove = async (key) => {
    if (leavingKey || clearing) return;
    setLeavingKey(key);
    await wait(LEAVE_MS);
    try {
      await removeItem(key);
    } finally {
      setLeavingKey(null);
    }
  };

  const handleClear = async () => {
    setConfirmClear(false);
    setClearing(true);
    await wait(LEAVE_MS + 150);
    try {
      await clearCart();
    } finally {
      setClearing(false);
    }
  };

  // close the clear-bag confirmation after a few seconds of no action
  useEffect(() => {
    if (!confirmClear) return;
    const id = setTimeout(() => setConfirmClear(false), 5000);
    return () => clearTimeout(id);
  }, [confirmClear]);

  const isEmpty = cartItems.length === 0;

  return (
    <>
      <Header />
      <CartStyles />

      <main className="ct-page min-h-screen px-4 pb-32 pt-6 text-[#25231F] sm:px-8 lg:px-12 lg:pb-16">
        <div className="mx-auto max-w-[1250px]">
          {/* BACK ROW */}
          <div className="ct-rise mb-8 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="group flex items-center gap-3 text-xs font-medium"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DCD4C8] bg-white transition duration-300 group-hover:-translate-x-1 group-hover:border-[#25231F] group-hover:bg-[#25231F] group-hover:text-white">
                <ArrowLeft size={17} />
              </span>
              <span className="hidden sm:inline">Back</span>
            </button>

            <nav aria-label="Checkout progress" className="flex items-center gap-3 text-[11px]">
              <span className="font-semibold text-[#25231F]">Bag</span>
              <span className="h-px w-6 bg-[#CFC6B8]" />
              <span className="text-[#A39C93]">Checkout</span>
              <span className="h-px w-6 bg-[#CFC6B8]" />
              <span className="text-[#A39C93]">Done</span>
            </nav>
          </div>

          {/* TITLE */}
          <header className="ct-rise mb-12 text-center" style={{ animationDelay: "80ms" }}>
            <p className="mb-3 text-[11px] font-semibold text-[#A48754]">
              Your Nazeer selection
            </p>

            <h1 className="font-serif text-4xl sm:text-5xl">
              Shopping <span className="ct-gold italic">Bag</span>
            </h1>

            <p className="mt-3 text-xs text-[#817B72]">
              {cartCount} {cartCount === 1 ? "item" : "items"} in your bag
            </p>

            <div className="ct-line mx-auto mt-6 h-px w-20 bg-gradient-to-r from-transparent via-[#B89B72] to-transparent" />
          </header>

          {isEmpty ? (
            /* ------------------------------ EMPTY ------------------------------ */
            <div className="ct-rise mx-auto flex min-h-[350px] max-w-xl flex-col items-center justify-center text-center">
              <div className="ct-float mb-7 grid h-24 w-24 place-items-center rounded-full border border-[#E5DED3] bg-white shadow-[0_22px_44px_-22px_rgba(164,135,84,0.55)]">
                <ShoppingBag size={32} strokeWidth={1.3} className="text-[#A48754]" />
              </div>

              <h2 className="font-serif text-3xl">Your bag is empty</h2>

              <p className="mt-3 text-sm text-[#817B72]">
                Discover something beautiful from our latest collection.
              </p>

              <Link
                to="/shop"
                className="ct-btn group mt-8 inline-flex items-center gap-3 bg-[#25231F] px-9 py-4 text-[11px] font-semibold tracking-[2px] text-white"
              >
                CONTINUE SHOPPING
                <ArrowRight
                  size={15}
                  className="transition-transform duration-300 group-hover:translate-x-1.5"
                />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
              {/* ----------------------------- ITEMS ----------------------------- */}
              <section>
                <div className="mb-2 flex items-center justify-between border-b border-[#E5DED3] pb-4">
                  <h2 className="text-xs font-bold tracking-[2px]">YOUR ITEMS</h2>

                  {confirmClear ? (
                    <div className="ct-pop flex items-center gap-3 text-[11px]">
                      <span className="text-[#817B72]">Remove everything?</span>
                      <button
                        type="button"
                        onClick={handleClear}
                        className="font-semibold text-red-600 hover:underline"
                      >
                        Yes, clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="font-semibold text-[#25231F] hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="text-[11px] font-semibold tracking-wider text-[#A48754] transition hover:text-red-600"
                    >
                      CLEAR BAG
                    </button>
                  )}
                </div>

                <div>
                  {cartItems.map((item, index) => {
                    const leaving = clearing || leavingKey === item.key;
                    const link = item.slug ? `/product/${item.slug}` : "/shop";
                    const atMax = item.quantity >= item.stock;
                    const lowStock =
                      Number(item.stock) > 0 && Number(item.stock) <= LOW_STOCK;

                    return (
                      <article
                        key={item.key}
                        style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
                        className={`ct-rise group flex gap-4 border-b border-[#E5DED3] py-7 sm:gap-7 ${
                          leaving ? "ct-leave" : ""
                        }`}
                      >
                        {/* IMAGE */}
                        <Link
                          to={link}
                          className="relative block h-36 w-28 shrink-0 overflow-hidden bg-[#EEE9E0] shadow-[0_16px_30px_-22px_rgba(37,35,31,0.6)] sm:h-48 sm:w-40"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.07]"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-xs text-[#817B72]">
                              No image
                            </div>
                          )}
                        </Link>

                        {/* DETAILS */}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                to={link}
                                className="ct-name line-clamp-2 font-serif text-lg sm:text-xl"
                              >
                                {item.name}
                              </Link>

                              {(item.size || item.color) && (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  {item.size && (
                                    <span className="border border-[#E5DED3] bg-white px-2.5 py-1 text-[11px] text-[#5E5850]">
                                      Size {item.size}
                                    </span>
                                  )}
                                  {item.color && (
                                    <span className="border border-[#E5DED3] bg-white px-2.5 py-1 text-[11px] text-[#5E5850]">
                                      {item.color}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemove(item.key)}
                              disabled={leaving}
                              aria-label={`Remove ${item.name}`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#A39C93] transition duration-300 hover:rotate-6 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>

                          <p className="mt-3 text-sm text-[#5E5850]">
                            {formatPrice(item.price)}
                          </p>

                          {lowStock && (
                            <p className="mt-1.5 text-[11px] font-medium text-[#B4540A]">
                              Only {item.stock} left in stock
                            </p>
                          )}

                          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
                            <div>
                              <div className="flex items-center border border-[#DCD4C8] bg-white">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.key, item.quantity - 1)
                                  }
                                  disabled={item.quantity <= 1}
                                  aria-label="Decrease quantity"
                                  className="p-3 transition hover:bg-[#25231F] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
                                >
                                  <Minus size={12} />
                                </button>

                                <span
                                  key={item.quantity}
                                  className="ct-pop min-w-10 text-center text-xs font-medium tabular-nums"
                                  aria-live="polite"
                                >
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.key, item.quantity + 1)
                                  }
                                  disabled={atMax}
                                  aria-label="Increase quantity"
                                  className="p-3 transition hover:bg-[#25231F] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>

                              {atMax && (
                                <p className="mt-1.5 text-[11px] text-[#817B72]">
                                  Maximum available quantity
                                </p>
                              )}
                            </div>

                            <strong
                              key={item.price * item.quantity}
                              className="ct-pop font-serif text-lg tabular-nums"
                            >
                              {formatPrice(item.price * item.quantity)}
                            </strong>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <Link
                  to="/shop"
                  className="group mt-8 inline-flex items-center gap-3 text-[11px] font-semibold tracking-[1.5px] text-[#817B72] transition hover:text-[#A48754]"
                >
                  <ArrowLeft
                    size={15}
                    className="transition-transform duration-300 group-hover:-translate-x-1.5"
                  />
                  CONTINUE SHOPPING
                </Link>
              </section>

              {/* ---------------------------- SUMMARY ---------------------------- */}
              <aside
                className="ct-rise h-fit border border-[#E5DED3] bg-white p-6 shadow-[0_30px_60px_-40px_rgba(37,35,31,0.45)] sm:p-8 lg:sticky lg:top-28"
                style={{ animationDelay: "200ms" }}
              >
                <h2 className="border-b border-[#E5DED3] pb-5 font-serif text-2xl">
                  Order Summary
                </h2>

                <div className="space-y-4 py-6 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#817B72]">
                      Subtotal ({cartCount} {cartCount === 1 ? "item" : "items"})
                    </span>
                    <strong className="tabular-nums">
                      {formatPrice(animatedSubtotal)}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#817B72]">Shipping</span>
                    <span className="text-[#817B72]">Calculated at checkout</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#E5DED3] py-5">
                  <strong className="text-sm">Estimated total</strong>
                  <strong className="font-serif text-2xl tabular-nums">
                    {formatPrice(animatedSubtotal)}
                  </strong>
                </div>

                <Link
                  to="/checkout"
                  className="ct-btn ct-shine group flex w-full items-center justify-center gap-3 bg-[#25231F] px-5 py-4 text-[11px] font-semibold tracking-[2px] text-white"
                >
                  <Lock size={14} />
                  PROCEED TO CHECKOUT
                  <ArrowRight
                    size={15}
                    className="transition-transform duration-300 group-hover:translate-x-1.5"
                  />
                </Link>

                <p className="mt-4 text-center text-[11px] leading-5 text-[#817B72]">
                  Taxes, shipping charges and applicable discounts are confirmed
                  during checkout.
                </p>

                <ul className="mt-6 space-y-3 border-t border-[#E5DED3] pt-6">
                  {ASSURANCES.map(({ Icon, text }) => (
                    <li
                      key={text}
                      className="flex items-center gap-3 text-xs text-[#5E5850]"
                    >
                      <Icon size={15} className="text-[#A48754]" />
                      {text}
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          )}
        </div>
      </main>

      {/* STICKY MOBILE CHECKOUT BAR */}
      {!isEmpty && (
        <div className="ct-bar fixed inset-x-0 bottom-0 z-40 border-t border-[#E5DED3] bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <div>
              <p className="text-[11px] text-[#817B72]">Estimated total</p>
              <p className="font-serif text-xl tabular-nums">
                {formatPrice(animatedSubtotal)}
              </p>
            </div>

            <Link
              to="/checkout"
              className="ct-btn flex items-center gap-2 bg-[#25231F] px-6 py-3.5 text-[11px] font-semibold tracking-[2px] text-white"
            >
              CHECKOUT
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  STYLES                                                                    */
/* -------------------------------------------------------------------------- */

function CartStyles() {
  return (
    <style>{`
      .ct-page {
        background:
          radial-gradient(1100px 420px at 50% -8%, #F4EBDA 0%, transparent 60%),
          #FAF8F3;
      }

      .ct-gold {
        background: linear-gradient(100deg, #B89B72 30%, #E6CFA5 50%, #B89B72 70%);
        background-size: 250% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: ct-shimmer 5s ease-in-out infinite;
      }
      @keyframes ct-shimmer {
        0%,100% { background-position: 100% 0; }
        50%     { background-position: 0 0; }
      }

      .ct-rise {
        opacity: 0;
        transform: translateY(26px);
        animation: ct-rise 0.8s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes ct-rise { to { opacity: 1; transform: translateY(0); } }

      .ct-leave { animation: ct-leave 0.45s cubic-bezier(.55,0,.55,.2) forwards !important; }
      @keyframes ct-leave {
        from { opacity: 1; transform: translateX(0); filter: blur(0); }
        to   { opacity: 0; transform: translateX(60px) scale(0.97); filter: blur(5px); }
      }

      .ct-pop { animation: ct-pop 0.35s cubic-bezier(.22,1,.36,1); }
      @keyframes ct-pop {
        0%   { transform: scale(0.8); opacity: 0.4; }
        60%  { transform: scale(1.12); }
        100% { transform: scale(1); opacity: 1; }
      }

      .ct-line { animation: ct-line 1.1s 0.3s cubic-bezier(.22,1,.36,1) both; }
      @keyframes ct-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }

      .ct-float { animation: ct-float 4.5s ease-in-out infinite; }
      @keyframes ct-float {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-8px); }
      }

      .ct-name {
        display: inline;
        background: linear-gradient(#A48754, #A48754) no-repeat 0 100% / 0 1px;
        transition: background-size 0.6s cubic-bezier(.22,1,.36,1), color 0.3s;
      }
      .ct-name:hover { background-size: 100% 1px; color: #8A6E43; }

      /* dark buttons turn gold with a rising fill */
      .ct-btn { position: relative; overflow: hidden; }
      .ct-btn::before {
        content: "";
        position: absolute;
        inset: 0;
        background: #B89B72;
        transform: translateY(101%);
        transition: transform 0.5s cubic-bezier(.22,1,.36,1);
      }
      .ct-btn:hover::before { transform: translateY(0); }
      .ct-btn > * { position: relative; z-index: 1; }
      .ct-btn:hover { color: #25231F; }

      /* light sweep across the main checkout button */
      .ct-shine::after {
        content: "";
        position: absolute;
        top: 0; bottom: 0; left: -40%;
        width: 30%;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,0.25), transparent);
        transform: skewX(-20deg);
        animation: ct-shine 3.8s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes ct-shine {
        0%, 55% { left: -40%; }
        100%    { left: 140%; }
      }

      .ct-bar { animation: ct-bar 0.8s 0.4s cubic-bezier(.22,1,.36,1) both; }
      @keyframes ct-bar {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .ct-page *, .ct-page *::before, .ct-page *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        .ct-rise { opacity: 1; transform: none; }
      }
    `}</style>
  );
}
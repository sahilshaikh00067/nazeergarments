import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  RotateCcw,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { useWishlist } from "../context/WishlistContext";

/* -------------------------------------------------------------------------- */
/*  CONFIG + HELPERS                                                          */
/* -------------------------------------------------------------------------- */

const RESERVE_SECONDS = 15 * 60;
const RESERVE_KEY = "wishlist_reserve_end";
const LEAVE_MS = 450;

const SORTS = [
  { id: "latest", label: "Recently added" },
  { id: "low", label: "Price: low to high" },
  { id: "high", label: "Price: high to low" },
  { id: "discount", label: "Biggest discount" },
];

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const pad = (n) => String(n).padStart(2, "0");

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const coarsePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

const getImages = (p) => {
const list = (p.images || [])
    .map(i => typeof i === "string" ? i : i?.image)
    .filter(Boolean);
  return list.length ? list : p.image ? [p.image] : [];
};

const getDiscount = (p) => {
  const price = Number(p.price || 0);
  const mrp = Number(p.mrp || 0);
  return mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
};

/* -------------------------------------------------------------------------- */
/*  HOOK: RESERVATION TIMER                                                   */
/* -------------------------------------------------------------------------- */

function useReservationTimer() {
  const [endAt, setEndAt] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(RESERVE_KEY));
      if (saved > Date.now()) return saved;
    } catch {
      /* storage unavailable */
    }
    return Date.now() + RESERVE_SECONDS * 1000;
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    try {
      localStorage.setItem(RESERVE_KEY, String(endAt));
    } catch {
      /* storage unavailable */
    }
  }, [endAt]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, Math.round((endAt - now) / 1000));

  return {
    remaining,
    expired: remaining === 0,
    urgent: remaining > 0 && remaining <= 120,
    progress: remaining / RESERVE_SECONDS,
    label: `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`,
    restart: () => {
      setEndAt(Date.now() + RESERVE_SECONDS * 1000);
      setNow(Date.now());
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  TILT FRAME (subtle, professional)                                         */
/* -------------------------------------------------------------------------- */

function TiltFrame({ children }) {
  const ref = useRef(null);
  const raf = useRef(0);

  const move = (e) => {
    if (reducedMotion() || coarsePointer() || !ref.current) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      el.style.setProperty("--go", "1");
    });
  };

  const leave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--go", "0");
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <div ref={ref} onMouseMove={move} onMouseLeave={leave} className="wp-tilt relative">
      {children}
      <div className="wp-glare pointer-events-none absolute inset-0 z-20" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  IMAGE SLIDER                                                              */
/* -------------------------------------------------------------------------- */

function ImageSlider({ images, alt, onOpen }) {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);
  const startX = useRef(null);
  const count = images.length;

  const go = (d) => setIndex((i) => (i + d + count) % count);

  const play = () => {
    if (count < 2 || reducedMotion() || coarsePointer()) return;
    clearInterval(timer.current);
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), 1600);
  };

  const stop = () => {
    clearInterval(timer.current);
    setIndex(0);
  };

  useEffect(() => () => clearInterval(timer.current), []);

  if (!count) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex aspect-[4/5] w-full items-center justify-center bg-[#F1EDE5] text-xs text-[#7A746B]"
      >
        No image available
      </button>
    );
  }

  return (
    <div
      className="group/s relative aspect-[4/5] w-full cursor-pointer overflow-hidden bg-[#F1EDE5]"
      onMouseEnter={play}
      onMouseLeave={stop}
      onClick={onOpen}
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (startX.current === null || count < 2) return;
        const d = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(d) > 40) go(d < 0 ? 1 : -1);
        startX.current = null;
      }}
    >
      <div
        className="flex h-full will-change-transform"
        style={{
          transform: `translateX(-${index * 100}%)`,
          transition: "transform 800ms cubic-bezier(.22,1,.36,1)",
        }}
      >
        {images.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={i === 0 ? alt : `${alt} view ${i + 1}`}
            loading="lazy"
            draggable={false}
            className="h-full w-full shrink-0 select-none object-cover transition-transform duration-[1200ms] ease-out group-hover/s:scale-105"
          />
        ))}
      </div>

      {count > 1 && (
        <>
          {[
            { dir: -1, Icon: ChevronLeft, pos: "left-2", label: "Previous image" },
            { dir: 1, Icon: ChevronRight, pos: "right-2", label: "Next image" },
          ].map(({ dir, Icon, pos, label }) => (
            <button
              key={dir}
              type="button"
              aria-label={label}
              onClick={(e) => {
                e.stopPropagation();
                go(dir);
              }}
              className={`absolute ${pos} top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#1F1D1A] opacity-0 shadow transition duration-300 hover:bg-[#1F1D1A] hover:text-white group-hover/s:opacity-100`}
            >
              <Icon size={16} />
            </button>
          ))}

          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show image ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`h-[3px] rounded-full bg-white shadow transition-all duration-500 ${i === index ? "w-6" : "w-2 opacity-70"
                  }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SORT DROPDOWN                                                             */
/* -------------------------------------------------------------------------- */

function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = SORTS.find((s) => s.id === value);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-3 border border-[#DDD6C9] bg-white px-4 py-2.5 text-xs text-[#1F1D1A] transition hover:border-[#1F1D1A]"
      >
        <span className="text-[#7A746B]">Sort by</span>
        <span className="font-medium">{current?.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        role="listbox"
        className={`absolute right-0 z-30 mt-2 w-56 origin-top-right border border-[#E7E1D5] bg-white py-1 shadow-xl transition duration-200 ${open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
          }`}
      >
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="option"
            aria-selected={s.id === value}
            onClick={() => {
              onChange(s.id);
              setOpen(false);
            }}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs text-[#1F1D1A] transition hover:bg-[#F7F3EA]"
          >
            {s.label}
            {s.id === value && <Check size={14} className="text-[#A8895A]" />}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MAIN PAGE                                                                 */
/* -------------------------------------------------------------------------- */

export default function WishlistPro() {
  const { wishlist, loading, removeItem } = useWishlist();
  const navigate = useNavigate();
  const timer = useReservationTimer();

  const [leavingId, setLeavingId] = useState(null);
  const [sort, setSort] = useState("latest");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const goBack = () => {
    // go to the previous page, or the shop if the user landed here directly
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/shop");
  };

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const handleRemove = async (productId, name) => {
    if (leavingId !== null) return;
    setLeavingId(productId);
    try {
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : LEAVE_MS));
      await removeItem(productId);
      showToast(`${name || "Item"} removed from wishlist`);
    } catch (error) {
      console.error("Wishlist removal failed:", error);
      showToast("Could not remove the item. Please try again.");
    } finally {
      setLeavingId(null);
    }
  };

  const openProduct = (p) => navigate(`/product/${p.slug || p.id}`);

  const items = useMemo(() => {
    const list = [...(wishlist || [])];
    const price = (i) => Number(i.product?.price || 0);
    if (sort === "low") return list.sort((a, b) => price(a) - price(b));
    if (sort === "high") return list.sort((a, b) => price(b) - price(a));
    if (sort === "discount")
      return list.sort((a, b) => getDiscount(b.product) - getDiscount(a.product));
    return list;
  }, [wishlist, sort]);

  const totals = useMemo(
    () =>
      (wishlist || []).reduce(
        (acc, { product }) => {
          const price = Number(product?.price || 0);
          const mrp = Number(product?.mrp || 0);
          acc.total += price;
          if (mrp > price) acc.savings += mrp - price;
          return acc;
        },
        { total: 0, savings: 0 }
      ),
    [wishlist]
  );

  /* ------------------------------ TOP BAR -------------------------------- */

  const TopBar = (
    <div className="sticky top-0 z-40 border-b border-[#E7E1D5] bg-[#FBF9F4]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="group flex items-center gap-3 text-xs font-medium text-[#1F1D1A]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DDD6C9] bg-white transition duration-300 group-hover:-translate-x-1 group-hover:border-[#1F1D1A] group-hover:bg-[#1F1D1A] group-hover:text-white">
            <ArrowLeft size={17} />
          </span>
          <span className="hidden sm:inline">Back</span>
        </button>

        <p className="font-serif text-lg text-[#1F1D1A]">Wishlist</p>

        {/* timer pill or spacer to keep the title centred */}
        {wishlist?.length > 0 ? (
          <div
            className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs tabular-nums transition-colors ${timer.expired
                ? "border-[#DDD6C9] bg-white text-[#7A746B]"
                : timer.urgent
                  ? "wp-urgent border-red-300 bg-red-50 text-red-700"
                  : "border-[#DDD6C9] bg-white text-[#1F1D1A]"
              }`}
          >
            <Clock size={13} />
            {timer.expired ? "Hold ended" : `Held ${timer.label}`}
          </div>
        ) : (
          <span className="w-10 sm:w-20" />
        )}
      </div>
    </div>
  );

  /* ------------------------------ LOADING -------------------------------- */

  if (loading) {
    return (
      <div className="wp-page min-h-screen">
        <Styles />
        {TopBar}
        <main className="mx-auto max-w-7xl px-4 py-14 sm:px-8 lg:px-12">
          <div className="wp-skel mx-auto mb-12 h-10 w-64" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="wp-skel aspect-[4/5] w-full" />
                <div className="wp-skel mt-4 h-3 w-1/3" />
                <div className="wp-skel mt-3 h-4 w-3/4" />
                <div className="wp-skel mt-3 h-3 w-1/2" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const count = wishlist.length;

  /* ------------------------------- PAGE ---------------------------------- */

  return (
    <div className="wp-page min-h-screen pb-24">
      <Styles />
      {TopBar}

      <main className="mx-auto max-w-7xl px-4 pt-12 sm:px-8 lg:px-12 lg:pt-16">
        {/* HEADER */}
        <header className="wp-rise mb-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="mb-3 text-xs font-medium text-[#A8895A]">
              Saved for later
            </p>
            <h1 className="font-serif text-4xl text-[#1F1D1A] sm:text-5xl">
              My Wishlist
            </h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-[#6F695F]">
              Pieces you love, kept together. Review them, compare prices and
              pick up where you left off.
            </p>
          </div>

          {count > 0 && (
            <dl className="grid w-full grid-cols-3 divide-x divide-[#E7E1D5] border border-[#E7E1D5] bg-white lg:w-auto">
              {[
                { k: "Items", v: count },
                { k: "Total value", v: inr(totals.total) },
                { k: "You save", v: inr(totals.savings), accent: true },
              ].map(({ k, v, accent }) => (
                <div key={k} className="px-5 py-4 sm:px-8">
                  <dt className="text-[11px] text-[#7A746B]">{k}</dt>
                  <dd
                    className={`mt-1 font-serif text-lg tabular-nums sm:text-2xl ${accent ? "text-[#2E7D4F]" : "text-[#1F1D1A]"
                      }`}
                  >
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </header>

        {/* EMPTY */}
        {count === 0 ? (
          <div className="wp-rise mx-auto max-w-md py-20 text-center">
            <div className="wp-float mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[#E7E1D5] bg-white shadow-[0_20px_40px_-20px_rgba(168,137,90,0.5)]">
              <Heart size={34} strokeWidth={1.2} className="text-[#A8895A]" />
            </div>
            <h2 className="mt-8 font-serif text-2xl text-[#1F1D1A]">
              Nothing saved yet
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#6F695F]">
              Tap the heart on any product and it will show up here.
            </p>
            <Link
              to="/shop"
              className="wp-btn group mt-8 inline-flex items-center gap-3 bg-[#1F1D1A] px-8 py-4 text-xs font-semibold text-white"
            >
              Browse the collection
              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1.5"
              />
            </Link>
          </div>
        ) : (
          <>
            {/* HOLD NOTICE + SORT */}
            <div className="mb-8 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-4 border border-[#E7E1D5] bg-white px-4 py-3">
                <Clock size={16} className="shrink-0 text-[#A8895A]" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#1F1D1A]">
                    {timer.expired
                      ? "Your hold on these pieces has ended."
                      : `These pieces are held for you for ${timer.label}.`}
                  </p>
                  <div className="mt-2 h-[3px] w-full overflow-hidden bg-[#EFE9DC]">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear ${timer.urgent ? "bg-red-500" : "bg-[#A8895A]"
                        }`}
                      style={{ width: `${timer.progress * 100}%` }}
                    />
                  </div>
                </div>
                {timer.expired && (
                  <button
                    type="button"
                    onClick={timer.restart}
                    className="flex shrink-0 items-center gap-2 bg-[#1F1D1A] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#A8895A]"
                  >
                    <RotateCcw size={13} />
                    Hold again
                  </button>
                )}
              </div>

              <SortMenu value={sort} onChange={setSort} />
            </div>

            {/* GRID */}
            <div
              key={sort}
              className="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8"
            >
              {items.map((item, index) => {
                const product = item.product;
                const images = getImages(product);
                const price = Number(product.price || 0);
                const mrp = Number(product.mrp || 0);
                const discount = getDiscount(product);
                const leaving = leavingId === product.id;

                return (
                  <article
                    key={item.id}
                    style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
                    className={`wp-rise group relative ${leaving ? "wp-leave" : ""}`}
                  >
                    <div className="shadow-[0_18px_36px_-26px_rgba(31,29,26,0.55)] transition-shadow duration-500 group-hover:shadow-[0_34px_54px_-28px_rgba(31,29,26,0.6)]">
                      <TiltFrame>
                        <ImageSlider
                          images={images}
                          alt={product.name}
                          onOpen={() => openProduct(product)}
                        />

                        {discount > 0 && (
                          <span className="absolute left-3 top-3 z-10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1F1D1A]">
                            {discount}% off
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(product.id, product.name);
                          }}
                          disabled={leavingId !== null}
                          aria-label={`Remove ${product.name} from wishlist`}
                          className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1F1D1A] shadow transition duration-300 hover:scale-110 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>

                        {/* hover quick action */}
                        <button
                          type="button"
                          onClick={() => openProduct(product)}
                          className="absolute inset-x-0 bottom-0 z-30 hidden translate-y-full items-center justify-center gap-2 bg-[#1F1D1A]/95 py-3.5 text-xs font-medium text-white backdrop-blur transition duration-500 ease-out group-hover:translate-y-0 lg:flex"
                        >
                          <ShoppingBag size={14} />
                          Quick view
                        </button>
                      </TiltFrame>
                    </div>

                    <div className="pt-5">
                      <p className="mb-1.5 text-xs text-[#A8895A]">
                        {product.category?.name || product.category || "Collection"}
                      </p>

                      <button
                        type="button"
                        onClick={() => openProduct(product)}
                        className="text-left"
                      >
                        <h3 className="wp-name line-clamp-2 font-serif text-base text-[#1F1D1A] sm:text-lg">
                          {product.name}
                        </h3>
                      </button>

                      <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-semibold text-[#1F1D1A]">
                          {inr(price)}
                        </span>
                        {mrp > price && (
                          <del className="text-xs text-[#9B948A]">{inr(mrp)}</del>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openProduct(product)}
                        className="wp-btn group/b mt-4 flex w-full items-center justify-center gap-2 border border-[#1F1D1A] py-3 text-xs font-semibold text-[#1F1D1A] hover:text-white"
                      >
                        <span className="relative z-10">View product</span>
                        <ArrowRight
                          size={14}
                          className="relative z-10 transition-transform duration-300 group-hover/b:translate-x-1.5"
                        />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* TOAST */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ${toast ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
      >
        <div className="flex items-center gap-3 bg-[#1F1D1A] px-5 py-3 text-xs text-white shadow-2xl">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#A8895A]">
            <Check size={12} strokeWidth={3} />
          </span>
          {toast}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  STYLES                                                                    */
/* -------------------------------------------------------------------------- */

function Styles() {
  return (
    <style>{`
      .wp-page { background: #FBF9F4; }

      .wp-rise {
        opacity: 0;
        transform: translateY(28px);
        animation: wp-rise 0.8s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes wp-rise { to { opacity: 1; transform: translateY(0); } }

      .wp-leave { animation: wp-leave 0.45s cubic-bezier(.55,0,.55,.2) forwards !important; }
      @keyframes wp-leave {
        from { opacity: 1; transform: scale(1); filter: blur(0); }
        to   { opacity: 0; transform: scale(0.85) translateY(16px); filter: blur(5px); }
      }

      .wp-tilt {
        transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
        transition: transform 0.5s cubic-bezier(.22,1,.36,1);
        will-change: transform;
        overflow: hidden;
      }
      .wp-tilt:hover { transition: transform 0.12s ease-out; }
      .wp-glare {
        opacity: var(--go, 0);
        transition: opacity 0.4s;
        background: radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.35), transparent 55%);
        mix-blend-mode: soft-light;
      }

      .wp-name {
        display: inline;
        background: linear-gradient(#A8895A, #A8895A) no-repeat 0 100% / 0 1px;
        transition: background-size 0.6s cubic-bezier(.22,1,.36,1), color 0.3s;
      }
      .wp-name:hover { background-size: 100% 1px; color: #8A6E43; }

      /* outlined buttons fill from the bottom on hover */
      .wp-btn { position: relative; overflow: hidden; transition: color 0.4s; }
      .wp-btn::before {
        content: "";
        position: absolute;
        inset: 0;
        background: #1F1D1A;
        transform: translateY(101%);
        transition: transform 0.5s cubic-bezier(.22,1,.36,1);
      }
      .wp-btn:hover::before { transform: translateY(0); }
      .wp-btn > * { position: relative; z-index: 1; }
      /* solid dark buttons switch to gold instead */
      .wp-btn.bg-\\[\\#1F1D1A\\]::before { background: #A8895A; }

      .wp-urgent { animation: wp-urgent 1.2s ease-in-out infinite; }
      @keyframes wp-urgent {
        0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
        50%     { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
      }

      .wp-float { animation: wp-float 4.5s ease-in-out infinite; }
      @keyframes wp-float {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-8px); }
      }

      .wp-skel {
        background: linear-gradient(90deg, #F1EDE5 25%, #F9F6EF 50%, #F1EDE5 75%);
        background-size: 200% 100%;
        animation: wp-skel 1.4s ease-in-out infinite;
      }
      @keyframes wp-skel {
        from { background-position: 200% 0; }
        to   { background-position: -200% 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .wp-page *, .wp-page *::before, .wp-page *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        .wp-rise { opacity: 1; transform: none; }
      }
    `}</style>
  );
}
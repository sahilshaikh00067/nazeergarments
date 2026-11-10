import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Copy,
  Heart,
  LogOut,
  Mail,
  Phone,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
  Package,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

/* -------------------------------------------------------------------------- */
/*  CONFIG                                                                    */
/* -------------------------------------------------------------------------- */

// Edit routes here if yours are different
const QUICK_LINKS = [
  {
    to: "/my-orders",
    Icon: Package,
    title: "My Orders",
    text: "Track purchases and view order status.",
  },
  {
    to: "/wishlist",
    Icon: Heart,
    title: "My Wishlist",
    text: "Pieces you saved for later.",
  },
  {
    to: "/cart",
    Icon: ShoppingBag,
    title: "Shopping Bag",
    text: "Review items before checkout.",
  },
  {
    to: "/shop",
    Icon: Store,
    title: "Explore Shop",
    text: "Discover the latest collection.",
  },
];

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const coarsePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

/* -------------------------------------------------------------------------- */
/*  TILT CARD (profile)                                                       */
/* -------------------------------------------------------------------------- */

function TiltCard({ children, className = "" }) {
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
      el.style.setProperty("--rx", `${((0.5 - y) * 5).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - 0.5) * 7).toFixed(2)}deg`);
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
    <div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={leave}
      className={`ac-tilt relative ${className}`}
    >
      {children}
      <div className="ac-glare pointer-events-none absolute inset-0" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  DETAIL ROW (with copy button)                                             */
/* -------------------------------------------------------------------------- */

function DetailRow({ Icon, label, value, copyable = false, children }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="ac-row group flex items-start justify-between gap-4 border-t border-black/10 py-5">
      <div className="flex min-w-0 items-start gap-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAF8F3] text-[#A48754] transition duration-500 group-hover:bg-[#171717] group-hover:text-white">
          <Icon size={15} strokeWidth={1.6} />
        </span>

        <div className="min-w-0">
          <p className="text-[11px] text-gray-400">{label}</p>
          <div className="mt-1.5 break-words text-sm font-medium">
            {children || value}
          </div>
        </div>
      </div>

      {copyable && value && (
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-3 text-[11px] text-gray-500 opacity-100 transition duration-300 hover:border-black hover:text-black sm:opacity-0 sm:group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                      */
/* -------------------------------------------------------------------------- */

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelRef = useRef(null);

  const fullName = user?.full_name || "Valued Customer";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const goBack = () => {
    // previous page, or the shop if the user landed here directly
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/shop");
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await logout();
    } catch {
      /* leave the page either way */
    } finally {
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  };

  const closeConfirm = useCallback(() => {
    if (!loggingOut) setConfirmOpen(false);
  }, [loggingOut]);

  // Escape closes the dialog, focus starts on "Stay signed in"
  useEffect(() => {
    if (!confirmOpen) return;
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeConfirm();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmOpen, closeConfirm]);

  return (
    <main className="ac-page min-h-screen text-[#171717]">
      <AccountStyles />

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
            to="/shop"
            className="hidden items-center gap-1.5 text-xs font-medium text-gray-600 transition hover:text-black sm:flex"
          >
            Shop
            <ArrowUpRight size={14} />
          </Link>
          <span className="w-10 sm:hidden" />
        </div>
      </div>

      {/* ------------------------------ HERO ------------------------------- */}
      <section className="relative overflow-hidden border-b border-black/10">
        <div className="ac-orb pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#B89B72]/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-16">
          <p
            className="ac-rise mb-4 text-xs font-medium text-[#A48754]"
          >
            My profile
          </p>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="ac-rise" style={{ animationDelay: "80ms" }}>
              <h1 className="font-luxury text-4xl tracking-tight md:text-6xl">
                My Account
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-gray-500">
                Manage your personal information and your shopping, all in one
                place.
              </p>
            </div>

            <Link
              to="/shop"
              className="ac-rise group inline-flex w-fit items-center gap-3 border-b border-black pb-2 text-xs font-medium tracking-[0.15em] transition hover:border-[#A48754] hover:text-[#A48754]"
              style={{ animationDelay: "160ms" }}
            >
              CONTINUE SHOPPING
              <ArrowUpRight
                size={15}
                className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------- CONTENT ----------------------------- */}
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-10 md:py-16">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[340px_1fr] lg:gap-10">
          {/* PROFILE CARD */}
          <aside className="ac-rise lg:sticky lg:top-24 lg:self-start" style={{ animationDelay: "120ms" }}>
            <TiltCard className="shadow-[0_40px_70px_-40px_rgba(0,0,0,0.7)]">
              <div className="relative flex min-h-[380px] flex-col overflow-hidden bg-[#171717] p-8 text-white md:p-10">
                <div className="ac-sheen pointer-events-none absolute inset-0" />

                <p className="relative text-xs text-white/50">Welcome back</p>

                <div className="relative mt-10">
                  <div className="relative h-24 w-24">
                    <span className="ac-ring absolute inset-0 rounded-full border border-[#B89B72]/60" />
                    <span className="ac-spin absolute -inset-1.5 rounded-full border border-dashed border-[#B89B72]/40" />
                    <div className="absolute inset-0 flex items-center justify-center rounded-full border border-white/25 bg-gradient-to-br from-white/15 to-white/5">
                      <span className="font-luxury text-4xl">
                        {initials || "Z"}
                      </span>
                    </div>
                  </div>

                  <h2 className="mt-7 font-luxury text-3xl leading-tight">
                    {fullName}
                  </h2>

                  <p className="mt-2 break-all text-sm text-white/55">
                    {user?.email || "No email available"}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#B89B72]/40 bg-[#B89B72]/10 px-3 py-1.5 text-[11px] text-[#E6CFA5]">
                    <BadgeCheck size={13} />
                    Verified member
                  </span>
                </div>

                <div className="relative mt-auto pt-10">
                  <div className="mb-5 h-px bg-white/15" />
                  <p className="text-[11px] tracking-[0.25em] text-white/50">
                    NAZEER GARMENTS
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-white/70">
                    <Sparkles size={13} className="text-[#B89B72]" />
                    Your style. Your identity.
                  </p>
                </div>
              </div>
            </TiltCard>
          </aside>

          {/* RIGHT COLUMN */}
          <div className="space-y-7">
            {/* ACCOUNT DETAILS */}
            <div
              className="ac-rise border border-black/[0.06] bg-white p-6 md:p-9"
              style={{ animationDelay: "200ms" }}
            >
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400">Personal information</p>
                  <h2 className="mt-2 font-luxury text-2xl md:text-3xl">
                    Account Details
                  </h2>
                </div>

                <div className="hidden h-11 w-11 items-center justify-center rounded-full bg-[#FAF8F3] text-[#A48754] sm:flex">
                  <UserRound size={19} strokeWidth={1.5} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
                <DetailRow
                  Icon={UserRound}
                  label="Full name"
                  value={user?.full_name || "Not available"}
                />

                <DetailRow
                  Icon={Mail}
                  label="Email address"
                  value={user?.email || "Not available"}
                  copyable={Boolean(user?.email)}
                />

                <DetailRow
                  Icon={Phone}
                  label="Mobile number"
                  value={user?.phone || "Not added"}
                  copyable={Boolean(user?.phone)}
                />

                <DetailRow Icon={BadgeCheck} label="Account status" value="Active">
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="ac-ping absolute inline-flex h-full w-full rounded-full bg-green-500" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
                    </span>
                    Active
                  </span>
                </DetailRow>
              </div>
            </div>

            {/* QUICK LINKS */}
            <div>
              <p className="mb-4 text-xs text-gray-400">Your shopping</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {QUICK_LINKS.map(({ to, Icon, title, text }, i) => (
                  <Link
                    key={to}
                    to={to}
                    style={{ animationDelay: `${280 + i * 70}ms` }}
                    className="ac-rise ac-card group relative overflow-hidden border border-black/[0.06] bg-white p-6"
                  >
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAF8F3] text-[#A48754] transition duration-500 group-hover:bg-white/10 group-hover:text-[#E6CFA5]">
                        <Icon size={19} strokeWidth={1.5} />
                      </span>

                      <ArrowUpRight
                        size={20}
                        className="text-gray-400 transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white"
                      />
                    </div>

                    <h3 className="relative z-10 mt-7 font-luxury text-2xl transition-colors duration-500 group-hover:text-white">
                      {title}
                    </h3>
                    <p className="relative z-10 mt-2 text-xs text-gray-500 transition-colors duration-500 group-hover:text-white/65">
                      {text}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* SIGN OUT */}
            <div
              className="ac-rise flex flex-col justify-between gap-5 border border-black/[0.06] bg-white p-6 sm:flex-row sm:items-center md:px-9"
              style={{ animationDelay: "560ms" }}
            >
              <div>
                <h3 className="text-sm font-medium">Sign out of your account</h3>
                <p className="mt-2 text-xs text-gray-500">
                  You can sign in again whenever you like.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={loggingOut}
                className="ac-btn group flex items-center justify-center gap-2.5 border border-black px-7 py-3 text-[11px] font-medium tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut
                  size={14}
                  className="transition-transform duration-300 group-hover:-translate-x-0.5"
                />
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------- LOGOUT DIALOG -------------------------- */}
      {confirmOpen && (
        <div
          className="ac-fade fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && closeConfirm()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="ac-modal w-full max-w-sm bg-white p-8 shadow-2xl"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF8F3] text-[#A48754]">
              <LogOut size={20} strokeWidth={1.5} />
            </span>

            <h2 id="logout-title" className="mt-6 font-luxury text-2xl">
              Sign out?
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              You will need to sign in again to see your orders and wishlist.
            </p>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                ref={cancelRef}
                type="button"
                onClick={closeConfirm}
                disabled={loggingOut}
                className="flex-1 border border-black/15 py-3 text-[11px] font-medium tracking-[0.15em] transition hover:border-black disabled:opacity-50"
              >
                STAY SIGNED IN
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 bg-black py-3 text-[11px] font-medium tracking-[0.15em] text-white transition hover:bg-[#A48754] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? "SIGNING OUT..." : "SIGN OUT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  STYLES                                                                    */
/* -------------------------------------------------------------------------- */

function AccountStyles() {
  return (
    <style>{`
      .ac-page {
        background:
          radial-gradient(1100px 420px at 50% -8%, #F4EBDA 0%, transparent 60%),
          #FAF8F3;
      }

      .ac-rise {
        opacity: 0;
        transform: translateY(26px);
        animation: ac-rise 0.8s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes ac-rise { to { opacity: 1; transform: translateY(0); } }

      .ac-fade { animation: ac-fade 0.3s ease both; }
      @keyframes ac-fade { from { opacity: 0; } to { opacity: 1; } }
      .ac-modal { animation: ac-modal 0.45s cubic-bezier(.22,1,.36,1) both; }
      @keyframes ac-modal {
        from { opacity: 0; transform: translateY(24px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* profile tilt + glare */
      .ac-tilt {
        transform: perspective(1100px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
        transition: transform 0.5s cubic-bezier(.22,1,.36,1);
        will-change: transform;
      }
      .ac-tilt:hover { transition: transform 0.12s ease-out; }
      .ac-glare {
        opacity: var(--go, 0);
        transition: opacity 0.4s;
        background: radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.22), transparent 55%);
      }

      /* avatar rings */
      .ac-ring { animation: ac-ring 3s ease-out infinite; }
      @keyframes ac-ring {
        0%   { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(1.6); opacity: 0; }
      }
      .ac-spin { animation: ac-spin 18s linear infinite; }
      @keyframes ac-spin { to { transform: rotate(360deg); } }

      /* slow light sweep on the dark card */
      .ac-sheen {
        background: linear-gradient(115deg, transparent 35%, rgba(230,207,165,0.09) 50%, transparent 65%);
        background-size: 250% 100%;
        animation: ac-sheen 6s linear infinite;
      }
      @keyframes ac-sheen {
        from { background-position: 150% 0; }
        to   { background-position: -150% 0; }
      }

      .ac-orb { animation: ac-orb 14s ease-in-out infinite; }
      @keyframes ac-orb {
        0%,100% { transform: translate(0,0) scale(1); }
        50%     { transform: translate(-40px,30px) scale(1.15); }
      }

      .ac-ping { animation: ac-ping 1.8s cubic-bezier(0,0,.2,1) infinite; }
      @keyframes ac-ping {
        75%, 100% { transform: scale(2.4); opacity: 0; }
      }

      /* quick-link cards fill dark on hover */
      .ac-card { transition: transform 0.5s cubic-bezier(.22,1,.36,1), border-color 0.3s, box-shadow 0.5s; }
      .ac-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background: #171717;
        transform: translateY(101%);
        transition: transform 0.55s cubic-bezier(.22,1,.36,1);
      }
      .ac-card:hover { transform: translateY(-4px); box-shadow: 0 30px 50px -30px rgba(0,0,0,0.5); }
      .ac-card:hover::before { transform: translateY(0); }

      /* outlined button fills from below */
      .ac-btn { position: relative; overflow: hidden; transition: color 0.4s; }
      .ac-btn::before {
        content: "";
        position: absolute;
        inset: 0;
        background: #171717;
        transform: translateY(101%);
        transition: transform 0.5s cubic-bezier(.22,1,.36,1);
      }
      .ac-btn:hover { color: #fff; }
      .ac-btn:hover::before { transform: translateY(0); }
      .ac-btn > * { position: relative; z-index: 1; }

      @media (prefers-reduced-motion: reduce) {
        .ac-page *, .ac-page *::before, .ac-page *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        .ac-rise { opacity: 1; transform: none; }
      }
    `}</style>
  );
}
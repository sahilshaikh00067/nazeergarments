import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Mail,
  Pencil,
  RotateCcw,
} from "lucide-react";

import { api } from "../services/api";

/* -------------------------------------------------------------------------- */
/*  CONFIG + HELPERS                                                          */
/* -------------------------------------------------------------------------- */

const RESEND_SECONDS = 30; // client-side wait before "Resend" unlocks
const FALLBACK_MESSAGE =
  "If this email is registered with us, a reset link is on its way.";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const coarsePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

/* Simple countdown that survives re-renders */
function useCooldown(seconds) {
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!endAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [endAt]);

  const remaining = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : 0;

  const start = useCallback(() => {
    setEndAt(Date.now() + seconds * 1000);
    setNow(Date.now());
  }, [seconds]);

  return { remaining, start, active: remaining > 0 };
}

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                      */
/* -------------------------------------------------------------------------- */

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const cooldown = useCooldown(RESEND_SECONDS);

  const stageRef = useRef(null);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // brand panel glow follows the cursor (desktop only)
  const handleMove = (e) => {
    if (reducedMotion() || coarsePointer() || !stageRef.current) return;
    const el = stageRef.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;

    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", `${(x * 60).toFixed(1)}px`);
      el.style.setProperty("--my", `${(y * 60).toFixed(1)}px`);
    });
  };

  const goBack = () => {
    // previous page, or the login page if the user landed here directly
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/login");
  };

  const sendRequest = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/auth/forgot-password/", {
        email: email.trim(),
      });

      setMessage(response.data?.message || FALLBACK_MESSAGE);
      setSent(true);
      cooldown.start();
    } catch {
      setError("Unable to process your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    sendRequest();
  };

  const handleResend = () => {
    if (loading || cooldown.active) return;
    sendRequest();
  };

  const useDifferentEmail = () => {
    setSent(false);
    setMessage("");
    setError("");
  };

  return (
    <main
      ref={stageRef}
      onMouseMove={handleMove}
      className="fp-page relative flex min-h-screen overflow-hidden"
    >
      <ForgotStyles />

      {/* ------------------------- BRAND PANEL (desktop) ------------------------- */}
      <aside className="relative hidden w-[46%] overflow-hidden bg-[#171717] text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="fp-orb-a pointer-events-none absolute -left-20 top-10 h-[420px] w-[420px] rounded-full bg-[#B89B72]/30 blur-3xl" />
        <div className="fp-orb-b pointer-events-none absolute -bottom-24 right-0 h-[380px] w-[380px] rounded-full bg-[#E6CFA5]/15 blur-3xl" />
        <div className="fp-sheen pointer-events-none absolute inset-0" />
        <div className="fp-spin pointer-events-none absolute -right-40 top-1/3 h-[480px] w-[480px] rounded-full border border-dashed border-white/10" />

        <Link to="/" className="fp-rise relative w-fit">
          <p className="font-luxury text-3xl tracking-widest">NAZEER</p>
          <p className="mt-2 text-xs tracking-[0.3em] text-white/60">GARMENTS</p>
        </Link>

        <div className="relative max-w-md">
          <div className="fp-line mb-8 h-px w-16 bg-gradient-to-r from-[#B89B72] to-transparent" />

          <h2
            className="fp-rise font-luxury text-5xl leading-[1.1]"
            style={{ animationDelay: "150ms" }}
          >
            Locked out?
            <br />
            <span className="fp-gold">We'll help.</span>
          </h2>

          <p
            className="fp-rise mt-6 text-sm leading-7 text-white/60"
            style={{ animationDelay: "300ms" }}
          >
            Enter your registered email and we will send you a link to reset
            your password.
          </p>
        </div>

        <p className="relative text-[11px] tracking-[0.25em] text-white/40">
          © NAZEER GARMENTS
        </p>
      </aside>

      {/* ------------------------------ FORM SIDE ------------------------------ */}
      <section className="relative flex flex-1 flex-col px-5 py-6 sm:px-10">
        <div className="fp-orb-b pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#B89B72]/20 blur-3xl lg:hidden" />

        {/* back arrow */}
        <div className="relative">
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
        </div>

        <div className="relative flex flex-1 items-center justify-center py-10">
          <div className="fp-rise relative w-full max-w-md bg-white p-8 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.35)] md:p-10">
            <div className="fp-accent absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#B89B72] via-[#E6CFA5] to-[#B89B72]" />

            {/* mobile logo */}
            <Link to="/" className="mb-8 block text-center lg:hidden">
              <h1 className="font-luxury text-3xl tracking-widest">NAZEER</h1>
              <p className="mt-2 text-xs tracking-[0.3em]">GARMENTS</p>
            </Link>

            {sent ? (
              /* ---------------------------- SUCCESS ---------------------------- */
              <div key="sent" className="text-center">
                <div className="fp-pop-big relative mx-auto flex h-20 w-20 items-center justify-center">
                  <span className="fp-ring absolute inset-0 rounded-full border border-green-500/50" />
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-700">
                    <Check size={34} strokeWidth={2.2} className="fp-check" />
                  </span>
                </div>

                <h2
                  className="fp-rise mt-7 font-luxury text-3xl"
                  style={{ animationDelay: "150ms" }}
                >
                  Check your email
                </h2>

                <p
                  className="fp-rise mt-3 text-sm leading-6 text-gray-500"
                  style={{ animationDelay: "230ms" }}
                  role="status"
                >
                  {message}
                </p>

                <div
                  className="fp-rise mx-auto mt-5 flex w-fit max-w-full items-center gap-2 border border-black/10 bg-[#FAF8F3] px-4 py-2.5 text-sm"
                  style={{ animationDelay: "300ms" }}
                >
                  <Mail size={14} className="shrink-0 text-[#A48754]" />
                  <span className="break-all font-medium">{email.trim()}</span>
                </div>

                {error && (
                  <div
                    key={error}
                    role="alert"
                    className="fp-shake mt-5 flex items-start gap-3 border border-red-100 bg-red-50 p-3.5 text-left text-sm text-red-700"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div
                  className="fp-rise mt-8 space-y-3"
                  style={{ animationDelay: "380ms" }}
                >
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown.active || loading}
                    className="fp-btn group flex w-full items-center justify-center gap-3 bg-black py-4 text-sm font-medium tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        SENDING...
                      </>
                    ) : cooldown.active ? (
                      <span className="tabular-nums">
                        RESEND IN {cooldown.remaining}s
                      </span>
                    ) : (
                      <>
                        <RotateCcw
                          size={15}
                          className="transition-transform duration-500 group-hover:-rotate-180"
                        />
                        RESEND LINK
                      </>
                    )}
                  </button>

                  {/* progress bar for the resend wait */}
                  {cooldown.active && (
                    <div className="h-[2px] w-full overflow-hidden bg-gray-100">
                      <div
                        className="h-full bg-[#B89B72] transition-all duration-500 ease-linear"
                        style={{
                          width: `${(cooldown.remaining / RESEND_SECONDS) * 100}%`,
                        }}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={useDifferentEmail}
                    className="fp-link inline-flex items-center gap-2 text-sm text-gray-700 hover:text-[#A48754]"
                  >
                    <Pencil size={13} />
                    Use a different email
                  </button>
                </div>

                <p className="mt-6 text-xs leading-5 text-gray-400">
                  Can't see it? Check your spam folder before requesting
                  another link.
                </p>
              </div>
            ) : (
              /* ----------------------------- FORM ------------------------------ */
              <div key="form">
                <h2
                  className="fp-rise font-luxury text-3xl lg:text-4xl"
                  style={{ animationDelay: "120ms" }}
                >
                  Forgot Password
                </h2>

                <p
                  className="fp-rise mb-8 mt-2 text-sm text-gray-500"
                  style={{ animationDelay: "200ms" }}
                >
                  Enter your registered email address.
                </p>

                {error && (
                  <div
                    key={error}
                    role="alert"
                    className="fp-shake mb-5 flex items-start gap-3 border border-red-100 bg-red-50 p-3.5 text-sm text-red-700"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="fp-rise" style={{ animationDelay: "280ms" }}>
                    <label
                      htmlFor="forgot-email"
                      className="mb-2 block text-sm font-medium"
                    >
                      Email Address
                    </label>

                    <div className="fp-field relative">
                      <Mail
                        size={16}
                        className="fp-icon pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full border border-gray-300 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition-colors duration-300 placeholder:text-gray-400 focus:border-black"
                      />
                      <span className="fp-bar" />
                    </div>
                  </div>

                  <div className="fp-rise" style={{ animationDelay: "360ms" }}>
                    <button
                      type="submit"
                      disabled={loading}
                      className="fp-btn fp-shine group flex w-full items-center justify-center gap-3 bg-black py-4 text-sm font-medium tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          SENDING...
                        </>
                      ) : (
                        <>
                          SEND RESET LINK
                          <ArrowRight
                            size={16}
                            className="transition-transform duration-300 group-hover:translate-x-1.5"
                          />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <Link
              to="/login"
              className="fp-rise group mt-8 flex items-center justify-center gap-2 text-sm text-gray-700 transition hover:text-[#A48754]"
              style={{ animationDelay: "460ms" }}
            >
              <ArrowLeft
                size={14}
                className="transition-transform duration-300 group-hover:-translate-x-1"
              />
              <span className="fp-link">Back to Login</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  STYLES                                                                    */
/* -------------------------------------------------------------------------- */

function ForgotStyles() {
  return (
    <style>{`
      .fp-page {
        background:
          radial-gradient(1000px 500px at 80% -10%, #F4EBDA 0%, transparent 60%),
          #FAF8F3;
      }

      .fp-rise {
        opacity: 0;
        transform: translateY(24px);
        animation: fp-rise 0.9s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes fp-rise { to { opacity: 1; transform: translateY(0); } }

      .fp-accent { transform-origin: left; animation: fp-line 1.2s 0.3s cubic-bezier(.22,1,.36,1) both; }
      .fp-line { transform-origin: left; animation: fp-line 1.2s 0.2s cubic-bezier(.22,1,.36,1) both; }
      @keyframes fp-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }

      .fp-gold {
        background: linear-gradient(100deg, #B89B72 30%, #F1DDB4 50%, #B89B72 70%);
        background-size: 250% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: fp-shimmer 5s ease-in-out infinite;
      }
      @keyframes fp-shimmer {
        0%,100% { background-position: 100% 0; }
        50%     { background-position: 0 0; }
      }

      .fp-orb-a {
        transform: translate(var(--mx, 0px), var(--my, 0px));
        transition: transform 0.9s cubic-bezier(.22,1,.36,1);
        animation: fp-drift 14s ease-in-out infinite;
      }
      .fp-orb-b { animation: fp-drift 18s ease-in-out infinite reverse; }
      @keyframes fp-drift {
        0%,100% { margin: 0; }
        50%     { margin: 30px 0 0 30px; }
      }

      .fp-sheen {
        background: linear-gradient(115deg, transparent 35%, rgba(230,207,165,0.07) 50%, transparent 65%);
        background-size: 250% 100%;
        animation: fp-sheen 7s linear infinite;
      }
      @keyframes fp-sheen {
        from { background-position: 150% 0; }
        to   { background-position: -150% 0; }
      }

      .fp-spin { animation: fp-spin 40s linear infinite; }
      @keyframes fp-spin { to { transform: rotate(360deg); } }

      /* input focus */
      .fp-field:focus-within .fp-icon { color: #A48754; }
      .fp-icon { transition: color 0.3s; }
      .fp-bar {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        height: 2px;
        background: linear-gradient(90deg, #B89B72, #E6CFA5);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.5s cubic-bezier(.22,1,.36,1);
        pointer-events: none;
      }
      .fp-field:focus-within .fp-bar { transform: scaleX(1); }

      .fp-link {
        background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 100% 1px;
        transition: background-size 0.5s cubic-bezier(.22,1,.36,1), color 0.3s;
      }
      .fp-link:hover, a:hover > .fp-link { background-size: 0 1px; background-position: 100% 100%; }

      .fp-shake { animation: fp-shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      @keyframes fp-shake {
        10%, 90% { transform: translateX(-1px); }
        20%, 80% { transform: translateX(2px); }
        30%, 50%, 70% { transform: translateX(-4px); }
        40%, 60% { transform: translateX(4px); }
      }

      /* success */
      .fp-pop-big { animation: fp-pop-big 0.7s cubic-bezier(.34,1.56,.64,1) both; }
      @keyframes fp-pop-big {
        from { opacity: 0; transform: scale(0.4); }
        to   { opacity: 1; transform: scale(1); }
      }
      .fp-ring { animation: fp-ring 2.4s ease-out infinite; }
      @keyframes fp-ring {
        0%   { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(1.7); opacity: 0; }
      }
      .fp-check {
        stroke-dasharray: 30;
        stroke-dashoffset: 30;
        animation: fp-check 0.6s 0.4s ease-out forwards;
      }
      @keyframes fp-check { to { stroke-dashoffset: 0; } }

      /* buttons */
      .fp-btn { position: relative; overflow: hidden; transition: color 0.4s; }
      .fp-btn::before {
        content: "";
        position: absolute;
        inset: 0;
        background: #A48754;
        transform: translateY(101%);
        transition: transform 0.55s cubic-bezier(.22,1,.36,1);
      }
      .fp-btn:hover:not(:disabled)::before { transform: translateY(0); }
      .fp-btn > * { position: relative; z-index: 1; }
      .fp-shine::after {
        content: "";
        position: absolute;
        top: 0; bottom: 0; left: -40%;
        width: 30%;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,0.22), transparent);
        transform: skewX(-20deg);
        animation: fp-shine 4s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes fp-shine {
        0%, 55% { left: -40%; }
        100%    { left: 140%; }
      }

      @media (prefers-reduced-motion: reduce) {
        .fp-page *, .fp-page *::before, .fp-page *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        .fp-rise { opacity: 1; transform: none; }
        .fp-check { stroke-dashoffset: 0; }
      }
    `}</style>
  );
}
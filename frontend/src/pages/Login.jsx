import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  TriangleAlert,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const coarsePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

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
    // previous page, or the home page if the user landed here directly
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);

      const from = location.state?.from;

      const redirectTo = from?.pathname
        ? `${from.pathname}${from.search || ""}${from.hash || ""}`
        : "/account";

      navigate(redirectTo, { replace: true });
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.errors?.non_field_errors?.[0] ||
          data?.errors?.email?.[0] ||
          data?.errors?.password?.[0] ||
          data?.detail ||
          "Unable to login. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  const checkCaps = (e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  return (
    <main
      ref={stageRef}
      onMouseMove={handleMove}
      className="lg-page relative flex min-h-screen overflow-hidden"
    >
      <LoginStyles />

      {/* ------------------------- BRAND PANEL (desktop) ------------------------- */}
      <aside className="relative hidden w-[46%] overflow-hidden bg-[#171717] text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="lg-orb-a pointer-events-none absolute -left-20 top-10 h-[420px] w-[420px] rounded-full bg-[#B89B72]/30 blur-3xl" />
        <div className="lg-orb-b pointer-events-none absolute -bottom-24 right-0 h-[380px] w-[380px] rounded-full bg-[#E6CFA5]/15 blur-3xl" />
        <div className="lg-sheen pointer-events-none absolute inset-0" />

        {/* subtle rotating ring */}
        <div className="lg-spin pointer-events-none absolute -right-40 top-1/3 h-[480px] w-[480px] rounded-full border border-dashed border-white/10" />

        <Link to="/" className="lg-rise relative w-fit">
          <p className="font-luxury text-3xl tracking-widest">NAZEER</p>
          <p className="mt-2 text-xs tracking-[0.3em] text-white/60">GARMENTS</p>
        </Link>

        <div className="relative max-w-md">
          <div className="lg-line mb-8 h-px w-16 bg-gradient-to-r from-[#B89B72] to-transparent" />

          <h2
            className="lg-rise font-luxury text-5xl leading-[1.1]"
            style={{ animationDelay: "150ms" }}
          >
            Your style.
            <br />
            <span className="lg-gold">Your identity.</span>
          </h2>

          <p
            className="lg-rise mt-6 text-sm leading-7 text-white/60"
            style={{ animationDelay: "300ms" }}
          >
            Sign in to track your orders, manage your wishlist and check out
            faster.
          </p>
        </div>

        <p className="relative text-[11px] tracking-[0.25em] text-white/40">
          © NAZEER GARMENTS
        </p>
      </aside>

      {/* ------------------------------ FORM SIDE ------------------------------ */}
      <section className="relative flex flex-1 flex-col px-5 py-6 sm:px-10">
        {/* soft glow behind the form */}
        <div className="lg-orb-b pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#B89B72]/20 blur-3xl lg:hidden" />

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
          <div className="lg-card lg-rise w-full max-w-md bg-white p-8 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.35)] md:p-10">
            {/* gold top accent */}
            <div className="lg-accent absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#B89B72] via-[#E6CFA5] to-[#B89B72]" />

            {/* mobile logo */}
            <Link to="/" className="mb-8 block text-center lg:hidden">
              <h1 className="font-luxury text-3xl tracking-widest">NAZEER</h1>
              <p className="mt-2 text-xs tracking-[0.3em]">GARMENTS</p>
            </Link>

            <h2
              className="lg-rise font-luxury text-3xl lg:text-4xl"
              style={{ animationDelay: "120ms" }}
            >
              Welcome Back
            </h2>

            <p
              className="lg-rise mb-8 mt-2 text-sm text-gray-500"
              style={{ animationDelay: "200ms" }}
            >
              Sign in to your account
            </p>

            {error && (
              <div
                key={error}
                role="alert"
                className="lg-shake mb-5 flex items-start gap-3 border border-red-100 bg-red-50 p-3.5 text-sm text-red-700"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
              {/* EMAIL */}
              <div className="lg-rise" style={{ animationDelay: "280ms" }}>
                <label htmlFor="login-email" className="mb-2 block text-sm font-medium">
                  Email Address
                </label>

                <div className="lg-field relative">
                  <Mail
                    size={16}
                    className="lg-icon pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition-colors duration-300 placeholder:text-gray-400 focus:border-black"
                    placeholder="Enter your email"
                  />
                  <span className="lg-bar" />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="lg-rise" style={{ animationDelay: "360ms" }}>
                <label htmlFor="login-password" className="mb-2 block text-sm font-medium">
                  Password
                </label>

                <div className="lg-field relative">
                  <Lock
                    size={16}
                    className="lg-icon pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={checkCaps}
                    onKeyDown={checkCaps}
                    onBlur={() => setCapsLock(false)}
                    className="w-full border border-gray-300 bg-white py-3.5 pl-11 pr-12 text-sm outline-none transition-colors duration-300 placeholder:text-gray-400 focus:border-black"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-gray-400 transition hover:text-black"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                  <span className="lg-bar" />
                </div>

                {capsLock && (
                  <p className="lg-pop mt-2 flex items-center gap-2 text-xs text-amber-700">
                    <TriangleAlert size={13} />
                    Caps Lock is on
                  </p>
                )}
              </div>

              <div
                className="lg-rise text-right"
                style={{ animationDelay: "420ms" }}
              >
                <Link
                  to="/forgot-password"
                  className="lg-link text-sm text-gray-700 hover:text-[#A48754]"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* SUBMIT */}
              <div className="lg-rise" style={{ animationDelay: "480ms" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="lg-btn lg-shine group flex w-full items-center justify-center gap-3 bg-black py-4 text-sm font-medium tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      PLEASE WAIT...
                    </>
                  ) : (
                    <>
                      SIGN IN
                      <ArrowRight
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-1.5"
                      />
                    </>
                  )}
                </button>
              </div>
            </form>

            <p
              className="lg-rise mt-8 text-center text-sm text-gray-600"
              style={{ animationDelay: "560ms" }}
            >
              Don't have an account?{" "}
              <Link to="/register" className="lg-link font-medium text-black hover:text-[#A48754]">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  STYLES                                                                    */
/* -------------------------------------------------------------------------- */

function LoginStyles() {
  return (
    <style>{`
      .lg-page {
        background:
          radial-gradient(1000px 500px at 80% -10%, #F4EBDA 0%, transparent 60%),
          #FAF8F3;
      }

      .lg-rise {
        opacity: 0;
        transform: translateY(24px);
        animation: lg-rise 0.9s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes lg-rise { to { opacity: 1; transform: translateY(0); } }

      .lg-card { position: relative; }
      .lg-accent { transform-origin: left; animation: lg-line 1.2s 0.3s cubic-bezier(.22,1,.36,1) both; }
      .lg-line { transform-origin: left; animation: lg-line 1.2s 0.2s cubic-bezier(.22,1,.36,1) both; }
      @keyframes lg-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }

      /* brand panel */
      .lg-gold {
        background: linear-gradient(100deg, #B89B72 30%, #F1DDB4 50%, #B89B72 70%);
        background-size: 250% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: lg-shimmer 5s ease-in-out infinite;
      }
      @keyframes lg-shimmer {
        0%,100% { background-position: 100% 0; }
        50%     { background-position: 0 0; }
      }

      .lg-orb-a {
        transform: translate(var(--mx, 0px), var(--my, 0px));
        transition: transform 0.9s cubic-bezier(.22,1,.36,1);
        animation: lg-drift 14s ease-in-out infinite;
      }
      .lg-orb-b { animation: lg-drift 18s ease-in-out infinite reverse; }
      @keyframes lg-drift {
        0%,100% { margin: 0; }
        50%     { margin: 30px 0 0 30px; }
      }

      .lg-sheen {
        background: linear-gradient(115deg, transparent 35%, rgba(230,207,165,0.07) 50%, transparent 65%);
        background-size: 250% 100%;
        animation: lg-sheen 7s linear infinite;
      }
      @keyframes lg-sheen {
        from { background-position: 150% 0; }
        to   { background-position: -150% 0; }
      }

      .lg-spin { animation: lg-spin 40s linear infinite; }
      @keyframes lg-spin { to { transform: rotate(360deg); } }

      /* input interactions */
      .lg-field:focus-within .lg-icon { color: #A48754; }
      .lg-bar {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        height: 2px;
        background: linear-gradient(90deg, #B89B72, #E6CFA5);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.5s cubic-bezier(.22,1,.36,1);
        pointer-events: none;
      }
      .lg-field:focus-within .lg-bar { transform: scaleX(1); }
      .lg-icon { transition: color 0.3s; }

      /* animated underline links */
      .lg-link {
        background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 100% 1px;
        transition: background-size 0.5s cubic-bezier(.22,1,.36,1), color 0.3s;
      }
      .lg-link:hover { background-size: 0 1px; background-position: 100% 100%; }

      /* error shake */
      .lg-shake { animation: lg-shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      @keyframes lg-shake {
        10%, 90% { transform: translateX(-1px); }
        20%, 80% { transform: translateX(2px); }
        30%, 50%, 70% { transform: translateX(-4px); }
        40%, 60% { transform: translateX(4px); }
      }

      .lg-pop { animation: lg-pop 0.35s cubic-bezier(.22,1,.36,1); }
      @keyframes lg-pop {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* main button: gold fill from below + light sweep */
      .lg-btn { position: relative; overflow: hidden; transition: color 0.4s; }
      .lg-btn::before {
        content: "";
        position: absolute;
        inset: 0;
        background: #A48754;
        transform: translateY(101%);
        transition: transform 0.55s cubic-bezier(.22,1,.36,1);
      }
      .lg-btn:hover:not(:disabled)::before { transform: translateY(0); }
      .lg-btn > * { position: relative; z-index: 1; }
      .lg-shine::after {
        content: "";
        position: absolute;
        top: 0; bottom: 0; left: -40%;
        width: 30%;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,0.22), transparent);
        transform: skewX(-20deg);
        animation: lg-shine 4s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes lg-shine {
        0%, 55% { left: -40%; }
        100%    { left: 140%; }
      }

      @media (prefers-reduced-motion: reduce) {
        .lg-page *, .lg-page *::before, .lg-page *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        .lg-rise { opacity: 1; transform: none; }
      }
    `}</style>
  );
}
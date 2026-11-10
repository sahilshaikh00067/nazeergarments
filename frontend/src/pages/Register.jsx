import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

/* -------------------------------------------------------------------------- */
/*  CONFIG + HELPERS                                                          */
/* -------------------------------------------------------------------------- */

const FIELDS = [
  {
    name: "full_name",
    label: "Full Name",
    type: "text",
    placeholder: "Enter your full name",
    autoComplete: "name",
    Icon: UserRound,
  },
  {
    name: "email",
    label: "Email Address",
    type: "email",
    placeholder: "Enter your email",
    autoComplete: "email",
    Icon: Mail,
  },
  {
    name: "phone",
    label: "Mobile Number",
    type: "tel",
    placeholder: "10-digit mobile number",
    autoComplete: "tel",
    Icon: Phone,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Create password",
    autoComplete: "new-password",
    Icon: Lock,
  },
  {
    name: "confirm_password",
    label: "Confirm Password",
    type: "password",
    placeholder: "Confirm password",
    autoComplete: "new-password",
    Icon: ShieldCheck,
  },
];

const STRENGTH = [
  { label: "", color: "bg-gray-200", text: "text-gray-400" },
  { label: "Weak", color: "bg-red-500", text: "text-red-600" },
  { label: "Fair", color: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", color: "bg-lime-500", text: "text-lime-600" },
  { label: "Strong", color: "bg-green-600", text: "text-green-700" },
];

// visual hint only, the server still decides what is accepted
const getStrength = (password) => {
  if (!password) return 0;
  return [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
};

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const coarsePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                      */
/* -------------------------------------------------------------------------- */

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const stageRef = useRef(null);
  const errorRef = useRef(null);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // bring the error into view on small screens
  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "center",
      });
    }
  }, [error]);

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

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    // mobile number accepts digits only
    if (name === "phone") value = value.replace(/\D/g, "");

    setForm((old) => ({ ...old, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register(form);
      navigate("/account", { replace: true });
    } catch (err) {
      const data = err.response?.data;
      const errors = data?.errors;

      if (errors) {
        const firstError = Object.values(errors).flat()[0];
        setError(String(firstError || "Registration failed."));
      } else {
        setError(data?.message || "Unable to create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = useMemo(() => getStrength(form.password), [form.password]);
  const confirmTyped = form.confirm_password.length > 0;
  const matches = confirmTyped && form.password === form.confirm_password;

  return (
    <main
      ref={stageRef}
      onMouseMove={handleMove}
      className="rg-page relative flex min-h-screen overflow-x-clip"
    >
      <RegisterStyles />

      {/* ------------------------- BRAND PANEL (desktop) ------------------------- */}
      <aside className="relative hidden w-[42%] overflow-hidden bg-[#171717] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:p-14">
        <div className="rg-orb-a pointer-events-none absolute -left-20 top-10 h-[420px] w-[420px] rounded-full bg-[#B89B72]/30 blur-3xl" />
        <div className="rg-orb-b pointer-events-none absolute -bottom-24 right-0 h-[380px] w-[380px] rounded-full bg-[#E6CFA5]/15 blur-3xl" />
        <div className="rg-sheen pointer-events-none absolute inset-0" />
        <div className="rg-spin pointer-events-none absolute -right-40 top-1/3 h-[480px] w-[480px] rounded-full border border-dashed border-white/10" />

        <Link to="/" className="rg-rise relative w-fit">
          <p className="font-luxury text-3xl tracking-widest">NAZEER</p>
          <p className="mt-2 text-xs tracking-[0.3em] text-white/60">GARMENTS</p>
        </Link>

        <div className="relative max-w-md">
          <div className="rg-line mb-8 h-px w-16 bg-gradient-to-r from-[#B89B72] to-transparent" />

          <h2
            className="rg-rise font-luxury text-5xl leading-[1.1]"
            style={{ animationDelay: "150ms" }}
          >
            Join Nazeer
            <br />
            <span className="rg-gold">Garments.</span>
          </h2>

          <p
            className="rg-rise mt-6 text-sm leading-7 text-white/60"
            style={{ animationDelay: "300ms" }}
          >
            Create an account to track your orders, save pieces to your
            wishlist and check out faster.
          </p>
        </div>

        <p className="relative text-[11px] tracking-[0.25em] text-white/40">
          © NAZEER GARMENTS
        </p>
      </aside>

      {/* ------------------------------ FORM SIDE ------------------------------ */}
      <section className="relative flex min-w-0 flex-1 flex-col px-5 py-6 sm:px-10">
        <div className="rg-orb-b pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#B89B72]/20 blur-3xl lg:hidden" />

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
          <div className="rg-rise relative w-full max-w-lg bg-white p-8 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.35)] md:p-10">
            <div className="rg-accent absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#B89B72] via-[#E6CFA5] to-[#B89B72]" />

            {/* mobile logo */}
            <Link to="/" className="mb-8 block text-center lg:hidden">
              <h1 className="font-luxury text-3xl tracking-widest">NAZEER</h1>
              <p className="mt-2 text-xs tracking-[0.3em]">GARMENTS</p>
            </Link>

            <h2
              className="rg-rise font-luxury text-3xl lg:text-4xl"
              style={{ animationDelay: "120ms" }}
            >
              Create Account
            </h2>

            <p
              className="rg-rise mb-8 mt-2 text-sm text-gray-500"
              style={{ animationDelay: "200ms" }}
            >
              Join Nazeer Garments
            </p>

            {error && (
              <div
                key={error}
                ref={errorRef}
                role="alert"
                className="rg-shake mb-5 flex items-start gap-3 border border-red-100 bg-red-50 p-3.5 text-sm text-red-700"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {FIELDS.map((field, i) => {
                const { name, label, Icon } = field;
                const isPassword = name === "password";
                const isConfirm = name === "confirm_password";
                const isPhone = name === "phone";

                const visible = isPassword
                  ? showPassword
                  : isConfirm
                  ? showConfirm
                  : false;

                const type =
                  isPassword || isConfirm
                    ? visible
                      ? "text"
                      : "password"
                    : field.type;

                return (
                  <div
                    key={name}
                    className="rg-rise"
                    style={{ animationDelay: `${260 + i * 70}ms` }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <label htmlFor={`reg-${name}`} className="text-sm font-medium">
                        {label}
                      </label>

                      {isPhone && (
                        <span className="text-[11px] tabular-nums text-gray-400">
                          {form.phone.length}/10
                        </span>
                      )}
                    </div>

                    <div className="rg-field relative">
                      <Icon
                        size={16}
                        className="rg-icon pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        id={`reg-${name}`}
                        name={name}
                        type={type}
                        required
                        autoComplete={field.autoComplete}
                        inputMode={isPhone ? "numeric" : undefined}
                        value={form[name]}
                        onChange={handleChange}
                        maxLength={isPhone ? 10 : undefined}
                        placeholder={field.placeholder}
                        className={`w-full border border-gray-300 bg-white py-3.5 pl-11 text-sm outline-none transition-colors duration-300 placeholder:text-gray-400 focus:border-black ${
                          isPassword || isConfirm ? "pr-12" : "pr-4"
                        }`}
                      />

                      {(isPassword || isConfirm) && (
                        <button
                          type="button"
                          onClick={() =>
                            isPassword
                              ? setShowPassword((s) => !s)
                              : setShowConfirm((s) => !s)
                          }
                          aria-label={visible ? "Hide password" : "Show password"}
                          aria-pressed={visible}
                          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-gray-400 transition hover:text-black"
                        >
                          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      )}

                      <span className="rg-bar" />
                    </div>

                    {/* password strength meter */}
                    {isPassword && form.password && (
                      <div className="rg-pop mt-3">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4].map((n) => (
                            <span
                              key={n}
                              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                                n <= strength ? STRENGTH[strength].color : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`mt-2 text-xs ${STRENGTH[strength].text}`}>
                          Password strength: {STRENGTH[strength].label}
                        </p>
                      </div>
                    )}

                    {/* match indicator */}
                    {isConfirm && confirmTyped && (
                      <p
                        key={matches ? "match" : "no-match"}
                        className={`rg-pop mt-2 flex items-center gap-2 text-xs ${
                          matches ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {matches ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                        {matches ? "Passwords match" : "Passwords do not match yet"}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* SUBMIT */}
              <div
                className="rg-rise pt-2"
                style={{ animationDelay: `${260 + FIELDS.length * 70}ms` }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  className="rg-btn rg-shine group flex w-full items-center justify-center gap-3 bg-black py-4 text-sm font-medium tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      CREATING ACCOUNT...
                    </>
                  ) : (
                    <>
                      CREATE ACCOUNT
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
              className="rg-rise mt-8 text-center text-sm text-gray-600"
              style={{ animationDelay: `${340 + FIELDS.length * 70}ms` }}
            >
              Already have an account?{" "}
              <Link
                to="/login"
                className="rg-link font-medium text-black hover:text-[#A48754]"
              >
                Sign In
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

function RegisterStyles() {
  return (
    <style>{`
      .rg-page {
        background:
          radial-gradient(1000px 500px at 80% -10%, #F4EBDA 0%, transparent 60%),
          #FAF8F3;
      }

      .rg-rise {
        opacity: 0;
        transform: translateY(24px);
        animation: rg-rise 0.9s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes rg-rise { to { opacity: 1; transform: translateY(0); } }

      .rg-accent { transform-origin: left; animation: rg-line 1.2s 0.3s cubic-bezier(.22,1,.36,1) both; }
      .rg-line { transform-origin: left; animation: rg-line 1.2s 0.2s cubic-bezier(.22,1,.36,1) both; }
      @keyframes rg-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }

      .rg-gold {
        background: linear-gradient(100deg, #B89B72 30%, #F1DDB4 50%, #B89B72 70%);
        background-size: 250% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: rg-shimmer 5s ease-in-out infinite;
      }
      @keyframes rg-shimmer {
        0%,100% { background-position: 100% 0; }
        50%     { background-position: 0 0; }
      }

      .rg-orb-a {
        transform: translate(var(--mx, 0px), var(--my, 0px));
        transition: transform 0.9s cubic-bezier(.22,1,.36,1);
        animation: rg-drift 14s ease-in-out infinite;
      }
      .rg-orb-b { animation: rg-drift 18s ease-in-out infinite reverse; }
      @keyframes rg-drift {
        0%,100% { margin: 0; }
        50%     { margin: 30px 0 0 30px; }
      }

      .rg-sheen {
        background: linear-gradient(115deg, transparent 35%, rgba(230,207,165,0.07) 50%, transparent 65%);
        background-size: 250% 100%;
        animation: rg-sheen 7s linear infinite;
      }
      @keyframes rg-sheen {
        from { background-position: 150% 0; }
        to   { background-position: -150% 0; }
      }

      .rg-spin { animation: rg-spin 40s linear infinite; }
      @keyframes rg-spin { to { transform: rotate(360deg); } }

      /* input focus */
      .rg-field:focus-within .rg-icon { color: #A48754; }
      .rg-icon { transition: color 0.3s; }
      .rg-bar {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        height: 2px;
        background: linear-gradient(90deg, #B89B72, #E6CFA5);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.5s cubic-bezier(.22,1,.36,1);
        pointer-events: none;
      }
      .rg-field:focus-within .rg-bar { transform: scaleX(1); }

      .rg-link {
        background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 100% 1px;
        transition: background-size 0.5s cubic-bezier(.22,1,.36,1), color 0.3s;
      }
      .rg-link:hover { background-size: 0 1px; background-position: 100% 100%; }

      .rg-shake { animation: rg-shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      @keyframes rg-shake {
        10%, 90% { transform: translateX(-1px); }
        20%, 80% { transform: translateX(2px); }
        30%, 50%, 70% { transform: translateX(-4px); }
        40%, 60% { transform: translateX(4px); }
      }

      .rg-pop { animation: rg-pop 0.35s cubic-bezier(.22,1,.36,1); }
      @keyframes rg-pop {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .rg-btn { position: relative; overflow: hidden; transition: color 0.4s; }
      .rg-btn::before {
        content: "";
        position: absolute;
        inset: 0;
        background: #A48754;
        transform: translateY(101%);
        transition: transform 0.55s cubic-bezier(.22,1,.36,1);
      }
      .rg-btn:hover:not(:disabled)::before { transform: translateY(0); }
      .rg-btn > * { position: relative; z-index: 1; }
      .rg-shine::after {
        content: "";
        position: absolute;
        top: 0; bottom: 0; left: -40%;
        width: 30%;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,0.22), transparent);
        transform: skewX(-20deg);
        animation: rg-shine 4s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes rg-shine {
        0%, 55% { left: -40%; }
        100%    { left: 140%; }
      }

      @media (prefers-reduced-motion: reduce) {
        .rg-page *, .rg-page *::before, .rg-page *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        .rg-rise { opacity: 1; transform: none; }
      }
    `}</style>
  );
}
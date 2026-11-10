import { useCallback, useEffect, useRef, useState } from "react";

/* -------------------------------------------------------------------------- */
/*  CONFIG                                                                    */
/* -------------------------------------------------------------------------- */

const PHONE_NUMBER = "918381845350";
const TEASER_DELAY = 4000; // show the "Need assistance?" bubble after this long
const TEASER_VISIBLE = 7000; // and hide it again after this long
const TEASER_KEY = "wa_teaser_seen";

const OPTIONS = [
  {
    label: "Know more about products",
    text: "Hello Nazeer Garments! I would like to know more about your products and collections.",
  },
  {
    label: "Help with my order",
    text: "Hello Nazeer Garments! I need help with my order.",
  },
  {
    label: "Size and fit guidance",
    text: "Hello Nazeer Garments! I need help choosing the right size.",
  },
  {
    label: "Something else",
    text: "Hello Nazeer Garments! I have a question.",
  },
];

const buildUrl = (text) =>
  `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(text)}`;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const coarsePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

/* -------------------------------------------------------------------------- */
/*  ICONS (inline, no dependencies)                                           */
/* -------------------------------------------------------------------------- */

function WhatsAppIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M16.04 2.67A13.25 13.25 0 0 0 4.65 22.7L2.9 29.1l6.55-1.72a13.25 13.25 0 1 0 6.59-24.7Zm0 24.1c-2.03 0-4.02-.55-5.76-1.6l-.41-.24-3.89 1.02 1.04-3.78-.27-.43a10.82 10.82 0 1 1 9.29 5.03Zm5.94-8.1c-.33-.16-1.94-.96-2.24-1.07-.3-.11-.52-.16-.74.16-.22.33-.85 1.07-1.04 1.29-.19.22-.38.25-.71.08-.33-.16-1.39-.51-2.64-1.63-.98-.87-1.64-1.94-1.83-2.27-.19-.33-.02-.51.14-.67.15-.14.33-.38.49-.57.16-.19.22-.33.33-.55.11-.22.06-.41-.03-.57-.08-.16-.74-1.78-1.02-2.44-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71s1.17 3.14 1.34 3.36c.16.22 2.3 3.51 5.57 4.92.78.34 1.39.54 1.86.69.78.25 1.49.22 2.05.13.63-.09 1.94-.79 2.22-1.56.27-.76.27-1.42.19-1.56-.08-.14-.3-.22-.63-.38Z" />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ArrowIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17L17 7M8 7h9v9" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  COMPONENT                                                                 */
/* -------------------------------------------------------------------------- */

export default function WhatsAppButton() {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [unread, setUnread] = useState(true);

  const rootRef = useRef(null);
  const magRef = useRef(null);
  const raf = useRef(0);

  /* ---- teaser bubble: appears once per session ---- */
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(TEASER_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    if (seen) return;

    let hideTimer;
    const showTimer = setTimeout(() => {
      setTeaser(true);
      try {
        sessionStorage.setItem(TEASER_KEY, "1");
      } catch {
        /* storage unavailable */
      }
      hideTimer = setTimeout(() => setTeaser(false), TEASER_VISIBLE);
    }, TEASER_DELAY);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  /* ---- typing indicator plays each time the panel opens ---- */
  useEffect(() => {
    if (!open) return;
    setTeaser(false);
    setUnread(false);
    setTyping(true);
    const id = setTimeout(() => setTyping(false), reducedMotion() ? 0 : 1300);
    return () => clearTimeout(id);
  }, [open]);

  /* ---- close on Escape / outside click ---- */
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /* ---- magnetic hover: the button leans toward the cursor ---- */
  const handleMove = useCallback((e) => {
    if (reducedMotion() || coarsePointer() || !magRef.current) return;
    const el = magRef.current;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);

    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--tx", `${(dx * 0.22).toFixed(1)}px`);
      el.style.setProperty("--ty", `${(dy * 0.22).toFixed(1)}px`);
    });
  }, []);

  const handleLeave = useCallback(() => {
    const el = magRef.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty("--tx", "0px");
    el.style.setProperty("--ty", "0px");
  }, []);

  return (
    <>
      <WidgetStyles />

      <div ref={rootRef} className={`wa-root ${open ? "is-open" : ""}`}>
        {/* ------------------------------ CHAT PANEL ------------------------------ */}
        <section
          id="wa-panel"
          role="dialog"
          aria-label="Chat with Nazeer Garments"
          aria-hidden={!open}
          className="wa-panel"
        >
          {/* header */}
          <header className="wa-head">
            <div className="wa-sheen" />

            <div className="wa-avatar">
              <span>N</span>
              <i className="wa-online" />
            </div>

            <div className="wa-head-text">
              <strong>Nazeer Garments</strong>
              <small>Chat with us on WhatsApp</small>
            </div>

            <button
              type="button"
              className="wa-x"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <CloseIcon />
            </button>
          </header>

          {/* conversation */}
          <div className="wa-body">
            <div className="wa-day">Today</div>

            {typing ? (
              <div className="wa-bubble wa-typing" aria-label="Typing">
                <i />
                <i />
                <i />
              </div>
            ) : (
              open && (
                <div className="wa-bubble wa-in">
                  Hello! 👋 Welcome to Nazeer Garments.
                  <br />
                  How can we help you today?
                </div>
              )
            )}

            {/* quick topics */}
            <div className="wa-chips">
              <p className="wa-chips-title">Choose a topic to start</p>

              {OPTIONS.map((opt, i) => (
                <a
                  key={opt.label}
                  href={buildUrl(opt.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wa-chip"
                  style={{ "--i": i }}
                >
                  <span>{opt.label}</span>
                  <ArrowIcon className="wa-chip-arrow" />
                </a>
              ))}
            </div>
          </div>

          {/* footer CTA */}
          <footer className="wa-foot">
            <a
              href={buildUrl(OPTIONS[0].text)}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-cta"
            >
              <WhatsAppIcon className="wa-cta-icon" />
              Start chat
            </a>
          </footer>
        </section>

        {/* ------------------------------- FAB ROW -------------------------------- */}
        <div className="wa-row">
          <div className={`wa-pill ${teaser ? "is-on" : ""}`} aria-hidden="true">
            <i className="wa-dot" />
            <span>
              <strong>Need assistance?</strong>
              <small>Chat with us on WhatsApp</small>
            </span>
          </div>

          <div
            ref={magRef}
            className="wa-mag"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
          >
            <div className="wa-float">
              <button
                type="button"
                className="wa-fab"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="wa-panel"
                aria-label={
                  open ? "Close WhatsApp chat" : "Chat with Nazeer Garments on WhatsApp"
                }
              >
                <span className="wa-ring" />
                <span className="wa-ring wa-ring-2" />

                <WhatsAppIcon className="wa-ico wa-ico-wa" />
                <CloseIcon className="wa-ico wa-ico-x" />

                {unread && !open && <span className="wa-badge">1</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  STYLES                                                                    */
/* -------------------------------------------------------------------------- */

function WidgetStyles() {
  return (
    <style>{`
      .wa-root {
        position: fixed;
        right: 28px;
        bottom: calc(28px + env(safe-area-inset-bottom, 0px));
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 16px;
        font-family: inherit;
      }

      /* ------------------------------ FAB ------------------------------ */
      .wa-row { position: relative; display: flex; align-items: center; }

      .wa-mag {
        transform: translate(var(--tx, 0px), var(--ty, 0px));
        transition: transform 0.45s cubic-bezier(.22,1,.36,1);
        animation: wa-enter 0.9s 0.6s cubic-bezier(.34,1.56,.64,1) backwards;
      }
      @keyframes wa-enter {
        from { opacity: 0; transform: translateY(40px) scale(0.4); }
        to   { opacity: 1; transform: translate(var(--tx, 0px), var(--ty, 0px)) scale(1); }
      }

      .wa-float { animation: wa-float 3.4s ease-in-out infinite; }
      .wa-root.is-open .wa-float { animation-play-state: paused; }
      @keyframes wa-float {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-6px); }
      }

      .wa-fab {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        padding: 0;
        border: 2px solid rgba(255,255,255,0.9);
        border-radius: 50%;
        color: #fff;
        cursor: pointer;
        background: linear-gradient(145deg, #2de17c, #079b50);
        box-shadow: 0 10px 28px rgba(18,166,91,0.35), 0 3px 8px rgba(0,0,0,0.12);
        transition: box-shadow 0.4s ease, transform 0.4s cubic-bezier(.22,1,.36,1);
        -webkit-tap-highlight-color: transparent;
      }
      .wa-fab:hover { box-shadow: 0 18px 40px rgba(18,166,91,0.5); transform: scale(1.06); }
      .wa-fab:active { transform: scale(0.94); }
      .wa-fab:focus-visible { outline: 3px solid #25231f; outline-offset: 4px; }

      .wa-ring {
        position: absolute;
        inset: -5px;
        border: 1px solid rgba(22,163,74,0.65);
        border-radius: 50%;
        pointer-events: none;
        animation: wa-ring 2.6s ease-out infinite;
      }
      .wa-ring-2 { animation-delay: 1.3s; }
      .wa-root.is-open .wa-ring { animation-play-state: paused; opacity: 0; }
      @keyframes wa-ring {
        0%   { transform: scale(0.95); opacity: 0.75; }
        100% { transform: scale(1.7); opacity: 0; }
      }

      /* icon crossfade: WhatsApp <-> close */
      .wa-ico {
        position: absolute;
        width: 34px;
        height: 34px;
        fill: currentColor;
        transition: transform 0.55s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease;
      }
      .wa-ico-x { width: 26px; height: 26px; fill: none; opacity: 0; transform: rotate(-90deg) scale(0.4); }
      .wa-root.is-open .wa-ico-wa { opacity: 0; transform: rotate(90deg) scale(0.4); }
      .wa-root.is-open .wa-ico-x { opacity: 1; transform: rotate(0) scale(1); }
      .wa-fab:hover .wa-ico-wa { transform: rotate(-10deg) scale(1.1); }

      .wa-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border: 2px solid #fff;
        border-radius: 999px;
        background: #ef4444;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        animation: wa-badge 2s ease-in-out infinite;
      }
      @keyframes wa-badge {
        0%,100% { transform: scale(1); }
        50%     { transform: scale(1.15); }
      }

      /* ---------------------- teaser / hover pill ---------------------- */
      .wa-pill {
        position: absolute;
        right: 80px;
        display: flex;
        align-items: center;
        gap: 11px;
        width: max-content;
        max-width: calc(100vw - 130px);
        padding: 13px 16px;
        border: 1px solid rgba(184,155,114,0.3);
        border-radius: 12px;
        background: rgba(255,255,255,0.97);
        color: #25231f;
        box-shadow: 0 12px 34px rgba(37,35,31,0.14);
        backdrop-filter: blur(10px);
        opacity: 0;
        visibility: hidden;
        transform: translateX(14px) scale(0.96);
        transform-origin: right center;
        transition: opacity 0.4s ease, transform 0.5s cubic-bezier(.22,1,.36,1), visibility 0s linear 0.5s;
        pointer-events: none;
      }
      .wa-pill.is-on,
      .wa-root:not(.is-open) .wa-row:hover .wa-pill {
        opacity: 1;
        visibility: visible;
        transform: translateX(0) scale(1);
        transition-delay: 0s;
      }
      .wa-pill strong { display: block; font-size: 12px; font-weight: 700; }
      .wa-pill small { display: block; margin-top: 3px; color: #817b72; font-size: 10px; }
      .wa-dot {
        flex-shrink: 0;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #19c46b;
        box-shadow: 0 0 0 4px rgba(25,196,107,0.14);
        animation: wa-dot 1.8s ease-in-out infinite;
      }
      @keyframes wa-dot {
        50% { box-shadow: 0 0 0 7px rgba(25,196,107,0); }
      }

      /* ------------------------------ PANEL ------------------------------ */
      .wa-panel {
        width: min(360px, calc(100vw - 34px));
        overflow: hidden;
        border-radius: 18px;
        background: #fff;
        box-shadow: 0 30px 70px -20px rgba(37,35,31,0.45), 0 0 0 1px rgba(37,35,31,0.06);
        opacity: 0;
        visibility: hidden;
        transform: translateY(24px) scale(0.9);
        transform-origin: bottom right;
        transition: opacity 0.35s ease, transform 0.6s cubic-bezier(.22,1,.36,1), visibility 0s linear 0.6s;
      }
      .wa-root.is-open .wa-panel {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
        transition-delay: 0s;
      }

      .wa-head {
        position: relative;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px 18px 18px 20px;
        overflow: hidden;
        background: linear-gradient(135deg, #25231f 0%, #3a352d 100%);
        color: #fff;
      }
      .wa-sheen {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(115deg, transparent 35%, rgba(230,207,165,0.14) 50%, transparent 65%);
        background-size: 250% 100%;
        animation: wa-sheen 5s linear infinite;
      }
      @keyframes wa-sheen {
        from { background-position: 150% 0; }
        to   { background-position: -150% 0; }
      }

      .wa-avatar {
        position: relative;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 46px;
        height: 46px;
        border: 1px solid rgba(230,207,165,0.55);
        border-radius: 50%;
        background: rgba(255,255,255,0.08);
        font-family: Georgia, serif;
        font-size: 20px;
        color: #e6cfa5;
      }
      .wa-online {
        position: absolute;
        right: 0;
        bottom: 1px;
        width: 11px;
        height: 11px;
        border: 2px solid #25231f;
        border-radius: 50%;
        background: #22c55e;
      }

      .wa-head-text { position: relative; flex: 1; min-width: 0; }
      .wa-head-text strong { display: block; font-size: 15px; font-weight: 600; }
      .wa-head-text small { display: block; margin-top: 3px; font-size: 11px; color: rgba(255,255,255,0.6); }

      .wa-x {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(255,255,255,0.1);
        color: #fff;
        cursor: pointer;
        transition: background 0.3s, transform 0.4s cubic-bezier(.22,1,.36,1);
      }
      .wa-x svg { width: 15px; height: 15px; }
      .wa-x:hover { background: rgba(255,255,255,0.22); transform: rotate(90deg); }
      .wa-x:focus-visible { outline: 2px solid #e6cfa5; outline-offset: 2px; }

      .wa-body {
        padding: 18px 18px 8px;
        background:
          radial-gradient(circle at 20% 0%, rgba(184,155,114,0.1), transparent 55%),
          #faf8f3;
      }
      .wa-day {
        width: fit-content;
        margin: 0 auto 14px;
        padding: 4px 12px;
        border-radius: 999px;
        background: rgba(37,35,31,0.06);
        color: #817b72;
        font-size: 10px;
        letter-spacing: 0.06em;
      }

      .wa-bubble {
        width: fit-content;
        max-width: 88%;
        padding: 12px 15px;
        border-radius: 4px 14px 14px 14px;
        background: #fff;
        color: #25231f;
        font-size: 13px;
        line-height: 1.55;
        box-shadow: 0 2px 10px rgba(37,35,31,0.07);
      }
      .wa-in { animation: wa-bubble 0.6s cubic-bezier(.34,1.56,.64,1) both; transform-origin: top left; }
      @keyframes wa-bubble {
        from { opacity: 0; transform: translateY(8px) scale(0.85); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      .wa-typing { display: flex; gap: 5px; padding: 15px 17px; }
      .wa-typing i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #a39c93;
        animation: wa-type 1.1s ease-in-out infinite;
      }
      .wa-typing i:nth-child(2) { animation-delay: 0.15s; }
      .wa-typing i:nth-child(3) { animation-delay: 0.3s; }
      @keyframes wa-type {
        0%,60%,100% { transform: translateY(0); opacity: 0.45; }
        30%         { transform: translateY(-5px); opacity: 1; }
      }

      /* chips */
      .wa-chips { display: flex; flex-direction: column; gap: 9px; margin-top: 18px; padding-bottom: 12px; }
      .wa-chips-title { margin: 0 0 2px; color: #817b72; font-size: 11px; }

      .wa-chip {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        overflow: hidden;
        padding: 12px 15px;
        border: 1px solid rgba(37,35,31,0.1);
        border-radius: 12px;
        background: #fff;
        color: #25231f;
        font-size: 13px;
        font-weight: 500;
        text-decoration: none;
        opacity: 0;
        transform: translateY(12px);
        transition:
          opacity 0.5s ease,
          transform 0.6s cubic-bezier(.22,1,.36,1),
          border-color 0.3s,
          color 0.4s,
          box-shadow 0.4s;
      }
      .wa-root.is-open .wa-chip {
        opacity: 1;
        transform: translateY(0);
        transition-delay: calc(0.35s + var(--i) * 0.08s), calc(0.35s + var(--i) * 0.08s), 0s, 0s, 0s;
      }
      .wa-chip::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, #2de17c, #079b50);
        transform: translateX(-101%);
        transition: transform 0.5s cubic-bezier(.22,1,.36,1);
      }
      .wa-chip > * { position: relative; z-index: 1; }
      .wa-chip:hover, .wa-chip:focus-visible {
        color: #fff;
        border-color: transparent;
        box-shadow: 0 12px 24px -12px rgba(18,166,91,0.6);
        transition-delay: 0s;
      }
      .wa-chip:hover::before, .wa-chip:focus-visible::before { transform: translateX(0); }
      .wa-chip:focus-visible { outline: 2px solid #25231f; outline-offset: 2px; }
      .wa-chip-arrow {
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        color: #0caa59;
        transition: transform 0.4s cubic-bezier(.22,1,.36,1), color 0.3s;
      }
      .wa-chip:hover .wa-chip-arrow { color: #fff; transform: translate(3px,-3px); }

      /* footer */
      .wa-foot { padding: 14px 18px 18px; border-top: 1px solid rgba(37,35,31,0.06); background: #fff; }
      .wa-cta {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        overflow: hidden;
        padding: 14px;
        border-radius: 12px;
        background: linear-gradient(135deg, #2de17c, #079b50);
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        text-decoration: none;
        box-shadow: 0 12px 26px -10px rgba(18,166,91,0.65);
        transition: transform 0.4s cubic-bezier(.22,1,.36,1), box-shadow 0.4s;
      }
      .wa-cta:hover { transform: translateY(-2px); box-shadow: 0 18px 34px -12px rgba(18,166,91,0.75); }
      .wa-cta:active { transform: scale(0.98); }
      .wa-cta:focus-visible { outline: 2px solid #25231f; outline-offset: 3px; }
      .wa-cta-icon { width: 18px; height: 18px; fill: currentColor; }
      .wa-cta::after {
        content: "";
        position: absolute;
        top: 0; bottom: 0; left: -40%;
        width: 30%;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,0.35), transparent);
        transform: skewX(-20deg);
        animation: wa-shine 3.6s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes wa-shine {
        0%, 55% { left: -40%; }
        100%    { left: 140%; }
      }

      /* ---------------------------- RESPONSIVE ---------------------------- */
      @media (max-width: 640px) {
        .wa-root { right: 17px; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); }
        .wa-fab { width: 56px; height: 56px; }
        .wa-ico { width: 30px; height: 30px; }
        .wa-ico-x { width: 23px; height: 23px; }
        .wa-pill { right: 70px; padding: 11px 13px; }
      }

      /* ---------------------------- ACCESSIBILITY ---------------------------- */
      @media (prefers-reduced-motion: reduce) {
        .wa-root *, .wa-root *::before, .wa-root *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0s !important;
        }
      }
    `}</style>
  );
}
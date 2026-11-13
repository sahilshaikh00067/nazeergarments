import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
} from "framer-motion";

import {
  FaInstagram,
  FaFacebookF,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaArrowRight,
  FaArrowUp,
  FaCheck,
} from "react-icons/fa";

const EASE = [0.22, 1, 0.36, 1];

const SUPPORT_EMAIL = "support@nazeergarments.com";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const footerLinks = [
  {
    title: "EXPLORE",
    links: [
      { name: "All Products", path: "/shop" },
      { name: "Men's Collection", path: "/shop/men" },
      { name: "Women's Collection", path: "/shop/women" },
      { name: "Saree Collection", path: "/shop/sarees" },
      { name: "Kids Collection", path: "/shop/kids" },
    ],
  },
  {
    title: "CUSTOMER CARE",
    links: [
      { name: "Contact Us", path: "/contact" },
      { name: "FAQs", path: "/faq" },
      { name: "Shipping Policy", path: "/shipping-policy" },
      { name: "Returns & Refunds", path: "/return-policy" },
      { name: "Privacy Policy", path: "/privacy-policy" },
    ],
  },
];

/* ------------------------------------------------------------------ */

function FooterHeading({ children }) {
  return (
    <div className="mb-5">
      <h3 className="text-[10px] font-bold tracking-[2.5px] text-white">
        {children}
      </h3>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: 30 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
        className="mt-3 h-px bg-[#C5A77D]"
      />
    </div>
  );
}

function Magnetic({ children, strength = 0.3 }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 15, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 220, damping: 15, mass: 0.3 });

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className="inline-block"
    >
      {children}
    </motion.div>
  );
}

function SocialIcon({ href, label, children }) {
  return (
    <Magnetic>
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="group relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/15 text-[#C5A77D] transition-colors duration-500 hover:border-[#C5A77D] hover:text-[#1E1D19]"
      >
        <span className="absolute inset-0 translate-y-full rounded-full bg-[#C5A77D] transition-transform duration-500 group-hover:translate-y-0" />
        <span className="relative z-10">{children}</span>
      </motion.a>
    </Magnetic>
  );
}

function ContactLine({ icon: Icon, children }) {
  return (
    <div className="group flex items-center gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-[#C5A77D] transition-all duration-500 group-hover:border-[#C5A77D] group-hover:bg-[#C5A77D] group-hover:text-[#1E1D19]">
        <Icon size={11} />
      </span>
      <span className="text-[12px] text-white/60">{children}</span>
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [focused, setFocused] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      // TODO: replace with your real API call, e.g.
      // await subscribeNewsletter(email.trim());
      await new Promise((r) => setTimeout(r, 900));
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <div
        className={`relative flex items-center border-b transition-colors duration-500 ${
          status === "error"
            ? "border-red-400"
            : focused
            ? "border-[#C5A77D]"
            : "border-white/25"
        }`}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Your email address"
          aria-label="Email address"
          className="w-full bg-transparent py-3 text-[13px] text-white outline-none placeholder:text-white/35"
        />

        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          aria-label="Subscribe"
          className="group grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#C5A77D] text-[#1E1D19] transition-colors duration-500 hover:bg-white disabled:opacity-80"
        >
          <AnimatePresence mode="wait" initial={false}>
            {status === "loading" ? (
              <motion.span
                key="l"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ rotate: { repeat: Infinity, duration: 0.8, ease: "linear" } }}
                className="h-3.5 w-3.5 rounded-full border-2 border-[#1E1D19]/30 border-t-[#1E1D19]"
              />
            ) : status === "success" ? (
              <motion.span
                key="s"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <FaCheck size={11} />
              </motion.span>
            ) : (
              <motion.span key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <FaArrowRight
                  size={11}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <motion.span
          initial={false}
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="absolute -bottom-px left-0 h-px w-full origin-left bg-gradient-to-r from-[#C5A77D] to-white"
        />
      </div>

      <div className="mt-2 h-3 text-[9px] tracking-[1px]">
        <AnimatePresence mode="wait">
          {status === "success" && (
            <motion.p
              key="ok"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[#D7BD98]"
            >
              THANK YOU — YOU'RE ON THE LIST.
            </motion.p>
          )}
          {status === "error" && (
            <motion.p
              key="err"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-400"
            >
              PLEASE ENTER A VALID EMAIL ADDRESS.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}

function BackToTop() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <motion.button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.93 }}
      className="group inline-flex items-center gap-3 text-[9px] font-bold tracking-[2px] text-[#C5A77D] transition-colors hover:text-white"
    >
      BACK TO TOP

      <span className="relative grid h-9 w-9 place-items-center rounded-full transition-colors duration-300 group-hover:bg-[#C5A77D] group-hover:text-[#171613]">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(197,167,125,0.25)" strokeWidth="1.5" />
          <motion.circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            stroke="#C5A77D"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{ pathLength: progress }}
          />
        </svg>
        <FaArrowUp size={10} className="relative transition-transform duration-300 group-hover:-translate-y-0.5" />
      </span>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */

export default function Footer() {
  const currentYear = new Date().getFullYear();

  // soft cursor spotlight
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, rgba(197,167,125,0.10), transparent 70%)`;

  return (
    <footer
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      className="relative overflow-hidden bg-[#1E1D19] text-white"
    >
      {/* animated gold top line */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: EASE }}
        className="absolute inset-x-0 top-0 h-px origin-center bg-gradient-to-r from-transparent via-[#C5A77D] to-transparent"
      />

      <motion.div
        style={{ background: spotlight }}
        className="pointer-events-none absolute inset-0"
      />

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute -right-32 -top-32 h-[340px] w-[340px] rounded-full border border-dashed border-white/[0.06]"
      />

      {/* MAIN */}
      <div className="relative mx-auto max-w-[1400px] px-6 pb-10 pt-14 sm:px-10 lg:px-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1.3fr] lg:gap-12"
        >
          {/* BRAND */}
          <motion.div variants={itemVariants} className="col-span-2 lg:col-span-1">
            <Link to="/" className="group inline-flex flex-col">
              <span className="font-serif text-[34px] font-semibold leading-none tracking-[3px] text-white transition-all duration-500 group-hover:tracking-[5px] group-hover:text-[#D7BD98]">
                NAZEER
              </span>
              <span className="mt-2 pl-1 text-[8px] font-semibold tracking-[7px] text-[#C5A77D] transition-all duration-500 group-hover:tracking-[9px]">
                GARMENTS
              </span>
            </Link>

            <p className="mt-5 max-w-[300px] text-[12px] leading-[2] text-white/50">
              Timeless fashion and everyday essentials. Style that speaks
              without saying a word.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <SocialIcon href="https://www.instagram.com/" label="Instagram">
                <FaInstagram size={15} />
              </SocialIcon>
              <SocialIcon href="https://www.facebook.com/" label="Facebook">
                <FaFacebookF size={13} />
              </SocialIcon>
            </div>
          </motion.div>

          {/* LINKS */}
          {footerLinks.map((section) => (
            <motion.div key={section.title} variants={itemVariants}>
              <FooterHeading>{section.title}</FooterHeading>

              <div className="flex flex-col gap-3">
                {section.links.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="group inline-flex w-fit items-center gap-2 text-[12px] text-white/50 transition-all duration-500 hover:translate-x-1 hover:text-[#D7BD98]"
                  >
                    <span className="h-px w-0 bg-[#C5A77D] transition-all duration-500 group-hover:w-3" />
                    {link.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}

          {/* NEWSLETTER + CONTACT */}
          <motion.div variants={itemVariants} className="col-span-2 lg:col-span-1">
            <FooterHeading>STAY IN TOUCH</FooterHeading>

            <p className="mb-3 text-[12px] text-white/50">
              New arrivals and offers, straight to your inbox.
            </p>

            <Newsletter />

            <div className="mt-4 flex flex-col gap-3">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-[#D7BD98]">
                <ContactLine icon={FaEnvelope}>{SUPPORT_EMAIL}</ContactLine>
              </a>
              <ContactLine icon={FaPhoneAlt}>Contact details coming soon</ContactLine>
              <ContactLine icon={FaMapMarkerAlt}>India</ContactLine>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* BOTTOM BAR */}
      <div className="relative border-t border-white/[0.08] bg-[#171613]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-6 py-4 text-center sm:px-10 md:flex-row md:text-left lg:px-16">
          <p className="text-[9px] tracking-[0.8px] text-white/40">
            © {currentYear} NAZEER GARMENTS. ALL RIGHTS RESERVED.
          </p>

          <span className="hidden text-[9px] font-semibold tracking-[2px] text-white/35 lg:block">
            WEAR YOUR CONFIDENCE
          </span>

          <BackToTop />
        </div>
      </div>
    </footer>
  );
}
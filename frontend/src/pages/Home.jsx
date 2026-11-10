import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    AnimatePresence,
    animate,
    motion,
    useAnimationFrame,
    useInView,
    useMotionTemplate,
    useMotionValue,
    useMotionValueEvent,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";
import {
    ArrowRight,
    ArrowUp,
    ArrowUpRight,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Flame,
    LoaderCircle,
    PackageCheck,
    Quote,
    RefreshCcw,
    RotateCcw,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Star,
    Truck,
} from "lucide-react";

import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import Footer from "../components/Footer";
import { getProducts } from "../services/productService";

/* ------------------------------------------------------------------ */
/* CONFIG                                                              */
/* ------------------------------------------------------------------ */

// Set a REAL sale end date, e.g. "2026-12-31T23:59:59".
// If left null, a rolling 3-day timer is used (stored in the browser).
const SALE_END_DATE = null;
const SALE_KEY = "zazeer_sale_end_v1";
const HERO_DURATION = 6500; // ms per hero slide

const EASE = [0.22, 1, 0.36, 1];

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
};

const formatPrice = (price) => `₹${Number(price || 0).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ */
/* SMALL REUSABLE PIECES                                               */
/* ------------------------------------------------------------------ */

function SectionLabel({ children, light = false }) {
    const color = light ? "#D8BD91" : "#A48754";
    return (
        <span
            className="mb-4 inline-flex items-center gap-3 text-[10px] font-semibold tracking-[3px] sm:text-xs"
            style={{ color }}
        >
            <motion.span
                initial={{ width: 0 }}
                whileInView={{ width: 28 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE }}
                className="h-px"
                style={{ background: color }}
            />
            {children}
        </span>
    );
}

function SplitWords({ text, className = "", delay = 0 }) {
    return (
        <span className={className}>
            {text.split(" ").map((word, i) => (
                <span
                    key={`${word}-${i}`}
                    className="mr-[0.22em] inline-block overflow-hidden pb-[0.14em] align-bottom"
                >
                    <motion.span
                        className="inline-block"
                        initial={{ y: "115%" }}
                        animate={{ y: 0 }}
                        transition={{ duration: 1, ease: EASE, delay: delay + i * 0.09 }}
                    >
                        {word}
                    </motion.span>
                </span>
            ))}
        </span>
    );
}

function Counter({ to }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!inView) return undefined;
        const controls = animate(0, to, {
            duration: 1.6,
            ease: "easeOut",
            onUpdate: (latest) => setValue(Math.round(latest)),
        });
        return () => controls.stop();
    }, [inView, to]);

    return <span ref={ref}>{value}</span>;
}

/** Button/link wrapper that gently follows the cursor. */
function Magnetic({ children, className = "inline-block", strength = 0.3 }) {
    const ref = useRef(null);
    const reduce = useReducedMotion();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 220, damping: 15, mass: 0.3 });
    const sy = useSpring(y, { stiffness: 220, damping: 15, mass: 0.3 });

    const onMove = (e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
    };

    const onLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            style={{ x: sx, y: sy }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/** 3D tilt wrapper with moving glare. */
function Tilt({ children, className = "", max = 10, glare = true }) {
    const ref = useRef(null);
    const reduce = useReducedMotion();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 180, damping: 18 });
    const sy = useSpring(y, { stiffness: 180, damping: 18 });

    const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);
    const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
    const gx = useTransform(sx, [-0.5, 0.5], [0, 100]);
    const gy = useTransform(sy, [-0.5, 0.5], [0, 100]);
    const glareBg = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.22), transparent 55%)`;

    const onMove = (e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
    };

    const onLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            style={{
                rotateX: reduce ? 0 : rotateX,
                rotateY: reduce ? 0 : rotateY,
                transformPerspective: 1100,
                transformStyle: "preserve-3d",
            }}
            className={`group/tilt relative ${className}`}
        >
            {children}
            {glare && !reduce && (
                <motion.div
                    style={{ background: glareBg }}
                    className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100"
                />
            )}
        </motion.div>
    );
}

/** Card with a cursor-following gold spotlight. */
function SpotlightCard({ children, className = "" }) {
    const mx = useMotionValue(-200);
    const my = useMotionValue(-200);
    const bg = useMotionTemplate`radial-gradient(260px circle at ${mx}px ${my}px, rgba(184,155,114,0.22), transparent 70%)`;

    const onMove = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
    };

    return (
        <motion.div
            variants={fadeUp}
            onMouseMove={onMove}
            onMouseLeave={() => {
                mx.set(-200);
                my.set(-200);
            }}
            className={`group relative overflow-hidden ${className}`}
        >
            <motion.div
                style={{ background: bg }}
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            <div className="relative">{children}</div>
        </motion.div>
    );
}

function BenefitCard({ icon: Icon, title, description }) {
    return (
        <SpotlightCard className="border border-[#EAE5DC] bg-white p-6 transition-all duration-500 hover:-translate-y-2 hover:border-[#B89B72] hover:shadow-2xl hover:shadow-[#25231F]/10 sm:p-8">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-full bg-[#F5F1EA] text-[#A48754] transition-all duration-500 group-hover:rotate-[360deg] group-hover:bg-[#25231F] group-hover:text-white">
                <Icon size={22} strokeWidth={1.5} />
            </div>

            <h3 className="mb-2 text-xs font-bold tracking-[1.5px] text-[#25231F]">
                {title}
            </h3>

            <p className="text-sm leading-7 text-[#888176]">{description}</p>

            <span className="mt-6 block h-px w-0 bg-[#B89B72] transition-all duration-700 group-hover:w-full" />
        </SpotlightCard>
    );
}

function ShimmerButton({ to, children, className = "" }) {
    return (
        <Link
            to={to}
            className={`group relative inline-flex items-center gap-5 overflow-hidden px-7 py-5 text-[10px] font-bold tracking-[2px] transition-colors duration-500 ${className}`}
        >
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/30 animate-[zShimmer_3.4s_ease-in-out_infinite]" />
            <span className="relative z-10 inline-flex items-center gap-5">
                {children}
            </span>
        </Link>
    );
}

/* ------------------------------------------------------------------ */
/* HERO SHOWCASE (auto slider + tilt + parallax + spotlight)           */
/* ------------------------------------------------------------------ */

function ProgressSegment({ state, progress }) {
    const width = useTransform(progress, (v) => `${v}%`);
    return (
        <motion.span
            className="absolute inset-y-0 left-0 bg-[#D8BD91]"
            style={{ width: state === "active" ? width : state === "done" ? "100%" : "0%" }}
        />
    );
}

function HeroShowcase({ slides, productCount, loading }) {
    const navigate = useNavigate();
    const reduce = useReducedMotion();
    const sectionRef = useRef(null);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const progress = useMotionValue(0);
    const count = slides.length;

    // Parallax on scroll
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end start"],
    });
    const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
    const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
    const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    // Cursor spotlight
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const spotlight = useMotionTemplate`radial-gradient(520px circle at ${mx}px ${my}px, rgba(216,189,145,0.16), transparent 70%)`;

    const goTo = (i) => {
        if (!count) return;
        setIndex((i + count) % count);
        progress.set(0);
    };

    useAnimationFrame((_, delta) => {
        if (paused || count < 2 || reduce) return;
        const next = progress.get() + (delta / HERO_DURATION) * 100;
        if (next >= 100) {
            progress.set(0);
            setIndex((i) => (i + 1) % count);
        } else {
            progress.set(next);
        }
    });

    useEffect(() => {
        if (index >= count) setIndex(0);
    }, [count, index]);

    const current = slides[index] || null;

    const particles = useMemo(
        () =>
            Array.from({ length: 18 }, (_, i) => ({
                left: (i * 37) % 100,
                top: (i * 53) % 100,
                size: 2 + (i % 3),
                duration: 7 + (i % 5) * 1.6,
                delay: (i % 6) * 0.7,
            })),
        []
    );

    return (
        <section
            ref={sectionRef}
            onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                mx.set(e.clientX - r.left);
                my.set(e.clientY - r.top);
            }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative min-h-[720px] overflow-hidden bg-[#171613] text-white lg:min-h-[100svh]"
        >
            {/* Background images (crossfade + ken burns + parallax) */}
            <motion.div style={{ y: bgY }} className="absolute inset-0">
                <AnimatePresence>
                    {current?.image && (
                        <motion.img
                            key={current.id ?? index}
                            src={current.image}
                            alt={current.name || "Nazeer collection"}
                            initial={{ opacity: 0, scale: 1.18 }}
                            animate={{ opacity: 0.42, scale: 1.04 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.8, ease: EASE }}
                            className="absolute inset-0 h-full w-full object-cover object-center"
                        />
                    )}
                </AnimatePresence>
            </motion.div>

            <div className="absolute inset-0 bg-gradient-to-r from-[#171613] via-[#171613]/80 to-[#171613]/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171613] via-transparent to-[#171613]/30" />
            <motion.div
                style={{ background: spotlight }}
                className="pointer-events-none absolute inset-0"
            />

            {/* Floating gold dust */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {particles.map((p, i) => (
                    <motion.span
                        key={i}
                        className="absolute rounded-full bg-[#D8BD91]"
                        style={{
                            left: `${p.left}%`,
                            top: `${p.top}%`,
                            width: p.size,
                            height: p.size,
                        }}
                        animate={{ y: [0, -40, 0], opacity: [0, 0.7, 0] }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "easeInOut",
                        }}
                    />
                ))}
            </div>

            {/* Decorative rings */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none absolute -right-40 top-10 hidden h-[620px] w-[620px] rounded-full border border-dashed border-[#D8BD91]/20 lg:block"
            />
            <div className="pointer-events-none absolute -right-16 top-32 hidden h-[420px] w-[420px] rounded-full border border-white/[0.06] lg:block" />

            <motion.div
                style={{ y: textY, opacity: fade }}
                className="relative mx-auto grid min-h-[720px] max-w-[1500px] items-center gap-12 px-6 pb-24 pt-32 sm:px-12 lg:min-h-[100svh] lg:grid-cols-[1.15fr_0.85fr] lg:px-20"
            >
                {/* LEFT */}
                <div className="max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: EASE }}
                    >
                        <span className="mb-8 inline-flex items-center gap-3 border border-white/20 bg-white/[0.04] px-4 py-3 text-[9px] font-semibold tracking-[3px] text-[#D8BD91] backdrop-blur-md sm:text-[11px]">
                            <Sparkles size={14} className="animate-pulse" />
                            THE NAZEER SIGNATURE COLLECTION
                        </span>
                    </motion.div>

                    <h1 className="text-5xl font-light leading-[1.05] tracking-[-2px] sm:text-7xl lg:text-[96px]">
                        <SplitWords text="Elegance is" delay={0.2} />
                        <br />
                        <SplitWords
                            text="an attitude."
                            delay={0.5}
                            className="font-serif italic text-[#D8BD91]"
                        />
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 1, ease: EASE }}
                        className="mt-8 max-w-xl text-sm leading-8 text-white/70 sm:text-base sm:leading-9"
                    >
                        Discover thoughtfully selected fashion that brings together
                        timeless design, effortless comfort and contemporary style.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 1.15, ease: EASE }}
                        className="mt-10 flex flex-wrap items-center gap-4"
                    >
                        <Magnetic>
                            <ShimmerButton
                                to="/shop"
                                className="bg-[#B89B72] text-white hover:bg-white hover:text-[#25231F]"
                            >
                                EXPLORE THE COLLECTION
                                <ArrowUpRight
                                    size={17}
                                    className="transition duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
                                />
                            </ShimmerButton>
                        </Magnetic>

                        <Magnetic>
                            <Link
                                to="/shop"
                                className="group inline-flex items-center gap-3 border border-white/30 bg-white/[0.03] px-7 py-5 text-[10px] font-semibold tracking-[2px] text-white backdrop-blur-md transition-all duration-500 hover:border-[#D8BD91] hover:bg-white/10 hover:text-[#D8BD91]"
                            >
                                SHOP NOW
                                <ArrowRight
                                    size={16}
                                    className="transition duration-500 group-hover:translate-x-2"
                                />
                            </Link>
                        </Magnetic>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 1.4 }}
                        className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-white/15 pt-6"
                    >
                        {current && (
                            <div className="min-w-[160px]">
                                <span className="block text-[9px] tracking-[2px] text-white/50">
                                    FEATURED PIECE
                                </span>
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={current.id ?? index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.4 }}
                                        className="mt-2 block text-sm font-medium"
                                    >
                                        {current.name}
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                        )}

                        {!loading && productCount > 0 && (
                            <div>
                                <span className="block text-[9px] tracking-[2px] text-white/50">
                                    PIECES IN THE COLLECTION
                                </span>
                                <span className="mt-2 block font-serif text-2xl text-[#D8BD91]">
                                    <Counter to={productCount} />
                                </span>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* RIGHT: tilt slider card */}
                {current && (
                    <motion.div
                        initial={{ opacity: 0, x: 60, rotate: 3 }}
                        animate={{ opacity: 1, x: 0, rotate: 0 }}
                        transition={{ duration: 1.2, delay: 0.6, ease: EASE }}
                        className="mx-auto w-full max-w-[420px] lg:mx-0 lg:ml-auto"
                    >
                        <div className="animate-[zFloat_7s_ease-in-out_infinite]">
                            <Tilt max={9}>
                                <div
                                    onClick={() =>
                                        current.slug && navigate(`/product/${current.slug}`)
                                    }
                                    className="relative cursor-pointer overflow-hidden border border-white/15 bg-white/[0.06] p-3 shadow-2xl shadow-black/50 backdrop-blur-xl"
                                >
                                    <div className="relative aspect-[4/5] overflow-hidden bg-[#25231F]">
                                        <AnimatePresence mode="popLayout">
                                            <motion.img
                                                key={current.id ?? index}
                                                src={current.image}
                                                alt={current.name}
                                                initial={{ opacity: 0, scale: 1.2, x: 40 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, x: -40 }}
                                                transition={{ duration: 0.9, ease: EASE }}
                                                className="absolute inset-0 h-full w-full object-cover"
                                            />
                                        </AnimatePresence>

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                        <span className="absolute left-4 top-4 bg-[#B89B72] px-3 py-1.5 text-[9px] font-bold tracking-[2px] text-white">
                                            FEATURED
                                        </span>

                                        <div className="absolute inset-x-0 bottom-0 p-5">
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={current.id ?? index}
                                                    initial={{ opacity: 0, y: 16 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.5 }}
                                                    className="flex items-end justify-between gap-3"
                                                >
                                                    <div>
                                                        <p className="font-serif text-xl leading-tight">
                                                            {current.name}
                                                        </p>
                                                        <p className="mt-1 text-sm font-semibold text-[#D8BD91]">
                                                            {formatPrice(current.price)}
                                                        </p>
                                                    </div>
                                                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#25231F] transition duration-500 hover:rotate-45 hover:bg-[#D8BD91]">
                                                        <ArrowUpRight size={18} />
                                                    </span>
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            </Tilt>
                        </div>

                        {/* Controls */}
                        {count > 1 && (
                            <div className="mt-6 flex items-center gap-4">
                                <div className="flex flex-1 gap-2">
                                    {slides.map((s, i) => (
                                        <button
                                            key={s.id ?? i}
                                            onClick={() => goTo(i)}
                                            aria-label={`Show slide ${i + 1}`}
                                            className="relative h-[3px] flex-1 overflow-hidden bg-white/20 transition hover:bg-white/40"
                                        >
                                            <ProgressSegment
                                                progress={progress}
                                                state={
                                                    i === index
                                                        ? "active"
                                                        : i < index
                                                        ? "done"
                                                        : "idle"
                                                }
                                            />
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => goTo(index - 1)}
                                        aria-label="Previous slide"
                                        className="grid h-10 w-10 place-items-center border border-white/25 transition-all duration-300 hover:border-[#D8BD91] hover:bg-[#D8BD91] hover:text-[#25231F]"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={() => goTo(index + 1)}
                                        aria-label="Next slide"
                                        className="grid h-10 w-10 place-items-center border border-white/25 transition-all duration-300 hover:border-[#D8BD91] hover:bg-[#D8BD91] hover:text-[#25231F]"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </motion.div>

            {/* Scroll cue */}
            <div className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-[9px] tracking-[3px] text-white/50 lg:flex">
                SCROLL
                <span className="relative h-10 w-px overflow-hidden bg-white/20">
                    <motion.span
                        className="absolute left-0 top-0 h-3 w-px bg-[#D8BD91]"
                        animate={{ y: [-12, 40] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                </span>
            </div>

            <div className="absolute bottom-8 right-8 hidden items-center gap-4 text-[9px] tracking-[3px] text-white/50 xl:flex">
                <span>CRAFTED FOR YOUR STYLE</span>
                <span className="h-px w-16 bg-[#D8BD91]" />
                <span>EST. 2026</span>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* MARQUEE                                                             */
/* ------------------------------------------------------------------ */

function MarqueeStrip() {
    const items = [
        "NEW SEASON",
        "TIMELESS DESIGN",
        "EFFORTLESS COMFORT",
        "CONTEMPORARY STYLE",
        "CRAFTED FOR YOU",
        "NAZEER GARMENTS",
    ];

    const row = [...items, ...items];

    return (
        <div className="group overflow-hidden border-y border-[#D8BD91]/20 bg-[#25231F] py-5 text-[#D8BD91]">
            <div className="z-anim flex w-max animate-[zMarquee_32s_linear_infinite] whitespace-nowrap group-hover:[animation-play-state:paused]">
                {[0, 1].map((dup) => (
                    <div key={dup} className="flex shrink-0 items-center">
                        {row.map((item, i) => (
                            <span
                                key={`${dup}-${i}`}
                                className="flex items-center gap-8 pr-8 font-serif text-lg italic sm:text-2xl"
                            >
                                {item}
                                <Sparkles size={16} className="text-[#B89B72]" />
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* COUNTDOWN SALE                                                      */
/* ------------------------------------------------------------------ */

function useCountdown() {
    const [end] = useState(() => {
        if (SALE_END_DATE) {
            const t = new Date(SALE_END_DATE).getTime();
            if (!Number.isNaN(t)) return t;
        }
        try {
            const stored = Number(localStorage.getItem(SALE_KEY));
            if (stored > Date.now()) return stored;
        } catch (e) {
            /* storage unavailable */
        }
        const t = Date.now() + 3 * 24 * 60 * 60 * 1000;
        try {
            localStorage.setItem(SALE_KEY, String(t));
        } catch (e) {
            /* storage unavailable */
        }
        return t;
    });

    const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));

    useEffect(() => {
        const id = setInterval(
            () => setLeft(Math.max(0, end - Date.now())),
            1000
        );
        return () => clearInterval(id);
    }, [end]);

    const total = Math.floor(left / 1000);

    return {
        d: Math.floor(total / 86400),
        h: Math.floor((total % 86400) / 3600),
        m: Math.floor((total % 3600) / 60),
        s: total % 60,
        done: left === 0,
    };
}

function TimeBox({ value, label }) {
    const text = String(value).padStart(2, "0");

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative grid h-20 w-16 place-items-center overflow-hidden border border-white/15 bg-white/[0.05] backdrop-blur-md sm:h-28 sm:w-24">
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                        key={text}
                        initial={{ y: -36, opacity: 0, filter: "blur(6px)" }}
                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                        exit={{ y: 36, opacity: 0, filter: "blur(6px)" }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="font-serif text-4xl text-[#D8BD91] sm:text-6xl"
                    >
                        {text}
                    </motion.span>
                </AnimatePresence>
            </div>
            <span className="text-[9px] font-semibold tracking-[3px] text-white/50">
                {label}
            </span>
        </div>
    );
}

function CountdownSale({ product }) {
    const { d, h, m, s, done } = useCountdown();

    return (
        <section className="relative overflow-hidden bg-[#171613] px-6 py-24 text-white sm:px-12 sm:py-32 lg:px-20">
            <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute -left-40 top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full bg-[#B89B72]/20 blur-[120px]"
            />

            <div className="relative mx-auto grid max-w-[1300px] items-center gap-16 lg:grid-cols-2">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={staggerContainer}
                >
                    <motion.div variants={fadeUp}>
                        <span className="mb-6 inline-flex items-center gap-2 bg-[#B89B72] px-4 py-2 text-[10px] font-bold tracking-[3px] text-white">
                            <Flame size={14} className="animate-pulse" />
                            LIMITED TIME EDIT
                        </span>
                    </motion.div>

                    <motion.h2
                        variants={fadeUp}
                        className="font-serif text-5xl leading-tight sm:text-7xl"
                    >
                        The edit ends
                        <br />
                        <span className="italic text-[#D8BD91]">very soon.</span>
                    </motion.h2>

                    <motion.p
                        variants={fadeUp}
                        className="mt-6 max-w-md text-sm leading-8 text-white/60"
                    >
                        Our current selection is available for a limited time. Pick
                        your favourites before the clock runs out.
                    </motion.p>

                    <motion.div variants={fadeUp} className="mt-10">
                        {done ? (
                            <p className="font-serif text-2xl italic text-[#D8BD91]">
                                This edit has ended. New pieces are on the way.
                            </p>
                        ) : (
                            <div className="flex gap-3 sm:gap-5">
                                <TimeBox value={d} label="DAYS" />
                                <TimeBox value={h} label="HOURS" />
                                <TimeBox value={m} label="MINS" />
                                <TimeBox value={s} label="SECS" />
                            </div>
                        )}
                    </motion.div>

                    <motion.div variants={fadeUp} className="mt-12">
                        <Magnetic>
                            <ShimmerButton
                                to="/shop"
                                className="bg-white text-[#25231F] hover:bg-[#D8BD91]"
                            >
                                SHOP THE EDIT
                                <ArrowUpRight
                                    size={17}
                                    className="transition duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
                                />
                            </ShimmerButton>
                        </Magnetic>
                    </motion.div>
                </motion.div>

                {product?.image && (
                    <motion.div
                        initial={{ opacity: 0, y: 60, rotate: -3 }}
                        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 1.1, ease: EASE }}
                        className="mx-auto w-full max-w-[440px]"
                    >
                        <Tilt max={12}>
                            <Link
                                to={product.slug ? `/product/${product.slug}` : "/shop"}
                                className="group relative block overflow-hidden border border-white/15 p-3"
                            >
                                <div className="relative aspect-[4/5] overflow-hidden">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="h-full w-full object-cover transition duration-[1400ms] group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                                        <div>
                                            <p className="font-serif text-2xl">{product.name}</p>
                                            <p className="mt-1 text-sm font-semibold text-[#D8BD91]">
                                                {formatPrice(product.price)}
                                            </p>
                                        </div>
                                        <ArrowUpRight
                                            className="text-[#D8BD91] transition duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
                                            size={22}
                                        />
                                    </div>
                                </div>
                            </Link>
                        </Tilt>
                    </motion.div>
                )}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* NEW ARRIVALS SLIDER (scroll-snap + arrows + progress)               */
/* ------------------------------------------------------------------ */

function ArrivalsSlider({ items, onAddToCart }) {
    const scroller = useRef(null);
    const [progress, setProgress] = useState(0);

    const onScroll = () => {
        const el = scroller.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        setProgress(max > 0 ? el.scrollLeft / max : 0);
    };

    const scrollByDir = (dir) => {
        const el = scroller.current;
        if (!el) return;
        el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: "smooth" });
    };

    return (
        <section className="overflow-hidden px-5 py-24 sm:px-10 sm:py-28 lg:px-16">
            <div className="mx-auto max-w-[1500px]">
                <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                    <div>
                        <SectionLabel>JUST LANDED</SectionLabel>
                        <h2 className="font-serif text-4xl tracking-[-1px] sm:text-6xl">
                            New
                            <span className="italic text-[#A48754]"> arrivals.</span>
                        </h2>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => scrollByDir(-1)}
                            aria-label="Scroll left"
                            className="grid h-12 w-12 place-items-center border border-[#25231F]/20 transition-all duration-300 hover:border-[#25231F] hover:bg-[#25231F] hover:text-white"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => scrollByDir(1)}
                            aria-label="Scroll right"
                            className="grid h-12 w-12 place-items-center border border-[#25231F]/20 transition-all duration-300 hover:border-[#25231F] hover:bg-[#25231F] hover:text-white"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div
                    ref={scroller}
                    onScroll={onScroll}
                    className="z-noscroll -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-1 pb-4 [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    {items.map((product, i) => (
                        <motion.div
                            key={product.id ?? i}
                            initial={{ opacity: 0, x: 60 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.8, ease: EASE, delay: (i % 4) * 0.08 }}
                            className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[32%] lg:w-[23.5%]"
                        >
                            <ProductCard product={product} onAddToCart={onAddToCart} />
                        </motion.div>
                    ))}
                </div>

                <div className="mt-8 h-[2px] w-full bg-[#EAE5DC]">
                    <div
                        className="h-full bg-[#A48754] transition-[width] duration-300"
                        style={{ width: `${Math.max(12, progress * 100)}%` }}
                    />
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* TESTIMONIALS SLIDER                                                 */
/* ------------------------------------------------------------------ */

// Sample copy — replace with real customer reviews before launch.
const TESTIMONIALS = [
    {
        quote:
            "The fabric feels as good as it looks. Everything arrived well packed and fit exactly as expected.",
        name: "Customer Review",
        place: "Verified buyer",
    },
    {
        quote:
            "Simple ordering, quick delivery and a collection that actually feels curated. Easily my new go-to store.",
        name: "Customer Review",
        place: "Verified buyer",
    },
    {
        quote:
            "Elegant designs without the heavy price tag. I received so many compliments on my first order.",
        name: "Customer Review",
        place: "Verified buyer",
    },
];

function Testimonials() {
    const [i, setI] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return undefined;
        const id = setTimeout(() => setI((v) => (v + 1) % TESTIMONIALS.length), 5500);
        return () => clearTimeout(id);
    }, [i, paused]);

    const t = TESTIMONIALS[i];

    return (
        <section
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative overflow-hidden bg-[#F1EDE5] px-6 py-24 sm:py-32"
        >
            <Quote
                size={220}
                strokeWidth={0.6}
                className="pointer-events-none absolute left-6 top-8 text-[#B89B72]/20 sm:left-24"
            />

            <div className="relative mx-auto max-w-3xl text-center">
                <SectionLabel>LOVED BY OUR CUSTOMERS</SectionLabel>

                <div className="mb-8 flex justify-center gap-1 text-[#A48754]">
                    {Array.from({ length: 5 }).map((_, k) => (
                        <motion.span
                            key={k}
                            initial={{ opacity: 0, scale: 0 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: k * 0.1, type: "spring", stiffness: 300 }}
                        >
                            <Star size={18} fill="currentColor" />
                        </motion.span>
                    ))}
                </div>

                <div className="relative min-h-[220px] sm:min-h-[200px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
                            transition={{ duration: 0.6, ease: EASE }}
                        >
                            <p className="font-serif text-2xl italic leading-relaxed text-[#25231F] sm:text-4xl sm:leading-snug">
                                “{t.quote}”
                            </p>
                            <p className="mt-8 text-xs font-bold tracking-[2px] text-[#25231F]">
                                {t.name}
                            </p>
                            <p className="mt-1 text-[11px] tracking-[1px] text-[#938C82]">
                                {t.place}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="mt-10 flex justify-center gap-3">
                    {TESTIMONIALS.map((_, k) => (
                        <button
                            key={k}
                            onClick={() => setI(k)}
                            aria-label={`Show review ${k + 1}`}
                            className={`h-[3px] transition-all duration-500 ${
                                k === i ? "w-12 bg-[#A48754]" : "w-6 bg-[#25231F]/20 hover:bg-[#25231F]/40"
                            }`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* SCROLL PROGRESS + BACK TO TOP                                       */
/* ------------------------------------------------------------------ */

function ScrollUI() {
    const { scrollYProgress, scrollY } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
    const [show, setShow] = useState(false);

    useMotionValueEvent(scrollY, "change", (v) => setShow(v > 700));

    return (
        <>
            <motion.div
                style={{ scaleX }}
                className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-[#A48754] via-[#D8BD91] to-[#A48754]"
            />

            <AnimatePresence>
                {show && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.6, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.6, y: 20 }}
                        whileHover={{ y: -4 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        aria-label="Back to top"
                        className="fixed bottom-6 right-6 z-[60] grid h-12 w-12 place-items-center bg-[#25231F] text-[#D8BD91] shadow-xl shadow-black/30 transition-colors duration-300 hover:bg-[#B89B72] hover:text-white"
                    >
                        <ArrowUp size={18} />
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const loadProducts = async () => {
            try {
                setLoading(true);
                setApiError("");

                const data = await getProducts();

                if (isMounted) {
                    setProducts(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("HOME PRODUCTS ERROR:", error);

                if (isMounted) {
                    setApiError(
                        error.message || "Unable to load products from the server."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadProducts();

        return () => {
            isMounted = false;
        };
    }, [refreshKey]);

    // Prefer backend-featured products, else fall back to all products.
    const featuredProducts = products.filter((p) => p.isFeatured);
    const baseList = featuredProducts.length > 0 ? featuredProducts : products;
    const displayedProducts = baseList.slice(0, 8);

    // Hero slides (backend images)
    const heroSlides = baseList.filter((p) => p.image).slice(0, 5);

    // Extra picks for sale + editorial visuals
    const saleProduct = products.filter((p) => p.image)[1] || heroSlides[0] || null;
    const editorialProduct = products.filter((p) => p.image)[2] || heroSlides[0] || null;

    const handleAddToCart = (product) => {
        if (!product?.slug) {
            alert("Unable to open this product.");
            return;
        }

        navigate(`/product/${product.slug}`);
    };

    return (
        <>
            <style>{`
                @keyframes zMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                @keyframes zShimmer { 0% { transform: translateX(-130%) skewX(-12deg); } 60%, 100% { transform: translateX(450%) skewX(-12deg); } }
                @keyframes zFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
                .z-noscroll::-webkit-scrollbar { display: none; }
                @media (prefers-reduced-motion: reduce) {
                    .z-anim, [class*="animate-[z"] { animation: none !important; }
                }
            `}</style>

            <ScrollUI />
            <Header />

            <main className="overflow-hidden bg-[#FAF9F6] text-[#25231F]">
                {/* HERO */}
                <HeroShowcase
                    slides={heroSlides}
                    productCount={products.length}
                    loading={loading}
                />

                {/* MARQUEE */}
                <MarqueeStrip />

                {/* BRAND PROMISE STRIP */}
                <section className="border-b border-[#EAE5DC] bg-white">
                    <div className="mx-auto grid max-w-[1500px] grid-cols-2 divide-x divide-y divide-[#EAE5DC] px-5 sm:grid-cols-4 sm:divide-y-0 lg:px-12">
                        {[
                            { icon: Truck, title: "DELIVERY", detail: "Convenient delivery" },
                            { icon: ShieldCheck, title: "SECURE SHOPPING", detail: "Protected experience" },
                            { icon: RefreshCcw, title: "EASY RETURNS", detail: "As per store policy" },
                            { icon: CheckCircle2, title: "QUALITY FIRST", detail: "Made for everyday style" },
                        ].map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
                                className="group flex items-center gap-3 px-4 py-7 sm:justify-center sm:px-5 lg:gap-4"
                            >
                                <item.icon
                                    size={21}
                                    strokeWidth={1.4}
                                    className="shrink-0 text-[#A48754] transition duration-500 group-hover:-translate-y-1 group-hover:scale-110"
                                />

                                <div>
                                    <h3 className="text-[9px] font-bold tracking-[1.5px] sm:text-[10px]">
                                        {item.title}
                                    </h3>
                                    <p className="mt-1 text-[10px] text-[#938C82]">{item.detail}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* INTRODUCTION */}
                <section className="px-6 py-24 sm:px-12 sm:py-32 lg:px-20">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={staggerContainer}
                        className="mx-auto max-w-4xl text-center"
                    >
                        <motion.div variants={fadeUp}>
                            <SectionLabel>THE NAZEER EXPERIENCE</SectionLabel>
                        </motion.div>

                        <motion.h2
                            variants={fadeUp}
                            className="font-serif text-4xl font-normal leading-tight tracking-[-1px] sm:text-6xl"
                        >
                            More than fashion.
                            <br />
                            <span className="italic text-[#A48754]">
                                A way of expressing yourself.
                            </span>
                        </motion.h2>

                        <motion.p
                            variants={fadeUp}
                            className="mx-auto mt-8 max-w-2xl text-sm leading-8 text-[#817B72] sm:text-base sm:leading-9"
                        >
                            We believe great style is personal. Explore a collection
                            designed to complement your everyday moments, special
                            occasions and everything in between.
                        </motion.p>

                        <motion.div
                            variants={{
                                hidden: { width: 0 },
                                visible: { width: 80, transition: { duration: 1, ease: EASE } },
                            }}
                            className="mx-auto mt-10 h-px bg-[#B89B72]"
                        />
                    </motion.div>
                </section>

                {/* PRODUCTS GRID */}
                <section className="border-y border-[#EAE5DC] bg-white px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
                    <div className="mx-auto max-w-[1500px]">
                        <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                            <div>
                                <SectionLabel>CURATED FOR YOU</SectionLabel>

                                <h2 className="font-serif text-4xl tracking-[-1px] sm:text-6xl">
                                    The latest
                                    <span className="italic text-[#A48754]"> edit.</span>
                                </h2>

                                <p className="mt-4 max-w-lg text-sm leading-7 text-[#898277]">
                                    Explore products from our latest collection, selected
                                    directly from the Nazeer store.
                                </p>
                            </div>

                            <Link
                                to="/shop"
                                className="group relative inline-flex items-center gap-3 self-start pb-2 text-[10px] font-bold tracking-[2px] transition hover:text-[#A48754] sm:self-auto"
                            >
                                VIEW ALL PRODUCTS
                                <ArrowUpRight
                                    size={17}
                                    className="transition duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
                                />
                                <span className="absolute bottom-0 left-0 h-px w-full bg-[#B89B72]" />
                                <span className="absolute bottom-0 left-0 h-px w-0 bg-[#25231F] transition-all duration-500 group-hover:w-full" />
                            </Link>
                        </div>

                        {loading ? (
                            <div className="grid min-h-[300px] place-items-center">
                                <div className="flex flex-col items-center gap-4 text-[#A48754]">
                                    <LoaderCircle className="animate-spin" size={32} />
                                    <p className="text-[10px] font-semibold tracking-[2px]">
                                        LOADING NAZEER COLLECTION
                                    </p>
                                </div>
                            </div>
                        ) : apiError ? (
                            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                                <PackageCheck size={36} className="mb-5 text-[#A48754]" />

                                <h3 className="font-serif text-2xl">Products could not be loaded</h3>

                                <p className="mt-3 max-w-md text-sm leading-7 text-[#898277]">
                                    {apiError}
                                </p>

                                <button
                                    onClick={() => setRefreshKey((key) => key + 1)}
                                    className="mt-7 bg-[#25231F] px-7 py-4 text-[10px] font-bold tracking-[2px] text-white transition-all duration-500 hover:bg-[#A48754]"
                                >
                                    TRY AGAIN
                                </button>
                            </div>
                        ) : displayedProducts.length > 0 ? (
                            <>
                                <motion.div
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.1 }}
                                    variants={staggerContainer}
                                    className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-7 md:grid-cols-3 lg:grid-cols-4"
                                >
                                    {displayedProducts.map((product, index) => (
                                        <motion.div
                                            key={product.id ?? index}
                                            variants={fadeUp}
                                            className="transition-transform duration-500 hover:z-10"
                                        >
                                            <Tilt max={6}>
                                                <ProductCard
                                                    product={product}
                                                    onAddToCart={handleAddToCart}
                                                />
                                            </Tilt>
                                        </motion.div>
                                    ))}
                                </motion.div>

                                <div className="mt-14 text-center">
                                    <Magnetic>
                                        <Link
                                            to="/shop"
                                            className="group relative inline-flex items-center gap-4 overflow-hidden border border-[#25231F] px-9 py-5 text-[10px] font-bold tracking-[2px] transition-colors duration-500 hover:text-white"
                                        >
                                            <span className="absolute inset-0 origin-bottom scale-y-0 bg-[#25231F] transition-transform duration-500 group-hover:scale-y-100" />
                                            <span className="relative z-10 inline-flex items-center gap-4">
                                                DISCOVER ALL PRODUCTS
                                                <ArrowRight
                                                    size={17}
                                                    className="transition duration-500 group-hover:translate-x-2"
                                                />
                                            </span>
                                        </Link>
                                    </Magnetic>
                                </div>
                            </>
                        ) : (
                            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                                <ShoppingBag size={38} className="mb-5 text-[#B89B72]" />

                                <h3 className="font-serif text-3xl">The collection is coming soon.</h3>

                                <p className="mt-3 text-sm text-[#898277]">
                                    There are currently no products available.
                                </p>

                                <Link
                                    to="/shop"
                                    className="mt-7 text-xs font-bold tracking-[2px] text-[#A48754] underline underline-offset-8"
                                >
                                    EXPLORE STORE
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                {/* COUNTDOWN SALE */}
                {!loading && !apiError && products.length > 0 && (
                    <CountdownSale product={saleProduct} />
                )}

                {/* NEW ARRIVALS SLIDER */}
                {!loading && !apiError && products.length >= 4 && (
                    <ArrivalsSlider
                        items={products.slice(0, 12)}
                        onAddToCart={handleAddToCart}
                    />
                )}

                {/* EDITORIAL BRAND SECTION */}
                <section className="relative overflow-hidden bg-[#25231F] px-6 py-24 text-white sm:px-12 sm:py-32 lg:px-20">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                        className="pointer-events-none absolute -right-20 -top-28 h-[420px] w-[420px] rounded-full border border-dashed border-white/[0.1]"
                    />
                    <div className="pointer-events-none absolute -right-8 -top-16 h-[300px] w-[300px] rounded-full border border-white/[0.07]" />

                    <div className="relative mx-auto grid max-w-[1300px] gap-14 lg:grid-cols-2 lg:items-center">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.3 }}
                            variants={staggerContainer}
                        >
                            <motion.div variants={fadeUp}>
                                <SectionLabel light>OUR PHILOSOPHY</SectionLabel>
                            </motion.div>

                            <motion.h2
                                variants={fadeUp}
                                className="max-w-xl font-serif text-4xl leading-tight sm:text-6xl"
                            >
                                Designed to
                                <br />
                                <span className="italic text-[#D8BD91]">feel like you.</span>
                            </motion.h2>

                            <motion.p
                                variants={fadeUp}
                                className="mt-8 max-w-lg text-base leading-9 text-white/65"
                            >
                                Personal style is not about following every trend. It is
                                about finding pieces that feel natural, confident and
                                uniquely yours.
                            </motion.p>

                            <motion.p
                                variants={fadeUp}
                                className="mt-6 max-w-lg text-base leading-9 text-white/65"
                            >
                                At Nazeer, we bring together carefully selected designs and
                                everyday essentials to make getting dressed feel effortless.
                            </motion.p>

                            <motion.div variants={fadeUp}>
                                <Link
                                    to="/shop"
                                    className="group mt-9 inline-flex items-center gap-4 border-b border-[#D8BD91] pb-3 text-[10px] font-bold tracking-[2px] text-[#D8BD91] transition-all duration-500 hover:gap-7"
                                >
                                    FIND YOUR STYLE
                                    <ArrowRight size={16} />
                                </Link>
                            </motion.div>
                        </motion.div>

                        {editorialProduct?.image && (
                            <motion.div
                                initial={{ clipPath: "inset(100% 0% 0% 0%)", opacity: 0 }}
                                whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 1.3, ease: EASE }}
                                className="mx-auto w-full max-w-[460px] lg:ml-auto"
                            >
                                <Tilt max={8}>
                                    <div className="group relative overflow-hidden border border-white/10 p-3">
                                        <div className="aspect-[4/5] overflow-hidden">
                                            <img
                                                src={editorialProduct.image}
                                                alt={editorialProduct.name || "Nazeer style"}
                                                className="h-full w-full object-cover transition duration-[1600ms] group-hover:scale-110"
                                            />
                                        </div>
                                    </div>
                                </Tilt>
                            </motion.div>
                        )}
                    </div>
                </section>

                {/* SHOPPING BENEFITS */}
                <section className="px-5 py-24 sm:px-10 sm:py-28 lg:px-16">
                    <div className="mx-auto max-w-[1500px]">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.3 }}
                            variants={staggerContainer}
                            className="mb-14 text-center"
                        >
                            <motion.div variants={fadeUp}>
                                <SectionLabel>WHY SHOP WITH NAZEER</SectionLabel>
                            </motion.div>

                            <motion.h2 variants={fadeUp} className="font-serif text-4xl sm:text-5xl">
                                The details
                                <span className="italic text-[#A48754]"> matter.</span>
                            </motion.h2>

                            <motion.p
                                variants={fadeUp}
                                className="mx-auto mt-5 max-w-xl text-sm leading-8 text-[#898277]"
                            >
                                A thoughtful shopping experience, from discovering your
                                favourite pieces to receiving your order.
                            </motion.p>
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.1 }}
                            variants={staggerContainer}
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                        >
                            <BenefitCard
                                icon={Truck}
                                title="CONVENIENT DELIVERY"
                                description="A smooth delivery experience for your selected products."
                            />
                            <BenefitCard
                                icon={ShieldCheck}
                                title="SECURE EXPERIENCE"
                                description="Shop with confidence through a protected shopping experience."
                            />
                            <BenefitCard
                                icon={RotateCcw}
                                title="RETURN SUPPORT"
                                description="Assistance with returns according to our store policy."
                            />
                            <BenefitCard
                                icon={Star}
                                title="QUALITY & STYLE"
                                description="Explore designs selected with comfort and style in mind."
                            />
                        </motion.div>
                    </div>
                </section>

                {/* TESTIMONIALS */}
                <Testimonials />

                {/* FINAL CALL TO ACTION */}
                <section className="relative overflow-hidden border-y border-[#EAE5DC] bg-[#FAF9F6] px-6 py-28 text-center sm:py-36">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D8BD91]/30 blur-[110px]"
                    />

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                        variants={staggerContainer}
                        className="relative mx-auto max-w-3xl"
                    >
                        <motion.div variants={fadeUp}>
                            <SectionLabel>YOUR STYLE STARTS HERE</SectionLabel>
                        </motion.div>

                        <motion.h2
                            variants={fadeUp}
                            className="font-serif text-5xl leading-tight tracking-[-1px] sm:text-7xl"
                        >
                            Make every
                            <br />
                            <span className="italic text-[#A48754]">moment yours.</span>
                        </motion.h2>

                        <motion.p
                            variants={fadeUp}
                            className="mx-auto mt-7 max-w-xl text-sm leading-8 text-[#817B72]"
                        >
                            Discover the collection and find pieces that complement your
                            own definition of style.
                        </motion.p>

                        <motion.div variants={fadeUp} className="mt-10">
                            <Magnetic>
                                <ShimmerButton
                                    to="/shop"
                                    className="bg-[#25231F] px-9 text-white hover:bg-[#A48754]"
                                >
                                    SHOP THE COLLECTION
                                    <ArrowUpRight
                                        size={17}
                                        className="transition duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
                                    />
                                </ShimmerButton>
                            </Magnetic>
                        </motion.div>
                    </motion.div>
                </section>
            </main>

            <Footer />
        </>
    );
}
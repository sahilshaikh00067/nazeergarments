import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    AnimatePresence,
    animate,
    motion,
    useMotionTemplate,
    useMotionValue,
    useReducedMotion,
    useSpring,
    useTransform,
} from "framer-motion";

import {
    FaArrowRight,
    FaCheck,
    FaChevronDown,
    FaChevronLeft,
    FaChevronRight,
    FaExclamationCircle,
    FaFire,
    FaHeart,
    FaMinus,
    FaPlus,
    FaShieldAlt,
    FaShoppingBag,
    FaStar,
    FaTruck,
    FaUndoAlt,
} from "react-icons/fa";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

import { getProductBySlug, getProducts } from "../services/productService";
import ProductReviews from "../components/ProductReviews";

/* ------------------------------------------------------------------ */
/* CONFIG                                                              */
/* ------------------------------------------------------------------ */

// Set a REAL offer end date, e.g. "2026-12-31T23:59:59".
// If left null, the same rolling 3-day timer used on the Home page is used.
const SALE_END_DATE = null;
const SALE_KEY = "zazeer_sale_end_v1";

const EASE = [0.22, 1, 0.36, 1];

const formatPrice = (price) => `₹${Number(price || 0).toLocaleString("en-IN")}`;

const colorOptions = {
    Black: "#252525",
    White: "#FFFFFF",
    Blue: "#4169A1",
    Pink: "#E9A0B5",
    Red: "#C74343",
    Beige: "#D8C3A5",
    Gold: "#C6A15B",
};

const toUrl = (x) => (typeof x === "string" ? x : x?.image || x?.url || x?.src || "");

const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

/* ------------------------------------------------------------------ */
/* HELPERS / HOOKS                                                     */
/* ------------------------------------------------------------------ */

function useElementVisible(el) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!el) return undefined;
        const io = new IntersectionObserver(([entry]) =>
            setVisible(entry.isIntersecting)
        );
        io.observe(el);
        return () => io.disconnect();
    }, [el]);

    return visible;
}

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
        const id = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
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

/* ------------------------------------------------------------------ */
/* SMALL UI PIECES                                                     */
/* ------------------------------------------------------------------ */

function Tilt({ children, className = "", max = 8, glare = true }) {
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
    const glareBg = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.2), transparent 55%)`;

    return (
        <motion.div
            ref={ref}
            onMouseMove={(e) => {
                if (reduce || !ref.current) return;
                const r = ref.current.getBoundingClientRect();
                x.set((e.clientX - r.left) / r.width - 0.5);
                y.set((e.clientY - r.top) / r.height - 0.5);
            }}
            onMouseLeave={() => {
                x.set(0);
                y.set(0);
            }}
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

function AnimatedPrice({ value, className = "" }) {
    const [display, setDisplay] = useState(value);
    const prev = useRef(value);

    useEffect(() => {
        const controls = animate(prev.current, value, {
            duration: 0.7,
            ease: "easeOut",
            onUpdate: (latest) => setDisplay(latest),
        });
        prev.current = value;
        return () => controls.stop();
    }, [value]);

    return <span className={className}>{formatPrice(Math.round(display))}</span>;
}

function TimeBox({ value, label }) {
    const text = String(value).padStart(2, "0");

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative grid h-12 w-11 place-items-center overflow-hidden border border-[#B89B72]/40 bg-white sm:h-14 sm:w-14">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                        key={text}
                        initial={{ y: -18, opacity: 0, filter: "blur(4px)" }}
                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                        exit={{ y: 18, opacity: 0, filter: "blur(4px)" }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="font-serif text-xl text-[#25231F] sm:text-2xl"
                    >
                        {text}
                    </motion.span>
                </AnimatePresence>
            </div>
            <span className="text-[8px] font-semibold tracking-[2px] text-[#817B72]">
                {label}
            </span>
        </div>
    );
}

function OfferTimer() {
    const { d, h, m, s, done } = useCountdown();
    if (done) return null;

    return (
        <motion.div
            variants={fadeUp}
            className="relative mt-6 overflow-hidden border border-[#B89B72]/40 bg-gradient-to-r from-[#F5F0E6] to-[#FAF8F3] p-4 sm:p-5"
        >
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/50 animate-[pdShimmer_5s_ease-in-out_infinite]" />

            <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#25231F] text-[#D8BD91]">
                        <FaFire size={14} className="animate-pulse" />
                    </span>
                    <div>
                        <p className="text-[10px] font-bold tracking-[2px] text-[#25231F]">
                            LIMITED TIME OFFER
                        </p>
                        <p className="mt-0.5 text-[10px] text-[#817B72]">
                            Special price ends soon
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-2">
                    <TimeBox value={d} label="DAYS" />
                    <TimeBox value={h} label="HRS" />
                    <TimeBox value={m} label="MIN" />
                    <TimeBox value={s} label="SEC" />
                </div>
            </div>
        </motion.div>
    );
}

function Accordion({ title, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-[#E5DED3]">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="group flex w-full items-center justify-between py-5 text-left"
            >
                <span className="font-serif text-xl transition-colors duration-300 group-hover:text-[#B89B72]">
                    {title}
                </span>
                <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="grid h-8 w-8 place-items-center rounded-full border border-[#E5DED3] text-[#B89B72] transition-colors duration-300 group-hover:border-[#B89B72]"
                >
                    <FaChevronDown size={10} />
                </motion.span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: EASE }}
                        className="overflow-hidden"
                    >
                        <div className="pb-6">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Toast({ toast }) {
    const iconBg =
        toast?.type === "error"
            ? "bg-red-500"
            : toast?.type === "success"
                ? "bg-[#718B66]"
                : "bg-[#B89B72]";

    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    key={toast.id}
                    role="status"
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.96 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="fixed bottom-24 right-4 z-[200] w-[calc(100%-32px)] max-w-sm overflow-hidden bg-[#25231F] text-white shadow-2xl shadow-black/30 lg:bottom-6 lg:right-6"
                >
                    <div className="flex items-start gap-3 px-5 py-4">
                        <span
                            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${iconBg}`}
                        >
                            {toast.type === "error" ? (
                                <FaExclamationCircle size={11} />
                            ) : (
                                <FaCheck size={10} />
                            )}
                        </span>
                        <p className="text-xs leading-6">{toast.msg}</p>
                    </div>

                    <motion.div
                        initial={{ scaleX: 1 }}
                        animate={{ scaleX: 0 }}
                        transition={{ duration: 2.8, ease: "linear" }}
                        className="h-[2px] origin-left bg-[#D8BD91]"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/* GALLERY (slider + zoom + swipe + tilt)                              */
/* ------------------------------------------------------------------ */

function Gallery({ images, name, badge, wishlisted, onWishlist, index, setIndex }) {
    const dir = useRef(1);
    const [zoom, setZoom] = useState(false);
    const ox = useMotionValue(50);
    const oy = useMotionValue(50);
    const origin = useMotionTemplate`${ox}% ${oy}%`;
    const count = images.length;

    const go = (next) => {
        if (count < 2) return;
        dir.current = next > index || (index === count - 1 && next === 0) ? 1 : -1;
        setIndex((next + count) % count);
    };

    const slideVariants = {
        enter: (d) => ({ opacity: 0, x: d * 70 }),
        center: { opacity: 1, x: 0 },
        exit: (d) => ({ opacity: 0, x: d * -70 }),
    };

    return (
        <div>
            <Tilt max={3} glare={false}>
                <div
                    className="relative aspect-[4/5] cursor-zoom-in overflow-hidden bg-[#EEE9E0] shadow-2xl shadow-[#25231F]/10"
                    onMouseEnter={() => setZoom(true)}
                    onMouseLeave={() => setZoom(false)}
                    onMouseMove={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        ox.set(((e.clientX - r.left) / r.width) * 100);
                        oy.set(((e.clientY - r.top) / r.height) * 100);
                    }}
                >
                    <AnimatePresence initial={false} custom={dir.current} mode="popLayout">
                        <motion.div
                            key={images[index] || "empty"}
                            custom={dir.current}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.6, ease: EASE }}
                            drag={count > 1 ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(_, info) => {
                                if (info.offset.x < -80) go(index + 1);
                                else if (info.offset.x > 80) go(index - 1);
                            }}
                            className="absolute inset-0"
                        >
                            <motion.img
                                src={images[index]}
                                alt={name}
                                draggable={false}
                                style={{ transformOrigin: origin }}
                                animate={{ scale: zoom ? 1.9 : 1 }}
                                transition={{ duration: 0.6, ease: EASE }}
                                className="h-full w-full select-none object-cover"
                            />
                        </motion.div>
                    </AnimatePresence>

                    {badge && (
                        <motion.span
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5, duration: 0.6, ease: EASE }}
                            className="absolute left-5 top-5 z-10 bg-white px-4 py-2 text-[9px] font-semibold tracking-widest shadow"
                        >
                            {badge}
                        </motion.span>
                    )}

                    <motion.button
                        type="button"
                        onClick={onWishlist}
                        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.85 }}
                        className={`absolute right-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full bg-white shadow-lg transition-colors duration-300 ${wishlisted ? "text-rose-600" : "text-[#25231F] hover:text-rose-500"
                            }`}
                    >
                        <motion.span
                            key={wishlisted ? "on" : "off"}
                            initial={{ scale: 0.4 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 14 }}
                            className="grid place-items-center"
                        >
                            <FaHeart />
                        </motion.span>
                    </motion.button>

                    {count > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={() => go(index - 1)}
                                aria-label="Previous image"
                                className="absolute left-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#25231F] opacity-0 shadow-lg transition-all duration-300 hover:bg-[#25231F] hover:text-white group-hover/tilt:opacity-100"
                            >
                                <FaChevronLeft size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={() => go(index + 1)}
                                aria-label="Next image"
                                className="absolute right-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#25231F] opacity-0 shadow-lg transition-all duration-300 hover:bg-[#25231F] hover:text-white group-hover/tilt:opacity-100"
                            >
                                <FaChevronRight size={12} />
                            </button>

                            <span className="absolute bottom-4 right-4 z-10 bg-[#25231F]/80 px-3 py-1.5 text-[10px] tracking-[2px] text-white backdrop-blur">
                                {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
                            </span>
                        </>
                    )}

                    <span className="pointer-events-none absolute bottom-4 left-4 z-10 hidden bg-white/85 px-3 py-1.5 text-[9px] tracking-[2px] text-[#25231F] opacity-100 backdrop-blur transition-opacity duration-300 sm:block [.cursor-zoom-in:hover_&]:opacity-0">
                        HOVER TO ZOOM
                    </span>
                </div>
            </Tilt>

            {count > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                    {images.map((src, i) => (
                        <button
                            key={`${src}-${i}`}
                            type="button"
                            onClick={() => go(i)}
                            aria-label={`Show image ${i + 1}`}
                            className="relative h-20 w-16 shrink-0 overflow-hidden sm:h-24 sm:w-20"
                        >
                            <img
                                src={src}
                                alt={`${name} thumbnail ${i + 1}`}
                                className={`h-full w-full object-cover transition duration-500 ${i === index ? "opacity-100" : "opacity-60 hover:opacity-100"
                                    }`}
                            />
                            {i === index && (
                                <motion.span
                                    layoutId="thumbRing"
                                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                                    className="absolute inset-0 border-2 border-[#B89B72]"
                                />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* RELATED CARD                                                        */
/* ------------------------------------------------------------------ */

function RelatedCard({ item, onOpen }) {
    return (
        <Tilt max={6}>
            <button type="button" onClick={onOpen} className="group block w-full text-left">
                <div className="relative aspect-[3/4] overflow-hidden bg-[#F0ECE5]">
                    <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-[1200ms] group-hover:scale-110"
                    />
                    <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent p-4 transition-transform duration-500 group-hover:translate-y-0">
                        <span className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[2px] text-white">
                            VIEW PRODUCT <FaArrowRight size={10} />
                        </span>
                    </div>
                </div>

                <p className="mt-3 text-[9px] tracking-widest text-[#B89B72]">
                    {(item.categoryLabel || item.category || "").toUpperCase()}
                </p>

                <h3 className="mt-2 text-xs font-medium transition-colors duration-300 group-hover:text-[#B89B72]">
                    {item.name}
                </h3>

                <p className="mt-2 text-sm font-semibold">{formatPrice(item.price)}</p>
            </button>
        </Tilt>
    );
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function ProductDetails() {
    const { addItem: addCartItem } = useCart();

    const {
        addItem: addWishlistItem,
        removeItem: removeWishlistItem,
        isWishlisted,
    } = useWishlist();

    const { isAuthenticated } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [selectedSize, setSelectedSize] = useState("");
    const [selectedColor, setSelectedColor] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [activeIndex, setActiveIndex] = useState(0);
    const [toast, setToast] = useState(null);
    const [added, setAdded] = useState(false);
    const [ctaEl, setCtaEl] = useState(null);

    const ctaVisible = useElementVisible(ctaEl);

    const showToast = (msg, type = "info") =>
        setToast({ msg, type, id: Date.now() });

    // auto-dismiss toast
    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(null), 2800);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        let isMounted = true;

        const loadProduct = async () => {
            try {
                setLoading(true);
                setLoadError("");
                setProduct(null);

                const data = await getProductBySlug(id);

                if (!isMounted) return;

                setProduct(data);

                const firstVariant = (data.variants || []).find(
                    (variant) =>
                        variant.is_available !== false && Number(variant.stock || 0) > 0
                );

                setSelectedSize(firstVariant?.size || data.sizes?.[0] || "");
                setSelectedColor(firstVariant?.color || data.colors?.[0] || "");
                setActiveIndex(0);
                setQuantity(1);

                const allProducts = await getProducts();

                if (isMounted) {
                    setRelatedProducts(
                        allProducts
                            .filter(
                                (item) =>
                                    item.category === data.category && item.slug !== data.slug
                            )
                            .slice(0, 4)
                    );
                }
            } catch (error) {
                if (isMounted) {
                    setLoadError(error.message || "Unable to load product");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (id) {
            loadProduct();
        } else {
            setLoadError("Product URL is missing.");
            setLoading(false);
        }

        window.scrollTo({ top: 0, behavior: "smooth" });

        return () => {
            isMounted = false;
        };
    }, [id]);

    /* derived values (safe before product loads) */
    const variants = product?.variants || [];

    const selectedVariant = variants.find(
        (variant) =>
            variant.size === selectedSize &&
            variant.color === selectedColor &&
            variant.is_available !== false
    );

    const stock = Number(selectedVariant?.stock || 0);

    const displayPrice = Number(selectedVariant?.unit_price ?? product?.price ?? 0);

    const originalPrice = Number(product?.originalPrice || 0);

    const discount =
        originalPrice > displayPrice
            ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
            : 0;

    // keep quantity within stock when variant changes
    useEffect(() => {
        setQuantity((q) => Math.min(q, Math.max(1, stock)));
    }, [stock]);

    /* ---------- loading / not found ---------- */

    if (loading) {
        return (
            <>
                <Header />
                <main className="min-h-[70vh] bg-[#FAF8F3]">
                    <div className="mx-auto grid max-w-[1450px] grid-cols-1 gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:px-12">
                        <div className="relative aspect-[4/5] overflow-hidden bg-[#EEE9E0]">
                            <div className="absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-white/50 animate-[pdShimmer_1.6s_ease-in-out_infinite]" />
                        </div>
                        <div className="space-y-5 py-4">
                            {[40, 90, 60, 50, 100, 70].map((w, i) => (
                                <div
                                    key={i}
                                    className="relative h-6 overflow-hidden bg-[#EEE9E0]"
                                    style={{ width: `${w}%`, height: i === 1 ? 52 : 24 }}
                                >
                                    <div className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/50 animate-[pdShimmer_1.6s_ease-in-out_infinite]" />
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
                <Footer />
                <style>{`@keyframes pdShimmer{0%{transform:translateX(-150%) skewX(-12deg)}100%{transform:translateX(450%) skewX(-12deg)}}`}</style>
            </>
        );
    }

    if (!product) {
        return (
            <>
                <Header />
                <main className="flex min-h-[65vh] flex-col items-center justify-center bg-[#FAF8F3] px-5 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: EASE }}
                    >
                        <h1 className="font-serif text-4xl text-[#25231F] sm:text-5xl">
                            Product <em className="text-[#B89B72]">Not Found</em>
                        </h1>
                        <p className="mt-4 text-sm text-[#817B72]">
                            {loadError || "This product may no longer be available."}
                        </p>
                        <button
                            onClick={() => navigate("/shop")}
                            className="mt-8 bg-[#25231F] px-9 py-4 text-xs tracking-widest text-white transition-colors duration-500 hover:bg-[#B89B72]"
                        >
                            BACK TO SHOP
                        </button>
                    </motion.div>
                </main>
                <Footer />
            </>
        );
    }

    /* ---------- actions ---------- */

    const sizes = product.sizes || [];
    const colors = product.colors || [];
    const categoryText = (product.categoryLabel || product.category || "").toUpperCase();

    const images = [
        ...new Set(
            [
                product.image,
                ...(Array.isArray(product.images) ? product.images : []),
                ...(Array.isArray(product.gallery) ? product.gallery : []),
            ]
                .map(toUrl)
                .filter(Boolean)
        ),
    ];

    const sizeAvailable = (size) =>
        variants.length === 0 ||
        variants.some(
            (v) =>
                v.size === size &&
                (!selectedColor || v.color === selectedColor) &&
                v.is_available !== false &&
                Number(v.stock || 0) > 0
        );

    const colorAvailable = (color) =>
        variants.length === 0 ||
        variants.some(
            (v) =>
                v.color === color &&
                (!selectedSize || v.size === selectedSize) &&
                v.is_available !== false &&
                Number(v.stock || 0) > 0
        );

    const addToCart = () => {
        if (!selectedSize || !selectedColor) {
            showToast("Please select a size and color", "error");
            return;
        }

        if (!selectedVariant || stock <= 0) {
            showToast("This size and color combination is out of stock", "error");
            return;
        }

        const variantId = Number(selectedVariant.id);

        if (!Number.isInteger(variantId) || variantId <= 0) {
            showToast("Invalid product variant. Please refresh the page.", "error");
            return;
        }

        if (quantity > stock) {
            showToast("Selected quantity is not available", "error");
            return;
        }

        const result = addCartItem(product, {
            variantId,
            size: selectedSize,
            color: selectedColor,
            unitPrice: displayPrice,
            stock,
            quantity,
        });

        if (result.success) {
            showToast(`${quantity} × ${product.name} added to your bag`, "success");
            setAdded(true);
            window.setTimeout(() => setAdded(false), 2200);
        } else {
            showToast(result.message, "error");
        }
    };

    const toggleWishlist = async () => {
        if (!isAuthenticated) {
            showToast("Please login to add products to your wishlist.", "error");
            navigate("/login");
            return;
        }

        try {
            if (isWishlisted(product.id)) {
                await removeWishlistItem(product.id);
                showToast("Product removed from wishlist.", "info");
            } else {
                await addWishlistItem(product.id);
                showToast("Product added to wishlist.", "success");
            }
        } catch (error) {
            showToast(
                error.response?.data?.message ||
                error.message ||
                "Unable to update wishlist.",
                "error"
            );
        }
    };

    const changeQuantity = (amount) => {
        setQuantity((current) => Math.min(stock, Math.max(1, current + amount)));
    };

    const wishlisted = isWishlisted(product.id);
    const lowStock = stock > 0 && stock <= 5;

    return (
        <>
            <style>{`
                @keyframes pdShimmer {
                    0% { transform: translateX(-150%) skewX(-12deg); }
                    60%, 100% { transform: translateX(450%) skewX(-12deg); }
                }
                @media (prefers-reduced-motion: reduce) {
                    [class*="animate-[pd"] { animation: none !important; }
                }
            `}</style>

            <Header />

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="min-h-screen bg-[#FAF8F3] text-[#25231F]"
            >
                {/* BREADCRUMB */}
                <div className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, ease: EASE }}
                        className="flex flex-wrap items-center gap-2 text-[10px] tracking-widest text-[#817B72]"
                    >
                        <Link to="/" className="transition-colors duration-300 hover:text-[#B89B72]">
                            HOME
                        </Link>
                        <span>/</span>
                        <Link to="/shop" className="transition-colors duration-300 hover:text-[#B89B72]">
                            SHOP
                        </Link>
                        <span>/</span>
                        <span className="text-[#25231F]">{categoryText}</span>
                    </motion.div>
                </div>

                {/* PRODUCT DETAILS */}
                <section className="mx-auto grid max-w-[1450px] grid-cols-1 gap-9 px-5 pb-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12">
                    {/* GALLERY */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: EASE }}
                        className="lg:sticky lg:top-28 lg:self-start"
                    >
                        <Gallery
                            images={images}
                            name={product.name}
                            badge={product.badge}
                            wishlisted={wishlisted}
                            onWishlist={toggleWishlist}
                            index={Math.min(activeIndex, Math.max(0, images.length - 1))}
                            setIndex={setActiveIndex}
                        />
                    </motion.div>

                    {/* INFO */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={stagger}
                        className="lg:py-5"
                    >
                        <motion.p
                            variants={fadeUp}
                            className="inline-flex items-center gap-3 text-[10px] font-semibold tracking-[3px] text-[#B89B72]"
                        >
                            <span className="h-px w-7 bg-[#B89B72]" />
                            {categoryText}
                        </motion.p>

                        <motion.h1
                            variants={fadeUp}
                            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl"
                        >
                            {product.name}
                        </motion.h1>

                        {/* RATING */}
                        {product.reviews > 0 && (
                            <motion.div
                                variants={fadeUp}
                                className="mt-5 flex items-center gap-3 text-sm text-[#A48754]"
                            >
                                <span className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <FaStar
                                            key={i}
                                            size={13}
                                            className={
                                                i < Math.round(Number(product.rating || 0))
                                                    ? "text-[#B89B72]"
                                                    : "text-[#DCD4C8]"
                                            }
                                        />
                                    ))}
                                </span>
                                <strong>{product.rating}</strong>
                                <span className="text-xs text-[#817B72]">
                                    ({product.reviews || 0} customer reviews)
                                </span>
                            </motion.div>
                        )}

                        {/* PRICE */}
                        <motion.div
                            variants={fadeUp}
                            className="mt-7 flex flex-wrap items-center gap-3"
                        >
                            <AnimatedPrice value={displayPrice} className="text-3xl font-semibold" />

                            {originalPrice > displayPrice && (
                                <>
                                    <del className="text-base text-[#A39C93]">
                                        {formatPrice(originalPrice)}
                                    </del>

                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.6, type: "spring", stiffness: 350, damping: 14 }}
                                        className="bg-[#E7EDE2] px-3 py-1 text-xs font-semibold text-[#718B66]"
                                    >
                                        {discount}% OFF
                                    </motion.span>
                                </>
                            )}
                        </motion.div>

                        <motion.p variants={fadeUp} className="mt-3 text-[10px] text-[#817B72]">
                            Inclusive of all applicable taxes.
                        </motion.p>

                        {/* OFFER TIMER (only when the product is discounted) */}
                        {discount > 0 && <OfferTimer />}

                        <motion.div variants={fadeUp} className="my-8 border-t border-[#E5DED3]" />

                        {/* COLOR */}
                        {colors.length > 0 && (
                            <motion.div variants={fadeUp}>
                                <div className="mb-4 flex items-center gap-2 text-xs">
                                    <strong>SELECT COLOR:</strong>
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={selectedColor}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.25 }}
                                            className="text-[#817B72]"
                                        >
                                            {selectedColor}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {colors.map((color) => {
                                        const active = selectedColor === color;
                                        const available = colorAvailable(color);

                                        return (
                                            <motion.button
                                                key={color}
                                                type="button"
                                                onClick={() => setSelectedColor(color)}
                                                aria-label={`Select ${color}`}
                                                title={available ? color : `${color} (unavailable in this size)`}
                                                whileHover={{ scale: 1.12 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="relative grid h-10 w-10 place-items-center rounded-full"
                                            >
                                                {active && (
                                                    <motion.span
                                                        layoutId="colorRing"
                                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                        className="absolute inset-0 rounded-full border-2 border-[#B89B72]"
                                                    />
                                                )}
                                                <span
                                                    className={`relative h-7 w-7 rounded-full border border-black/10 transition-opacity duration-300 ${available ? "opacity-100" : "opacity-35"
                                                        }`}
                                                    style={{
                                                        backgroundColor: colorOptions[color] || "#B89B72",
                                                    }}
                                                >
                                                    {!available && (
                                                        <span className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#25231F]/60" />
                                                    )}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* SIZE */}
                        {sizes.length > 0 && (
                            <motion.div variants={fadeUp} className="mt-8">
                                <div className="mb-4 flex items-center justify-between">
                                    <strong className="text-xs">SELECT SIZE:</strong>
                                    <span className="cursor-pointer border-b border-[#B89B72]/50 text-[10px] text-[#B89B72] transition-colors duration-300 hover:border-[#B89B72]">
                                        SIZE GUIDE
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {sizes.map((size) => {
                                        const active = selectedSize === size;
                                        const available = sizeAvailable(size);

                                        return (
                                            <motion.button
                                                key={size}
                                                type="button"
                                                onClick={() => setSelectedSize(size)}
                                                whileHover={{ y: -2 }}
                                                whileTap={{ scale: 0.94 }}
                                                className={`relative min-w-12 border px-4 py-3 text-xs transition-colors duration-300 ${active
                                                        ? "border-[#25231F] text-white"
                                                        : available
                                                            ? "border-[#DCD4C8] hover:border-[#B89B72]"
                                                            : "border-[#E9E3DA] text-[#B5AEA3] line-through"
                                                    }`}
                                            >
                                                {active && (
                                                    <motion.span
                                                        layoutId="sizeFill"
                                                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                                                        className="absolute inset-0 bg-[#25231F]"
                                                    />
                                                )}
                                                <span className="relative z-10">{size}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* STOCK */}
                        <motion.div variants={fadeUp} className="mt-7">
                            <div className="flex items-center gap-2 text-xs">
                                {stock > 0 ? (
                                    <>
                                        <FaCheck className={lowStock ? "text-[#C77D2E]" : "text-[#718B66]"} />
                                        <span className={lowStock ? "text-[#C77D2E]" : "text-[#718B66]"}>
                                            {lowStock
                                                ? `Only ${stock} left in stock`
                                                : `In Stock – ${stock} units available`}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-red-600">Out of Stock</span>
                                )}
                            </div>

                            {stock > 0 && (
                                <div className="mt-3 h-[3px] w-full max-w-[260px] overflow-hidden bg-[#E9E3DA]">
                                    <motion.div
                                        key={`${selectedSize}-${selectedColor}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (stock / 20) * 100)}%` }}
                                        transition={{ duration: 0.9, ease: EASE }}
                                        className={`h-full ${lowStock ? "bg-[#C77D2E]" : "bg-[#718B66]"}`}
                                    />
                                </div>
                            )}
                        </motion.div>

                        {/* QUANTITY */}
                        <motion.div variants={fadeUp} className="mt-7">
                            <strong className="text-xs">QUANTITY</strong>

                            <div className="mt-3 flex w-fit items-center border border-[#DCD4C8] bg-white">
                                <button
                                    type="button"
                                    onClick={() => changeQuantity(-1)}
                                    disabled={quantity <= 1}
                                    className="p-4 transition-colors duration-300 hover:bg-[#25231F] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
                                    aria-label="Decrease quantity"
                                >
                                    <FaMinus size={10} />
                                </button>

                                <span className="relative grid h-10 min-w-12 place-items-center overflow-hidden text-sm">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        <motion.span
                                            key={quantity}
                                            initial={{ y: 14, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -14, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            {quantity}
                                        </motion.span>
                                    </AnimatePresence>
                                </span>

                                <button
                                    type="button"
                                    onClick={() => changeQuantity(1)}
                                    disabled={quantity >= stock}
                                    className="p-4 transition-colors duration-300 hover:bg-[#25231F] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
                                    aria-label="Increase quantity"
                                >
                                    <FaPlus size={10} />
                                </button>
                            </div>
                        </motion.div>

                        {/* ADD TO BAG */}
                        <motion.div variants={fadeUp} ref={setCtaEl} className="mt-8">
                            <motion.button
                                type="button"
                                onClick={addToCart}
                                disabled={stock <= 0}
                                whileHover={stock > 0 ? { scale: 1.015 } : undefined}
                                whileTap={stock > 0 ? { scale: 0.98 } : undefined}
                                className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden px-6 py-5 text-xs font-semibold tracking-[2px] text-white transition-colors duration-500 disabled:cursor-not-allowed disabled:opacity-50 ${added ? "bg-[#718B66]" : "bg-[#25231F] hover:bg-[#B89B72]"
                                    }`}
                            >
                                <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/20 animate-[pdShimmer_3.6s_ease-in-out_infinite]" />

                                <AnimatePresence mode="wait" initial={false}>
                                    {added ? (
                                        <motion.span
                                            key="added"
                                            initial={{ opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -14 }}
                                            transition={{ duration: 0.25 }}
                                            className="relative z-10 flex items-center gap-3"
                                        >
                                            <FaCheck /> ADDED TO BAG
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="add"
                                            initial={{ opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -14 }}
                                            transition={{ duration: 0.25 }}
                                            className="relative z-10 flex items-center gap-3"
                                        >
                                            <FaShoppingBag />
                                            ADD TO BAG — {formatPrice(displayPrice * quantity)}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        </motion.div>

                        {/* BENEFITS */}
                        <motion.div
                            variants={fadeUp}
                            className="mt-8 grid gap-px overflow-hidden border border-[#E5DED3] bg-[#E5DED3] sm:grid-cols-3"
                        >
                            {[
                                { icon: FaTruck, text: "Complimentary shipping on eligible orders" },
                                { icon: FaShieldAlt, text: "Secure shopping experience" },
                                { icon: FaUndoAlt, text: "Returns as per store policy" },
                            ].map(({ icon: Icon, text }) => (
                                <div
                                    key={text}
                                    className="group flex flex-col items-start gap-3 bg-[#FAF8F3] p-5 transition-colors duration-500 hover:bg-white"
                                >
                                    <Icon className="text-lg text-[#B89B72] transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-110" />
                                    <p className="text-[11px] leading-5 text-[#817B72]">{text}</p>
                                </div>
                            ))}
                        </motion.div>

                        {/* ACCORDIONS */}
                        <motion.div variants={fadeUp} className="mt-9 border-t border-[#E5DED3]">
                            <Accordion title="Product Description" defaultOpen>
                                <p className="whitespace-pre-line text-sm leading-7 text-[#817B72]">
                                    {product.description || "Product details will be updated soon."}
                                </p>
                            </Accordion>

                            <Accordion title="Delivery & Returns">
                                <ul className="space-y-3 text-sm leading-7 text-[#817B72]">
                                    <li>Complimentary shipping on eligible orders.</li>
                                    <li>Returns are accepted as per our store policy.</li>
                                    <li>
                                        Read the full{" "}
                                        <Link
                                            to="/shipping-policy"
                                            className="text-[#B89B72] underline underline-offset-4"
                                        >
                                            shipping policy
                                        </Link>{" "}
                                        and{" "}
                                        <Link
                                            to="/return-policy"
                                            className="text-[#B89B72] underline underline-offset-4"
                                        >
                                            returns & refunds
                                        </Link>
                                        .
                                    </li>
                                </ul>
                            </Accordion>
                        </motion.div>
                    </motion.div>
                </section>

                <ProductReviews slug={product.slug} />

                {/* RELATED PRODUCTS */}
                {relatedProducts.length > 0 && (
                    <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
                        <div className="mx-auto max-w-[1450px]">
                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.4 }}
                                variants={stagger}
                                className="mb-12 text-center"
                            >
                                <motion.p
                                    variants={fadeUp}
                                    className="text-[10px] tracking-[3px] text-[#B89B72]"
                                >
                                    YOU MAY ALSO LIKE
                                </motion.p>

                                <motion.h2
                                    variants={fadeUp}
                                    className="mt-3 font-serif text-3xl sm:text-5xl"
                                >
                                    Related <em className="text-[#B89B72]">Products</em>
                                </motion.h2>
                            </motion.div>

                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.1 }}
                                variants={stagger}
                                className="grid grid-cols-2 gap-5 md:grid-cols-4"
                            >
                                {relatedProducts.map((item) => (
                                    <motion.div key={item.id} variants={fadeUp}>
                                        <RelatedCard
                                            item={item}
                                            onOpen={() => navigate(`/product/${item.slug}`)}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </section>
                )}
            </motion.main>

            <Footer />

            {/* STICKY MOBILE ADD-TO-BAG BAR */}
            <AnimatePresence>
                {!ctaVisible && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#E5DED3] bg-[#FAF8F3]/95 px-4 py-3 shadow-[0_-10px_30px_-12px_rgba(37,35,31,0.3)] backdrop-blur-xl lg:hidden"
                    >
                        <div className="mx-auto flex max-w-xl items-center gap-3">
                            {images[0] && (
                                <img
                                    src={images[0]}
                                    alt={product.name}
                                    className="h-12 w-10 shrink-0 object-cover"
                                />
                            )}

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">{product.name}</p>
                                <p className="mt-0.5 text-sm font-semibold text-[#A48754]">
                                    {formatPrice(displayPrice)}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={addToCart}
                                disabled={stock <= 0}
                                className="flex shrink-0 items-center gap-2 bg-[#25231F] px-5 py-3.5 text-[10px] font-bold tracking-[2px] text-white transition-colors duration-300 hover:bg-[#B89B72] disabled:opacity-50"
                            >
                                <FaShoppingBag size={11} />
                                {stock <= 0 ? "SOLD OUT" : "ADD TO BAG"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOAST */}
            <Toast toast={toast} />
        </>
    );
}
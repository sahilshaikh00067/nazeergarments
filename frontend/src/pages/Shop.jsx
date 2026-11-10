import { useEffect, useMemo, useRef, useState } from "react";
import {
    FaSearch,
    FaSlidersH,
    FaHeart,
    FaShoppingBag,
    FaTimes,
    FaCheck,
    FaChevronDown,
    FaExclamationCircle,
    FaFire,
    FaTh,
    FaThLarge,
} from "react-icons/fa";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    AnimatePresence,
    motion,
    useMotionTemplate,
    useMotionValue,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { getProducts } from "../services/productService";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

/* ------------------------------------------------------------------ */
/* CONFIG / CONSTANTS                                                  */
/* ------------------------------------------------------------------ */

// Set a REAL offer end date, e.g. "2026-12-31T23:59:59".
// If left null, the same rolling 3-day timer used on Home is used.
const SALE_END_DATE = null;
const SALE_KEY = "zazeer_sale_end_v1";

const EASE = [0.22, 1, 0.36, 1];
const PAGE_SIZE = 12;

const categories = [
    { label: "All Products", value: "all" },
    { label: "Men's Collection", value: "men" },
    { label: "Women's Collection", value: "women" },
    { label: "Sarees", value: "sarees" },
    { label: "Kids Collection", value: "kids" },
    { label: "New Arrivals", value: "new-arrivals" },
];

const normalizeOption = (value) => String(value || "").trim().toLowerCase();

const isVariantInStock = (variant) =>
    variant.is_available !== false && Number(variant.stock || 0) > 0;

const COLOR_SWATCHES = {
    black: "#252525",
    white: "#FFFFFF",
    blue: "#4169A1",
    navy: "#172554",
    red: "#C74343",
    pink: "#E9A0B5",
    green: "#43845B",
    yellow: "#E8C547",
    orange: "#E58A42",
    purple: "#8055A5",
    brown: "#795548",
    beige: "#D8C3A5",
    cream: "#FFF2D5",
    gold: "#C6A15B",
    grey: "#808080",
    gray: "#808080",
    maroon: "#800000",
};

const formatPrice = (price) => `₹${Number(price || 0).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ */
/* HOOKS                                                               */
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

function Tilt({ children, className = "", max = 6 }) {
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
    const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.22), transparent 55%)`;

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
            className={`relative ${className}`}
        >
            {children}
            {!reduce && (
                <motion.div
                    style={{ background: glare }}
                    className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
            )}
        </motion.div>
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
                    className="fixed bottom-5 right-4 z-[200] w-[calc(100%-32px)] max-w-sm overflow-hidden bg-[#25231F] text-white shadow-2xl shadow-black/30 sm:right-6"
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

function TimeUnit({ value, label }) {
    const text = String(value).padStart(2, "0");

    return (
        <div className="flex items-center gap-1.5">
            <span className="relative grid h-8 w-8 place-items-center overflow-hidden bg-white/10 font-serif text-sm text-[#D8BD91]">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                        key={text}
                        initial={{ y: -12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 12, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {text}
                    </motion.span>
                </AnimatePresence>
            </span>
            <span className="text-[8px] font-semibold tracking-[1.5px] text-white/50">
                {label}
            </span>
        </div>
    );
}

function OfferStrip() {
    const { d, h, m, s, done } = useCountdown();
    if (done) return null;

    return (
        <div className="relative overflow-hidden bg-[#25231F] px-4 py-3 text-white">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-white/10 animate-[shopShimmer_6s_ease-in-out_infinite]" />
            <div className="relative mx-auto flex max-w-[1500px] flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <span className="flex items-center gap-2 text-[10px] font-bold tracking-[2.5px] text-[#D8BD91]">
                    <FaFire className="animate-pulse" size={12} />
                    LIMITED TIME OFFER ENDS IN
                </span>
                <div className="flex items-center gap-3">
                    <TimeUnit value={d} label="D" />
                    <TimeUnit value={h} label="H" />
                    <TimeUnit value={m} label="M" />
                    <TimeUnit value={s} label="S" />
                </div>
            </div>
        </div>
    );
}

function SplitWords({ text, italicLast = true }) {
    const words = text.split(" ");

    return (
        <>
            {words.map((word, i) => {
                const italic = italicLast && i === words.length - 1;
                return (
                    <span
                        key={`${word}-${i}`}
                        className="mr-[0.22em] inline-block overflow-hidden pb-[0.12em] align-bottom"
                    >
                        <motion.span
                            className={`inline-block ${italic ? "italic text-[#B89B72]" : ""}`}
                            initial={{ y: "115%" }}
                            animate={{ y: 0 }}
                            transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.1 }}
                        >
                            {word}
                        </motion.span>
                    </span>
                );
            })}
        </>
    );
}

function FilterSection({ title, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section className="border-b border-[#E9E3DA] py-5 first:pt-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="group flex w-full items-center justify-between"
            >
                <h3 className="text-[11px] font-bold tracking-[1.7px] text-[#25231F] transition-colors duration-300 group-hover:text-[#B89B72]">
                    {title}
                </h3>
                <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="text-[#B89B72]"
                >
                    <FaChevronDown size={9} />
                </motion.span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* FILTER PANEL (desktop sidebar + mobile drawer)                      */
/* ------------------------------------------------------------------ */

function FilterPanel({
    activeCategory,
    selectCategory,
    priceCeiling,
    effectiveMaxPrice,
    setMaxPrice,
    availableSizes,
    selectedSizes,
    toggleSize,
    availableColors,
    selectedColors,
    toggleColor,
    clearFilters,
}) {
    const pct = ((effectiveMaxPrice - 500) / Math.max(1, priceCeiling - 500)) * 100;

    return (
        <>
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xs font-bold tracking-[2px]">FILTER PRODUCTS</h2>

                <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[10px] font-semibold tracking-[1px] text-[#A48754] underline underline-offset-4 transition-colors duration-300 hover:text-[#25231F]"
                >
                    CLEAR ALL
                </button>
            </div>

            <FilterSection title="CATEGORY">
                <div className="space-y-3">
                    {categories.map((category) => {
                        const active = activeCategory === category.value;
                        return (
                            <button
                                type="button"
                                key={category.value}
                                onClick={() => selectCategory(category.value)}
                                className={`group flex w-full items-center gap-3 text-left text-xs transition-all duration-300 hover:translate-x-1 ${
                                    active ? "font-semibold text-[#25231F]" : "text-[#817B72] hover:text-[#25231F]"
                                }`}
                            >
                                <span
                                    className={`grid h-4 w-4 place-items-center rounded-full border transition-colors duration-300 ${
                                        active ? "border-[#B89B72]" : "border-[#D8D1C6]"
                                    }`}
                                >
                                    <motion.span
                                        initial={false}
                                        animate={{ scale: active ? 1 : 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                        className="h-2 w-2 rounded-full bg-[#B89B72]"
                                    />
                                </span>
                                {category.label}
                            </button>
                        );
                    })}
                </div>
            </FilterSection>

            <FilterSection title="PRICE RANGE">
                <div className="mb-4 flex justify-between text-xs">
                    <span className="text-[#817B72]">₹500</span>
                    <strong>{formatPrice(effectiveMaxPrice)}</strong>
                </div>

                <input
                    type="range"
                    min="500"
                    max={priceCeiling}
                    step="100"
                    value={effectiveMaxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="shop-range w-full cursor-pointer"
                    style={{ "--p": `${Math.max(0, Math.min(100, pct))}%` }}
                />

                <p className="mt-3 text-[10px] text-[#A39C93]">Maximum product price</p>
            </FilterSection>

            <FilterSection title="SIZE">
                {availableSizes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {availableSizes.map((size) => {
                            const selected = selectedSizes.some(
                                (item) => normalizeOption(item) === normalizeOption(size)
                            );

                            return (
                                <motion.button
                                    type="button"
                                    key={size}
                                    onClick={() => toggleSize(size)}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.92 }}
                                    className={`relative min-w-10 border px-3 py-2 text-[10px] transition-colors duration-300 ${
                                        selected
                                            ? "border-[#25231F] bg-[#25231F] text-white"
                                            : "border-[#E2DCD2] text-[#817B72] hover:border-[#B89B72]"
                                    }`}
                                >
                                    {size}
                                </motion.button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-[#A39C93]">No sizes currently available.</p>
                )}
            </FilterSection>

            <FilterSection title="COLOR">
                {availableColors.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-1">
                        {availableColors.map((color) => {
                            const selected = selectedColors.some(
                                (item) => normalizeOption(item) === normalizeOption(color.name)
                            );

                            const isLightColor = ["white", "cream", "beige", "yellow"].includes(
                                normalizeOption(color.name)
                            );

                            return (
                                <button
                                    type="button"
                                    key={normalizeOption(color.name)}
                                    onClick={() => toggleColor(color.name)}
                                    aria-pressed={selected}
                                    className="group flex w-full items-center gap-3 text-xs text-[#817B72] transition-all duration-300 hover:translate-x-1 hover:text-[#25231F]"
                                >
                                    <span
                                        className={`grid h-5 w-5 place-items-center rounded-full border transition-all duration-300 group-hover:scale-110 ${
                                            selected
                                                ? "border-[#25231F] ring-2 ring-[#B89B72] ring-offset-2"
                                                : "border-[#D8D1C6]"
                                        }`}
                                        style={{ backgroundColor: color.hex }}
                                    >
                                        {selected && (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                                            >
                                                <FaCheck
                                                    size={9}
                                                    className={isLightColor ? "text-black" : "text-white"}
                                                />
                                            </motion.span>
                                        )}
                                    </span>

                                    <span>{color.name}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-[#A39C93]">No colors currently available.</p>
                )}
            </FilterSection>
        </>
    );
}

/* ------------------------------------------------------------------ */
/* PRODUCT CARD                                                        */
/* ------------------------------------------------------------------ */

function ShopProductCard({ product, onAddToCart, liked, onToggleWishlist, added }) {
    const navigate = useNavigate();

    const original = Number(product.originalPrice || 0);
    const discount =
        original > product.price
            ? Math.round(((original - product.price) / original) * 100)
            : 0;

    return (
        <article className="group min-w-0">
            <Tilt max={5}>
                <div className="relative aspect-[3/4] overflow-hidden bg-[#F0ECE5] shadow-sm transition-shadow duration-500 group-hover:shadow-2xl group-hover:shadow-[#25231F]/15">
                    <button
                        type="button"
                        onClick={() => navigate(`/product/${product.slug}`)}
                        className="block h-full w-full"
                        aria-label={`View ${product.name}`}
                    >
                        <img
                            src={product.image}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-110"
                        />
                    </button>

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    {product.badge && (
                        <motion.span
                            initial={{ opacity: 0, x: -14 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="absolute left-3 top-3 z-10 bg-white px-3 py-2 text-[9px] font-semibold tracking-[1.5px] text-[#25231F] shadow-sm"
                        >
                            {product.badge}
                        </motion.span>
                    )}

                    {discount > 0 && !product.badge && (
                        <span className="absolute left-3 top-3 z-10 bg-[#25231F] px-3 py-2 text-[9px] font-semibold tracking-[1.5px] text-[#D8BD91]">
                            {discount}% OFF
                        </span>
                    )}

                    <motion.button
                        type="button"
                        onClick={() => onToggleWishlist(product.id)}
                        aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.8 }}
                        className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md transition-colors duration-300 ${
                            liked ? "text-rose-600" : "text-[#25231F] hover:text-rose-500"
                        }`}
                    >
                        <motion.span
                            key={liked ? "on" : "off"}
                            initial={{ scale: 0.4 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 14 }}
                            className="grid place-items-center"
                        >
                            <FaHeart size={15} />
                        </motion.span>
                    </motion.button>

                    <button
                        type="button"
                        onClick={() => onAddToCart(product)}
                        className={`absolute bottom-3 left-3 right-3 z-10 flex translate-y-3 items-center justify-center gap-2 py-3 text-[10px] font-semibold tracking-[1.5px] opacity-0 shadow-lg backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100 ${
                            added
                                ? "bg-[#718B66] text-white"
                                : "bg-white/95 text-[#25231F] hover:bg-[#25231F] hover:text-white"
                        }`}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {added ? (
                                <motion.span
                                    key="a"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2"
                                >
                                    <FaCheck size={11} /> ADDED
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="b"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2"
                                >
                                    <FaShoppingBag size={12} /> ADD TO BAG
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </Tilt>

            <div className="pt-4">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[2px] text-[#B89B72]">
                    {product.categoryLabel}
                </p>

                <button
                    type="button"
                    onClick={() => navigate(`/product/${product.slug}`)}
                    className="text-left"
                >
                    <h3 className="min-h-10 text-sm font-medium leading-5 text-[#25231F] transition-colors duration-300 group-hover:text-[#B89B72]">
                        {product.name}
                    </h3>
                </button>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#25231F]">
                        {formatPrice(product.price)}
                    </span>

                    {original > product.price && (
                        <>
                            <del className="text-xs text-[#A39C93]">{formatPrice(original)}</del>
                            <span className="text-[10px] font-semibold text-[#718B66]">
                                {discount}% OFF
                            </span>
                        </>
                    )}
                </div>

                <p
                    className="mt-3 whitespace-pre-line text-xs leading-6 text-[#817B72]"
                    style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {product.description || "Product details will be updated soon."}
                </p>
            </div>
        </article>
    );
}

function ProductSkeleton() {
    return (
        <div>
            <div className="relative aspect-[3/4] overflow-hidden bg-[#EEE9E0]">
                <div className="absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-white/50 animate-[shopShimmer_1.6s_ease-in-out_infinite]" />
            </div>
            <div className="mt-4 space-y-2">
                {[40, 85, 55].map((w, i) => (
                    <div
                        key={i}
                        className="relative h-3 overflow-hidden bg-[#EEE9E0]"
                        style={{ width: `${w}%` }}
                    >
                        <div className="absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-white/50 animate-[shopShimmer_1.6s_ease-in-out_infinite]" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function Chip({ children, onRemove }) {
    return (
        <motion.button
            layout
            type="button"
            onClick={onRemove}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            className="group flex items-center gap-2 border border-[#B89B72]/50 bg-white px-3 py-1.5 text-[10px] font-semibold tracking-[1px] text-[#25231F] transition-colors duration-300 hover:border-[#25231F] hover:bg-[#25231F] hover:text-white"
        >
            {children}
            <FaTimes size={8} className="transition-transform duration-300 group-hover:rotate-90" />
        </motion.button>
    );
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function Shop() {
    const { category: categoryParam } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    const { addItem: addWishlistItem, removeItem, isWishlisted } = useWishlist();
    const { addItem } = useCart();

    const activeCategory = categoryParam || "all";

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("featured");
    const [maxPrice, setMaxPrice] = useState(null); // null = no limit
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [addedId, setAddedId] = useState(null);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [dense, setDense] = useState(true);

    const bannerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: bannerRef,
        offset: ["start start", "end start"],
    });
    const bannerY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
    const bannerOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

    const showToast = (msg, type = "info") => setToast({ msg, type, id: Date.now() });

    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(null), 2800);
        return () => clearTimeout(t);
    }, [toast]);

    // Header search (/shop?search=...) -> search box
    useEffect(() => {
        const q = new URLSearchParams(location.search).get("search") || "";
        setSearch(q);
    }, [location.search]);

    // load products
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
                if (isMounted) {
                    setApiError(error.message || "Unable to load products");
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
    }, [reloadKey]);

    // lock page scroll while mobile filters are open
    useEffect(() => {
        document.body.style.overflow = filtersOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [filtersOpen]);

    const availableSizes = useMemo(() => {
        const values = products.flatMap((product) =>
            (product.variants || [])
                .filter(isVariantInStock)
                .map((variant) => String(variant.size || "").trim())
                .filter(Boolean)
        );

        const uniqueValues = new Map();

        values.forEach((value) => {
            const key = normalizeOption(value);
            if (!uniqueValues.has(key)) uniqueValues.set(key, value);
        });

        return [...uniqueValues.values()].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
        );
    }, [products]);

    const availableColors = useMemo(() => {
        const values = products.flatMap((product) =>
            (product.variants || [])
                .filter(isVariantInStock)
                .map((variant) => String(variant.color || "").trim())
                .filter(Boolean)
        );

        const uniqueValues = new Map();

        values.forEach((value) => {
            const key = normalizeOption(value);
            if (!uniqueValues.has(key)) {
                uniqueValues.set(key, { name: value, hex: COLOR_SWATCHES[key] || "#B8B0A3" });
            }
        });

        return [...uniqueValues.values()].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
    }, [products]);

    // price slider goes up to the most expensive product (min ₹5000)
    const priceCeiling = useMemo(() => {
        const highest = products.reduce((max, p) => Math.max(max, Number(p.price || 0)), 0);
        return Math.max(5000, Math.ceil(highest / 500) * 500);
    }, [products]);

    const effectiveMaxPrice = maxPrice === null ? priceCeiling : Math.min(maxPrice, priceCeiling);

    const selectCategory = (value) => {
        navigate(value === "all" ? "/shop" : `/shop/${value}`);
    };

    const toggleSize = (size) => {
        setSelectedSizes((current) =>
            current.includes(size) ? current.filter((item) => item !== size) : [...current, size]
        );
    };

    const toggleColor = (color) => {
        setSelectedColors((current) =>
            current.includes(color) ? current.filter((item) => item !== color) : [...current, color]
        );
    };

    const toggleWishlist = async (productId) => {
        if (!isAuthenticated) {
            navigate("/login", { state: { from: location } });
            return;
        }

        try {
            if (isWishlisted(productId)) {
                await removeItem(productId);
                showToast("Product removed from wishlist.", "info");
            } else {
                await addWishlistItem(productId);
                showToast("Product added to wishlist.", "success");
            }
        } catch (error) {
            console.error("Wishlist update failed:", error);

            showToast(
                error.response?.data?.message || error.message || "Unable to update wishlist.",
                "error"
            );
        }
    };

    const addToCart = (product) => {
        const variants = product.variants || [];

        const availableVariants = variants.filter(isVariantInStock);

        const selectedVariant =
            availableVariants.find((variant) => {
                const sizeMatches =
                    selectedSizes.length === 0 ||
                    selectedSizes.some(
                        (size) => normalizeOption(variant.size) === normalizeOption(size)
                    );

                const colorMatches =
                    selectedColors.length === 0 ||
                    selectedColors.some(
                        (color) => normalizeOption(variant.color) === normalizeOption(color)
                    );

                return sizeMatches && colorMatches;
            }) ||
            (selectedSizes.length === 0 && selectedColors.length === 0
                ? availableVariants[0]
                : null);

        if (variants.length > 0 && !selectedVariant) {
            showToast(
                selectedSizes.length || selectedColors.length
                    ? "No matching size or color variant is available."
                    : "This product is currently out of stock.",
                "error"
            );
            return;
        }

        const result = addItem(product, {
            variantId: selectedVariant?.id ?? null,
            size: selectedVariant?.size || "",
            color: selectedVariant?.color || "",
            unitPrice: selectedVariant?.unit_price ?? product.price,
            stock: selectedVariant?.stock ?? product.stock,
            quantity: 1,
        });

        if (result.success) {
            showToast(`${product.name} added to your bag`, "success");
            setAddedId(product.id);
            window.setTimeout(() => setAddedId(null), 1800);
        } else {
            showToast(result.message, "error");
        }
    };

    const clearFilters = () => {
        setSearch("");
        setMaxPrice(null);
        setSelectedSizes([]);
        setSelectedColors([]);
        setSort("featured");
        selectCategory("all");
    };

    const filteredProducts = useMemo(() => {
        let result = [...products];

        if (activeCategory === "new-arrivals") {
            result = result.filter((product) => product.isNew);
        } else if (activeCategory !== "all") {
            result = result.filter((product) => product.category === activeCategory);
        }

        if (search.trim()) {
            const query = search.toLowerCase().trim();

            result = result.filter((product) =>
                [
                    product.name,
                    product.categoryLabel,
                    product.category,
                    product.brand,
                    product.fabric,
                    product.description,
                ].some((value) => String(value || "").toLowerCase().includes(query))
            );
        }

        result = result.filter((product) => product.price <= effectiveMaxPrice);

        if (selectedSizes.length > 0 || selectedColors.length > 0) {
            result = result.filter((product) => {
                const availableVariants = (product.variants || []).filter(isVariantInStock);

                return availableVariants.some((variant) => {
                    const sizeMatches =
                        selectedSizes.length === 0 ||
                        selectedSizes.some(
                            (size) => normalizeOption(variant.size) === normalizeOption(size)
                        );

                    const colorMatches =
                        selectedColors.length === 0 ||
                        selectedColors.some(
                            (color) => normalizeOption(variant.color) === normalizeOption(color)
                        );

                    return sizeMatches && colorMatches;
                });
            });
        }

        if (sort === "featured") {
            result.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
        } else if (sort === "price-low") {
            result.sort((a, b) => a.price - b.price);
        } else if (sort === "price-high") {
            result.sort((a, b) => b.price - a.price);
        } else if (sort === "rating") {
            result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sort === "name") {
            result.sort((a, b) => a.name.localeCompare(b.name));
        }

        return result;
    }, [products, activeCategory, search, effectiveMaxPrice, selectedSizes, selectedColors, sort]);

    // reset pagination whenever the result set changes
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [activeCategory, search, maxPrice, selectedSizes, selectedColors, sort]);

    const visibleProducts = filteredProducts.slice(0, visibleCount);

    const activeCategoryLabel =
        categories.find((item) => item.value === activeCategory)?.label || "All Products";

    const priceFilterActive = maxPrice !== null && maxPrice < priceCeiling;

    const activeFilterCount =
        selectedSizes.length + selectedColors.length + (priceFilterActive ? 1 : 0);

    const particles = useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => ({
                left: (i * 43) % 100,
                top: (i * 61) % 100,
                size: 2 + (i % 3),
                duration: 7 + (i % 5) * 1.4,
                delay: (i % 6) * 0.7,
            })),
        []
    );

    const panelProps = {
        activeCategory,
        selectCategory,
        priceCeiling,
        effectiveMaxPrice,
        setMaxPrice,
        availableSizes,
        selectedSizes,
        toggleSize,
        availableColors,
        selectedColors,
        toggleColor,
        clearFilters,
    };

    const bannerTitle = activeCategory === "all" ? "Shop All" : activeCategoryLabel;

    return (
        <>
            <style>{`
                @keyframes shopShimmer {
                    0% { transform: translateX(-150%) skewX(-12deg); }
                    60%, 100% { transform: translateX(450%) skewX(-12deg); }
                }
                .shop-range {
                    -webkit-appearance: none; appearance: none;
                    height: 3px; outline: none; border-radius: 2px;
                    background: linear-gradient(to right, #B89B72 var(--p), #E2DCD2 var(--p));
                }
                .shop-range::-webkit-slider-thumb {
                    -webkit-appearance: none; appearance: none;
                    width: 18px; height: 18px; border-radius: 50%;
                    background: #25231F; border: 3px solid #fff;
                    box-shadow: 0 0 0 1px #B89B72; cursor: pointer;
                    transition: transform .2s;
                }
                .shop-range::-webkit-slider-thumb:hover { transform: scale(1.2); }
                .shop-range::-moz-range-thumb {
                    width: 14px; height: 14px; border-radius: 50%;
                    background: #25231F; border: 3px solid #fff;
                    box-shadow: 0 0 0 1px #B89B72; cursor: pointer;
                }
                .shop-noscroll::-webkit-scrollbar { display: none; }
                @media (prefers-reduced-motion: reduce) {
                    [class*="animate-[shop"] { animation: none !important; }
                }
            `}</style>

            <Header />

            <main className="min-h-screen bg-[#FAF8F3] text-[#25231F]">
                <OfferStrip />

                {/* PAGE BANNER */}
                <section
                    ref={bannerRef}
                    className="relative flex min-h-[240px] items-center justify-center overflow-hidden bg-[#EDE5D9] px-5 py-14 text-center sm:min-h-[300px]"
                >
                    <motion.div
                        style={{ y: bannerY }}
                        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.75),transparent_65%)]"
                    />

                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                        className="pointer-events-none absolute -left-24 -top-24 h-[360px] w-[360px] rounded-full border border-dashed border-[#B89B72]/30"
                    />
                    <div className="pointer-events-none absolute -right-16 -bottom-24 h-[320px] w-[320px] rounded-full border border-[#B89B72]/20" />

                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {particles.map((p, i) => (
                            <motion.span
                                key={i}
                                className="absolute rounded-full bg-[#B89B72]"
                                style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
                                animate={{ y: [0, -30, 0], opacity: [0, 0.6, 0] }}
                                transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
                            />
                        ))}
                    </div>

                    <motion.div style={{ opacity: bannerOpacity }} className="relative">
                        <motion.p
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: EASE }}
                            className="mb-4 inline-flex items-center gap-3 text-[10px] font-semibold tracking-[4px] text-[#A48754]"
                        >
                            <span className="h-px w-8 bg-[#A48754]" />
                            THE ZAZEER COLLECTION
                            <span className="h-px w-8 bg-[#A48754]" />
                        </motion.p>

                        <h1
                            key={activeCategory}
                            className="font-serif text-4xl font-normal sm:text-6xl"
                        >
                            <SplitWords text={bannerTitle} />
                        </h1>

                        <motion.p
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
                            className="mx-auto mt-4 max-w-lg text-xs leading-6 text-[#817B72] sm:text-sm"
                        >
                            Discover thoughtfully selected fashion for every style, every
                            occasion and every moment.
                        </motion.p>
                    </motion.div>
                </section>

                {/* BREADCRUMB */}
                <div className="mx-auto max-w-[1500px] px-5 pt-7 sm:px-8 lg:px-12">
                    <div className="flex items-center gap-2 text-[10px] tracking-[1px] text-[#817B72]">
                        <button
                            onClick={() => navigate("/")}
                            className="transition-colors duration-300 hover:text-[#B89B72]"
                        >
                            HOME
                        </button>
                        <span>/</span>
                        <span className="text-[#25231F]">SHOP</span>
                        {activeCategory !== "all" && (
                            <>
                                <span>/</span>
                                <span className="text-[#25231F]">
                                    {activeCategoryLabel.toUpperCase()}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
                    {/* CATEGORY TABS */}
                    <div className="shop-noscroll mb-9 flex gap-3 overflow-x-auto border-b border-[#E9E3DA] pb-4 [-ms-overflow-style:none] [scrollbar-width:none]">
                        {categories.map((category) => {
                            const active = activeCategory === category.value;
                            return (
                                <button
                                    key={category.value}
                                    onClick={() => selectCategory(category.value)}
                                    className={`relative shrink-0 border px-5 py-3 text-[10px] font-semibold tracking-[1.2px] transition-colors duration-300 ${
                                        active
                                            ? "border-[#25231F] text-white"
                                            : "border-[#E2DCD2] text-[#817B72] hover:border-[#B89B72] hover:text-[#25231F]"
                                    }`}
                                >
                                    {active && (
                                        <motion.span
                                            layoutId="categoryTab"
                                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                                            className="absolute inset-0 bg-[#25231F]"
                                        />
                                    )}
                                    <span className="relative z-10">
                                        {category.label.toUpperCase()}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* TOOLBAR */}
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-4">
                            <button
                                onClick={() => setFiltersOpen(true)}
                                className="flex items-center gap-2 border border-[#DCD4C8] px-4 py-3 text-[10px] font-semibold tracking-[1px] transition-colors duration-300 hover:border-[#25231F] lg:hidden"
                            >
                                <FaSlidersH />
                                FILTERS
                                {activeFilterCount > 0 && (
                                    <span className="rounded-full bg-[#B89B72] px-2 py-0.5 text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            <p className="flex items-center gap-1.5 text-xs text-[#817B72]">
                                Showing
                                <span className="relative inline-grid h-5 min-w-6 place-items-center overflow-hidden">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        <motion.strong
                                            key={filteredProducts.length}
                                            initial={{ y: 14, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -14, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-[#25231F]"
                                        >
                                            {filteredProducts.length}
                                        </motion.strong>
                                    </AnimatePresence>
                                </span>
                                of {products.length} products
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="group flex items-center gap-3 border-b border-[#DCD4C8] px-2 py-2 transition-colors duration-300 focus-within:border-[#B89B72] sm:w-64">
                                <FaSearch className="shrink-0 text-[#A48754]" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search products..."
                                    className="w-full bg-transparent text-xs outline-none placeholder:text-[#A39C93]"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        aria-label="Clear search"
                                        className="transition-transform duration-300 hover:rotate-90"
                                    >
                                        <FaTimes size={12} />
                                    </button>
                                )}
                            </div>

                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="cursor-pointer border border-[#DCD4C8] bg-transparent px-4 py-3 text-[10px] font-semibold tracking-[1px] outline-none transition-colors duration-300 hover:border-[#B89B72] focus:border-[#B89B72]"
                            >
                                <option value="featured">SORT: FEATURED</option>
                                <option value="price-low">PRICE: LOW TO HIGH</option>
                                <option value="price-high">PRICE: HIGH TO LOW</option>
                                <option value="rating">TOP RATED</option>
                                <option value="name">NAME: A TO Z</option>
                            </select>

                            <div className="hidden items-center border border-[#DCD4C8] xl:flex">
                                <button
                                    type="button"
                                    onClick={() => setDense(false)}
                                    aria-label="Larger cards"
                                    className={`grid h-10 w-10 place-items-center transition-colors duration-300 ${
                                        !dense ? "bg-[#25231F] text-white" : "text-[#817B72] hover:text-[#25231F]"
                                    }`}
                                >
                                    <FaThLarge size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDense(true)}
                                    aria-label="Compact cards"
                                    className={`grid h-10 w-10 place-items-center transition-colors duration-300 ${
                                        dense ? "bg-[#25231F] text-white" : "text-[#817B72] hover:text-[#25231F]"
                                    }`}
                                >
                                    <FaTh size={13} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ACTIVE FILTER CHIPS */}
                    <AnimatePresence initial={false}>
                        {(search.trim() || activeFilterCount > 0) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.4, ease: EASE }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-wrap items-center gap-2 pb-6">
                                    <AnimatePresence>
                                        {search.trim() && (
                                            <Chip key="search" onRemove={() => setSearch("")}>
                                                “{search.trim()}”
                                            </Chip>
                                        )}
                                        {priceFilterActive && (
                                            <Chip key="price" onRemove={() => setMaxPrice(null)}>
                                                UP TO {formatPrice(maxPrice)}
                                            </Chip>
                                        )}
                                        {selectedSizes.map((size) => (
                                            <Chip key={`s-${size}`} onRemove={() => toggleSize(size)}>
                                                SIZE {size}
                                            </Chip>
                                        ))}
                                        {selectedColors.map((color) => (
                                            <Chip key={`c-${color}`} onRemove={() => toggleColor(color)}>
                                                {color.toUpperCase()}
                                            </Chip>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="border-t border-[#E9E3DA] pt-8" />

                    <div className="-mt-0 flex items-start gap-9 lg:gap-12">
                        {/* DESKTOP SIDEBAR */}
                        <aside className="sticky top-28 hidden max-h-[calc(100vh-8rem)] w-[245px] shrink-0 overflow-y-auto pr-2 lg:block shop-noscroll">
                            <FilterPanel {...panelProps} />
                        </aside>

                        {/* PRODUCT GRID */}
                        <section className="min-w-0 flex-1">
                            {loading ? (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <ProductSkeleton key={i} />
                                    ))}
                                </div>
                            ) : apiError ? (
                                <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
                                    <p className="text-sm text-red-600">{apiError}</p>
                                    <button
                                        onClick={() => setReloadKey((k) => k + 1)}
                                        className="mt-5 bg-[#25231F] px-6 py-3 text-xs text-white transition-colors duration-500 hover:bg-[#B89B72]"
                                    >
                                        TRY AGAIN
                                    </button>
                                </div>
                            ) : filteredProducts.length > 0 ? (
                                <>
                                    <motion.div
                                        layout
                                        className={`grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 ${
                                            dense ? "md:grid-cols-3 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3"
                                        }`}
                                    >
                                        <AnimatePresence mode="popLayout">
                                            {visibleProducts.map((product, i) => (
                                                <motion.div
                                                    key={product.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 36 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.94 }}
                                                    transition={{
                                                        duration: 0.6,
                                                        ease: EASE,
                                                        delay: Math.min(i % PAGE_SIZE, 8) * 0.04,
                                                    }}
                                                >
                                                    <ShopProductCard
                                                        product={product}
                                                        liked={isWishlisted(product.id)}
                                                        onToggleWishlist={toggleWishlist}
                                                        onAddToCart={addToCart}
                                                        added={addedId === product.id}
                                                    />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </motion.div>

                                    {/* LOAD MORE */}
                                    <div className="mt-14 text-center">
                                        <p className="mb-5 text-[10px] tracking-[2px] text-[#817B72]">
                                            YOU'VE VIEWED {visibleProducts.length} OF {filteredProducts.length} PRODUCTS
                                        </p>

                                        <div className="mx-auto mb-7 h-[2px] w-48 overflow-hidden bg-[#E9E3DA]">
                                            <motion.div
                                                initial={false}
                                                animate={{
                                                    width: `${(visibleProducts.length / filteredProducts.length) * 100}%`,
                                                }}
                                                transition={{ duration: 0.8, ease: EASE }}
                                                className="h-full bg-[#B89B72]"
                                            />
                                        </div>

                                        {visibleCount < filteredProducts.length && (
                                            <button
                                                type="button"
                                                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                                                className="group relative overflow-hidden border border-[#25231F] px-10 py-4 text-[10px] font-bold tracking-[2px] transition-colors duration-500 hover:text-white"
                                            >
                                                <span className="absolute inset-0 origin-bottom scale-y-0 bg-[#25231F] transition-transform duration-500 group-hover:scale-y-100" />
                                                <span className="relative z-10">LOAD MORE</span>
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.7, ease: EASE }}
                                    className="flex min-h-[350px] flex-col items-center justify-center text-center"
                                >
                                    <motion.div
                                        animate={{ y: [0, -8, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#EDE5D9]"
                                    >
                                        <FaSearch className="text-2xl text-[#B89B72]" />
                                    </motion.div>

                                    <h2 className="font-serif text-2xl">No Products Found</h2>

                                    <p className="mt-3 max-w-sm text-xs leading-6 text-[#817B72]">
                                        We couldn't find products matching your selected filters.
                                        Try changing your search or clearing the filters.
                                    </p>

                                    <button
                                        onClick={clearFilters}
                                        className="mt-6 bg-[#25231F] px-7 py-3 text-[10px] font-semibold tracking-[1.5px] text-white transition-colors duration-500 hover:bg-[#B89B72]"
                                    >
                                        CLEAR ALL FILTERS
                                    </button>
                                </motion.div>
                            )}
                        </section>
                    </div>
                </div>
            </main>

            <Footer />

            {/* MOBILE FILTER DRAWER */}
            <AnimatePresence>
                {filtersOpen && (
                    <>
                        <motion.div
                            key="filter-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setFiltersOpen(false)}
                            className="fixed inset-0 z-[130] bg-[#171613]/60 backdrop-blur-sm lg:hidden"
                        />

                        <motion.aside
                            key="filter-drawer"
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.5, ease: EASE }}
                            className="fixed inset-y-0 left-0 z-[140] flex w-[88%] max-w-[380px] flex-col bg-[#FAF8F3] shadow-2xl lg:hidden"
                        >
                            <div className="flex items-center justify-between border-b border-[#E9E3DA] px-6 py-5">
                                <span className="font-serif text-xl">Filters</span>
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen(false)}
                                    aria-label="Close filters"
                                    className="grid h-10 w-10 place-items-center rounded-full transition duration-300 hover:rotate-90 hover:bg-[#B89B72]/10 hover:text-[#B89B72]"
                                >
                                    <FaTimes size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-6">
                                <FilterPanel {...panelProps} />
                            </div>

                            <div className="border-t border-[#E9E3DA] bg-white p-4">
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen(false)}
                                    className="w-full bg-[#25231F] py-4 text-[10px] font-bold tracking-[2px] text-white transition-colors duration-500 hover:bg-[#B89B72]"
                                >
                                    VIEW {filteredProducts.length} PRODUCTS
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <Toast toast={toast} />
        </>
    );
}
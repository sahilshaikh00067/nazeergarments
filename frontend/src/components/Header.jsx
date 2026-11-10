import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

import {
  FaSearch,
  FaShoppingBag,
  FaHeart,
  FaUser,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaSignOutAlt,
  FaClipboardList,
  FaArrowRight,
} from "react-icons/fa";

const EASE = [0.22, 1, 0.36, 1];

const ANNOUNCEMENTS = [
  "COMPLIMENTARY SHIPPING ON ORDERS ABOVE ₹999",
  "NEW SEASON PIECES HAVE JUST LANDED",
  "EASY RETURNS AS PER STORE POLICY",
];

const LINKS = [
  { name: "HOME", link: "/" },
  { name: "SHOP ALL", link: "/shop" },
  { name: "MEN", link: "/shop/men" },
  { name: "WOMEN", link: "/shop/women" },
  { name: "SAREES", link: "/shop/sarees" },
  { name: "KIDS", link: "/shop/kids" },
  { name: "NEW ARRIVALS", link: "/shop/new-arrivals" },
];

const QUICK_SEARCHES = ["Shirts", "Sarees", "Dresses", "Kurtas", "Kids wear"];

/* Count badge that pops whenever the number changes */
function Badge({ count }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#B89B72] px-1 text-[9px] text-white shadow-md shadow-[#B89B72]/40"
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* Icon button with smooth hover lift */
function IconLink({ to, label, children, onClick, as = "link" }) {
  const cls =
    "relative grid h-10 w-10 place-items-center rounded-full transition-colors duration-300 hover:bg-[#B89B72]/10 hover:text-[#B89B72]";

  const inner = (
    <motion.span
      whileHover={{ y: -2, scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      className="grid place-items-center"
    >
      {children}
    </motion.span>
  );

  if (as === "button") {
    return (
      <button type="button" onClick={onClick} aria-label={label} className={cls}>
        {inner}
      </button>
    );
  }

  return (
    <Link to={to} aria-label={label} className={cls}>
      {inner}
    </Link>
  );
}

export default function Header() {
  const { wishlistCount } = useWishlist();
  const { user, logout, loading } = useAuth();
  const { cartCount } = useCart();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [announce, setAnnounce] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  const accountRef = useRef(null);
  const lastY = useRef(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { scrollY } = useScroll();

  /* shrink + hide on scroll down, show on scroll up */
  useMotionValueEvent(scrollY, "change", (y) => {
    const diff = y - lastY.current;
    setScrolled(y > 40);

    if (menuOpen || searchOpen || accountOpen) {
      setHidden(false);
    } else if (y > 180 && diff > 6) {
      setHidden(true);
    } else if (diff < -6 || y < 100) {
      setHidden(false);
    }

    lastY.current = y;
  });

  /* rotating announcement */
  useEffect(() => {
    const id = setInterval(
      () => setAnnounce((i) => (i + 1) % ANNOUNCEMENTS.length),
      4000
    );
    return () => clearInterval(id);
  }, []);

  /* close everything on route change */
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  /* click outside + Escape */
  useEffect(() => {
    const onDown = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setAccountOpen(false);
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* lock body scroll when drawer open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const runSearch = (term) => {
    const value = term.trim();
    if (!value) return;

    navigate(`/shop?search=${encodeURIComponent(value)}`);
    setSearchOpen(false);
    setSearch("");
    setMenuOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    runSearch(search);
  };

  const handleLogout = async () => {
    if (logoutLoading) return;

    setLogoutLoading(true);

    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      // AuthContext clears local tokens even if the backend logout fails.
    } finally {
      setAccountOpen(false);
      setMenuOpen(false);
      navigate("/", { replace: true });
      setLogoutLoading(false);
    }
  };

  const accountLink = user ? "/account" : "/login";

  const customerName =
    user?.full_name ||
    user?.first_name ||
    user?.email?.split("@")[0] ||
    "My Account";

  return (
    <>
      {/* ANNOUNCEMENT BAR */}
      <div className="relative overflow-hidden bg-[#25231F] px-3 py-2.5 text-center text-[9px] tracking-[2px] text-[#D8BD91] sm:text-[10px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/10 animate-[hdrShimmer_6s_ease-in-out_infinite]" />
        <AnimatePresence mode="wait">
          <motion.p
            key={announce}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {ANNOUNCEMENTS[announce]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* HEADER */}
      <motion.header
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.45, ease: EASE }}
        className={`sticky top-0 z-[100] border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-500 ${
          scrolled
            ? "border-[#E9E3DA] bg-[#FAF8F3]/90 shadow-[0_10px_40px_-18px_rgba(37,35,31,0.35)]"
            : "border-transparent bg-[#FAF8F3]/95"
        }`}
      >
        <div
          className={`mx-auto flex max-w-[1550px] items-center justify-between gap-3 px-4 transition-[height] duration-500 sm:px-8 lg:px-12 ${
            scrolled ? "h-[64px] lg:h-[72px]" : "h-[75px] lg:h-[88px]"
          }`}
        >
          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid h-10 w-10 place-items-center text-[#25231F] transition hover:text-[#B89B72] lg:hidden"
            aria-label="Open menu"
          >
            <FaBars size={20} />
          </button>

          {/* LOGO */}
          <Link
            to="/"
            className="group flex shrink-0 flex-col items-center text-[#25231F]"
          >
            <span
              className={`font-luxury font-semibold tracking-[3px] transition-all duration-500 group-hover:tracking-[5px] group-hover:text-[#B89B72] ${
                scrolled ? "text-[21px] sm:text-[24px]" : "text-[23px] sm:text-[27px]"
              }`}
            >
              NAZEER
            </span>

            <span className="mt-1 text-[7px] tracking-[5px] transition-all duration-500 group-hover:tracking-[7px] sm:text-[9px]">
              GARMENTS
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden items-center gap-5 lg:flex xl:gap-8">
            {LINKS.map((item) => (
              <NavLink
                key={item.name}
                to={item.link}
                end={item.link === "/"}
                className="group relative py-2 text-[9px] font-semibold tracking-[1px] xl:text-[10px]"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`transition-colors duration-300 ${
                        isActive
                          ? "text-[#B89B72]"
                          : "text-[#25231F] group-hover:text-[#B89B72]"
                      }`}
                    >
                      {item.name}
                    </span>

                    {/* hover underline */}
                    <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#B89B72]/60 transition-all duration-500 group-hover:w-full" />

                    {/* active indicator slides between links */}
                    {isActive && (
                      <motion.span
                        layoutId="navIndicator"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute -bottom-0.5 left-0 h-[2px] w-full bg-[#B89B72]"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* HEADER ACTIONS */}
          <div className="flex shrink-0 items-center gap-0.5 text-[#25231F] sm:gap-1">
            {/* SEARCH */}
            <IconLink
              as="button"
              label="Search products"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={searchOpen ? "x" : "s"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {searchOpen ? <FaTimes size={17} /> : <FaSearch size={17} />}
                </motion.span>
              </AnimatePresence>
            </IconLink>

            {/* WISHLIST */}
            <IconLink to="/wishlist" label="Wishlist">
              <FaHeart size={17} />
              <Badge count={wishlistCount} />
            </IconLink>

            {/* DESKTOP ACCOUNT */}
            <div ref={accountRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => {
                  if (loading) return;

                  if (!user) {
                    navigate("/login");
                    return;
                  }

                  setAccountOpen((v) => !v);
                }}
                aria-label="My account"
                aria-expanded={accountOpen}
                className="flex h-10 items-center gap-2 rounded-full px-3 transition-colors duration-300 hover:bg-[#B89B72]/10 hover:text-[#B89B72]"
              >
                <FaUser size={17} />

                {user && (
                  <>
                    <span className="max-w-[90px] truncate text-[10px] font-semibold tracking-wide">
                      {customerName}
                    </span>

                    <FaChevronDown
                      size={9}
                      className={`transition-transform duration-300 ${
                        accountOpen ? "rotate-180" : ""
                      }`}
                    />
                  </>
                )}
              </button>

              {/* ACCOUNT DROPDOWN */}
              <AnimatePresence>
                {user && accountOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    style={{ transformOrigin: "top right" }}
                    className="absolute right-0 top-[50px] z-[200] w-60 overflow-hidden border border-[#E9E3DA] bg-white py-2 shadow-2xl shadow-[#25231F]/15"
                  >
                    <div className="border-b border-[#E9E3DA] px-4 py-3">
                      <p className="text-xs font-semibold text-[#25231F]">
                        {customerName}
                      </p>

                      <p className="mt-1 truncate text-[10px] text-gray-500">
                        {user.email}
                      </p>
                    </div>

                    <Link
                      to="/account"
                      onClick={() => setAccountOpen(false)}
                      className="group flex items-center gap-3 px-4 py-3 text-xs transition-all duration-300 hover:bg-[#FAF8F3] hover:pl-6 hover:text-[#B89B72]"
                    >
                      <FaUser size={12} />
                      MY ACCOUNT
                    </Link>

                    <Link
                      to="/my-orders"
                      onClick={() => setAccountOpen(false)}
                      className="group flex items-center gap-3 px-4 py-3 text-xs transition-all duration-300 hover:bg-[#FAF8F3] hover:pl-6 hover:text-[#B89B72]"
                    >
                      <FaClipboardList size={13} />
                      MY ORDERS
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={logoutLoading}
                      className="flex w-full items-center gap-3 border-t border-[#E9E3DA] px-4 py-3 text-left text-xs text-red-600 transition-all duration-300 hover:bg-red-50 hover:pl-6 disabled:opacity-50"
                    >
                      <FaSignOutAlt size={13} />
                      {logoutLoading ? "SIGNING OUT..." : "LOGOUT"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CART */}
            <IconLink to="/cart" label="Shopping bag">
              <FaShoppingBag size={18} />
              <Badge count={cartCount} />
            </IconLink>
          </div>
        </div>

        {/* SEARCH PANEL */}
        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="overflow-hidden border-t border-[#E9E3DA] bg-white"
            >
              <form onSubmit={handleSearch} className="px-5 py-6">
                <div className="mx-auto flex max-w-[720px] items-center gap-3 border-b border-[#B89B72] pb-3">
                  <FaSearch className="text-[#B89B72]" />

                  <input
                    type="search"
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search shirts, sarees, dresses..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#A39C93]"
                  />

                  <button
                    type="submit"
                    className="group flex items-center gap-2 text-[10px] font-semibold tracking-widest transition hover:text-[#B89B72]"
                  >
                    SEARCH
                    <FaArrowRight
                      size={10}
                      className="transition duration-300 group-hover:translate-x-1"
                    />
                  </button>
                </div>

                <div className="mx-auto mt-5 flex max-w-[720px] flex-wrap items-center gap-2">
                  <span className="mr-2 text-[9px] font-semibold tracking-[2px] text-[#A39C93]">
                    POPULAR
                  </span>

                  {QUICK_SEARCHES.map((term, i) => (
                    <motion.button
                      key={term}
                      type="button"
                      onClick={() => runSearch(term)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.06, duration: 0.4, ease: EASE }}
                      whileHover={{ y: -2 }}
                      className="border border-[#E9E3DA] px-4 py-2 text-[11px] text-[#25231F] transition-colors duration-300 hover:border-[#B89B72] hover:bg-[#B89B72] hover:text-white"
                    >
                      {term}
                    </motion.button>
                  ))}
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[110] bg-[#171613]/60 backdrop-blur-sm lg:hidden"
            />

            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.5, ease: EASE }}
              className="fixed inset-y-0 left-0 z-[120] flex w-[86%] max-w-[380px] flex-col overflow-y-auto bg-[#FAF8F3] shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-[#E9E3DA] px-6 py-5">
                <div className="flex flex-col items-center text-[#25231F]">
                  <span className="font-luxury text-[22px] font-semibold tracking-[3px]">
                    NAZEER
                  </span>
                  <span className="mt-1 text-[7px] tracking-[5px]">GARMENTS</span>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="grid h-10 w-10 place-items-center rounded-full text-[#25231F] transition duration-300 hover:rotate-90 hover:bg-[#B89B72]/10 hover:text-[#B89B72]"
                >
                  <FaTimes size={18} />
                </button>
              </div>

              <nav className="flex-1 px-6 py-3">
                {LINKS.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: EASE }}
                  >
                    <NavLink
                      to={item.link}
                      end={item.link === "/"}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `group flex items-center justify-between border-b border-[#E9E3DA] py-4 text-[11px] font-semibold tracking-[1.5px] transition-all duration-300 hover:pl-2 ${
                          isActive ? "text-[#B89B72]" : "text-[#25231F]"
                        }`
                      }
                    >
                      {item.name}
                      <FaChevronDown className="-rotate-90 text-[9px] transition duration-300 group-hover:translate-x-1" />
                    </NavLink>
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + LINKS.length * 0.05, duration: 0.5, ease: EASE }}
                >
                  <Link
                    to={accountLink}
                    onClick={() => setMenuOpen(false)}
                    className="block border-b border-[#E9E3DA] py-4 text-[11px] font-semibold tracking-widest transition-all duration-300 hover:pl-2 hover:text-[#B89B72]"
                  >
                    {user ? "MY ACCOUNT" : "SIGN IN / REGISTER"}
                  </Link>
                </motion.div>

                {user && (
                  <>
                    <Link
                      to="/my-orders"
                      onClick={() => setMenuOpen(false)}
                      className="block border-b border-[#E9E3DA] py-4 text-[11px] font-semibold tracking-widest transition-all duration-300 hover:pl-2 hover:text-[#B89B72]"
                    >
                      MY ORDERS
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={logoutLoading}
                      className="block w-full py-4 text-left text-[11px] font-semibold tracking-widest text-red-600 disabled:opacity-50"
                    >
                      {logoutLoading ? "SIGNING OUT..." : "LOGOUT"}
                    </button>
                  </>
                )}
              </nav>

              <div className="grid grid-cols-3 border-t border-[#E9E3DA] bg-white text-[#25231F]">
                <Link
                  to="/wishlist"
                  onClick={() => setMenuOpen(false)}
                  className="relative grid place-items-center gap-1 py-5 text-[9px] font-semibold tracking-[2px] transition hover:text-[#B89B72]"
                >
                  <FaHeart size={16} />
                  WISHLIST
                  {wishlistCount > 0 && (
                    <span className="absolute right-6 top-3 grid h-4 min-w-4 place-items-center rounded-full bg-[#B89B72] px-1 text-[9px] text-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setSearchOpen(true);
                  }}
                  className="grid place-items-center gap-1 border-x border-[#E9E3DA] py-5 text-[9px] font-semibold tracking-[2px] transition hover:text-[#B89B72]"
                >
                  <FaSearch size={16} />
                  SEARCH
                </button>

                <Link
                  to="/cart"
                  onClick={() => setMenuOpen(false)}
                  className="relative grid place-items-center gap-1 py-5 text-[9px] font-semibold tracking-[2px] transition hover:text-[#B89B72]"
                >
                  <FaShoppingBag size={16} />
                  BAG
                  {cartCount > 0 && (
                    <span className="absolute right-6 top-3 grid h-4 min-w-4 place-items-center rounded-full bg-[#B89B72] px-1 text-[9px] text-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes hdrShimmer {
          0% { transform: translateX(-150%) skewX(-12deg); }
          60%, 100% { transform: translateX(400%) skewX(-12deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="animate-[hdr"] { animation: none !important; }
        }
      `}</style>
    </>
  );
}
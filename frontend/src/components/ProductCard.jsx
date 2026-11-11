
import { Heart, ShoppingBag, Star, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const formatPrice = (price) =>
  `₹${Number(price || 0).toLocaleString("en-IN")}`;

export default function ProductCard({ product, onAddToCart }) {
  const { addItem, removeItem, isWishlisted } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [wishlistLoading, setWishlistLoading] = useState(false);
  const productImage = product.images?.[0]?.image || "";
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setImageFailed(false);
  }, [productImage]);

  const liked = isWishlisted(product.id);

  const price = Number(product.price || 0);
  const originalPrice = Number(product.mrp || 0);
  const hasDiscount =
    originalPrice > 0 && originalPrice > price;

  const discount = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (wishlistLoading) return;

    setWishlistLoading(true);

    try {
      if (liked) {
        await removeItem(product.id);
      } else {
        await addItem(product.id);
      }
    } catch (error) {
      console.error("Wishlist update failed:", error);
      console.error("API response:", error.response?.data);
    } finally {
      setWishlistLoading(false);
    }
  };

  const openProduct = () => {
    if (product.slug) {
      navigate(`/product/${product.slug}`);
    } else if (product.id) {
      navigate(`/product/${product.id}`);
    }
  };

  return (
    <article className="group min-w-0">
      {/* PRODUCT IMAGE */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F0ECE5]">
        <button
          type="button"
          onClick={openProduct}
          className="absolute inset-0 h-full w-full cursor-pointer"
          aria-label={`View ${product.name}`}
        >
          {productImage && !imageFailed ? (
            <img
              src={productImage}
              alt={product.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs tracking-widest text-[#A39C93]">
              NAZEER COLLECTION
            </div>
          )}
        </button>

        {/* IMAGE OVERLAY */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* BADGE */}
        {product.badge && (
          <span className="absolute left-3 top-3 z-10 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[1.5px] text-[#25231F] shadow-sm sm:left-4 sm:top-4">
            {product.badge}
          </span>
        )}

        {/* DISCOUNT */}
        {hasDiscount && (
          <span className="absolute bottom-3 left-3 z-10 bg-[#25231F] px-3 py-2 text-[9px] font-bold tracking-[1px] text-white sm:bottom-4 sm:left-4">
            {discount}% OFF
          </span>
        )}

        {/* WISHLIST */}
        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishlistLoading}
          aria-label={
            liked ? "Remove from wishlist" : "Add to wishlist"
          }
          aria-pressed={liked}
          className={`absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md transition-all duration-300 hover:scale-110 sm:right-4 sm:top-4 sm:h-10 sm:w-10 ${liked
            ? "text-rose-600"
            : "text-[#25231F] hover:text-rose-600"
            } ${wishlistLoading ? "cursor-wait opacity-60" : ""}`}
        >
          <Heart
            size={17}
            strokeWidth={1.7}
            fill={liked ? "currentColor" : "none"}
          />
        </button>

        {/* QUICK ADD */}
        <button
          type="button"
          onClick={() => onAddToCart?.(product)}
          className="absolute bottom-3 right-3 z-20 flex items-center justify-center gap-2 bg-white px-4 py-3 text-[9px] font-bold tracking-[1.3px] text-[#25231F] shadow-md transition-all duration-300 hover:bg-[#25231F] hover:text-white sm:bottom-4 sm:left-4 sm:right-4 sm:translate-y-3 sm:justify-center sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
        >
          <ShoppingBag size={14} strokeWidth={1.8} />
          ADD TO BAG
        </button>
      </div>

      {/* PRODUCT DETAILS */}
      <div className="px-0.5 pt-4 sm:pt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="truncate text-[9px] font-semibold uppercase tracking-[1.7px] text-[#A48754]">
            {product.category?.name ||
              product.categoryLabel ||
              (typeof product.category === "string" ? product.category : "Collection")}          </p>

          <ArrowUpRight
            size={14}
            className="shrink-0 text-[#B89B72] opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
          />
        </div>

        <button
          type="button"
          onClick={openProduct}
          className="block w-full text-left"
        >
          <h3 className="line-clamp-2 min-h-[40px] text-[12px] font-medium leading-5 text-[#25231F] transition-colors duration-300 group-hover:text-[#A48754] sm:text-sm sm:leading-6">
            {product.name}
          </h3>
        </button>

        {/* PRICE */}
        <div className="mt-2 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="text-sm font-bold text-[#25231F] sm:text-base">
            {formatPrice(price)}
          </strong>

          {hasDiscount && (
            <>
              <del className="text-[10px] text-[#A39C93] sm:text-xs">
                {formatPrice(originalPrice)}
              </del>

              <span className="text-[9px] font-bold tracking-wide text-[#718B66] sm:text-[10px]">
                {discount}% OFF
              </span>
            </>
          )}
        </div>

        {/* RATING */}
        {Number(product.average_rating) > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <Star
              size={12}
              fill="currentColor"
              className="text-[#B89B72]"
            />

            <span className="text-[10px] font-semibold text-[#625D55]">
              {Number(product.average_rating).toFixed(1)}
            </span>

            <span className="text-[9px] text-[#A39C93]">
              Customer rating
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

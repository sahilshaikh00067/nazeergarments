
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "./AuthContext";

import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../services/wishlistService";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await getWishlist();

      const items = Array.isArray(response?.wishlist)
        ? response.wishlist
        : [];

      setWishlist(items);
      return items;
    } catch (error) {
      console.error("Wishlist loading failed:", error);
      console.error("Wishlist API response:", error.response?.data);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setWishlist([]);
      setLoading(false);
      return;
    }

    loadWishlist().catch(() => {});
  }, [authLoading, isAuthenticated, loadWishlist]);

  const addItem = async (productId) => {
    if (!isAuthenticated) {
      throw new Error("Please login to use your wishlist.");
    }

    const result = await addToWishlist(productId);

    await loadWishlist();

    return result;
  };

const removeItem = async (productId) => {
  await removeFromWishlist(productId);

  setWishlist((current) =>
    current.filter(
      (item) =>
        Number(item?.product?.id) !== Number(productId)
    )
  );
};

const isWishlisted = (productId) =>
  wishlist.some(
    (item) =>
      Number(item?.product?.id) === Number(productId)
  );

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        loadWishlist,
        addItem,
        removeItem,
        isWishlisted,
        wishlistCount: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error(
      "useWishlist must be used inside WishlistProvider"
    );
  }

  return context;
}

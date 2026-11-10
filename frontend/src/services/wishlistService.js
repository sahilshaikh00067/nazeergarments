import { api } from "./api";

// Get customer wishlist
export const getWishlist = async () => {
  const response = await api.get("/wishlist/");
  return response.data;
};

// Add product to wishlist
export const addToWishlist = async (productId) => {
  const response = await api.post("/wishlist/", {
    product_id: productId,
  });
  return response.data;
};

// Remove product from wishlist
export const removeFromWishlist = async (productId) => {
  const response = await api.delete("/wishlist/", {
    data: {
      product_id: productId,
    },
  });
  return response.data;
};
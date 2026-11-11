import { api } from "./api";

export const getWishlist = async () => {
  const response = await api.get("/wishlist/");
  return response.data;
};

export const addToWishlist = async (productId) => {
  const response = await api.post("/wishlist/", {
    product_id: productId,
  });
  return response.data;
};

export const removeFromWishlist = async (productId) => {
  const response = await api.delete("/wishlist/", {
    data: { product_id: productId },
  });
  return response.data;
};

import { api } from "./api";

// Fetch approved reviews for a product
export const getProductReviews = async (slug) => {
    const response = await api.get(
        `/products/${encodeURIComponent(slug)}/reviews/`
    );

    return response.data;
};

// Submit review with multiple photos
export const submitProductReview = async ({
    slug,
    rating,
    title,
    comment,
    images = [],
}) => {
    const formData = new FormData();

    formData.append("rating", rating);
    formData.append("title", title);
    formData.append("comment", comment);

    images.forEach((image) => {
        formData.append("images", image);
    });

    const response = await api.post(
        `/products/${encodeURIComponent(slug)}/reviews/`,
        formData,
        {
            headers: {
                "Content-Type": undefined,
            },
        }
    );

    return response.data;
};

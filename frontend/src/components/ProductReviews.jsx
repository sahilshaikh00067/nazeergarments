
import { useEffect, useRef, useState } from "react";
import { FaStar, FaCamera, FaTimes, FaUserCircle } from "react-icons/fa";
import {
    getProductReviews,
    submitProductReview,
} from "../services/reviewService";
import { getAccessToken } from "../services/api";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const API_ORIGIN = (
    import.meta.env.VITE_API_BASE_URL ||
    "https://nazeergarments.onrender.com/api"
).replace(/\/api\/?$/, "");

const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

function Stars({ rating, interactive = false, onChange, size = "text-sm" }) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    onClick={() => onChange?.(star)}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    className={`${size} ${star <= rating ? "text-[#B89B72]" : "text-[#D8D1C6]"
                        } ${interactive ? "cursor-pointer transition hover:scale-110" : "cursor-default"}`}
                >
                    <FaStar />
                </button>
            ))}
        </div>
    );
}

export default function ProductReviews({ slug, onReviewSubmitted }) {
    const fileInputRef = useRef(null);

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState("");
    const [comment, setComment] = useState("");
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

    const isLoggedIn = Boolean(getAccessToken());

    const loadReviews = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getProductReviews(slug);
            setReviews(data.reviews || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load customer reviews."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (slug) loadReviews();
    }, [slug]);

    useEffect(() => {
        const urls = images.map((file) => URL.createObjectURL(file));

        setImagePreviews(urls);

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [images]);

    const handleImageChange = (event) => {
        const selected = Array.from(event.target.files || []);
        const remaining = MAX_IMAGES - images.length;

        if (remaining <= 0) {
            setMessage("Maximum 5 photos allowed.");
            event.target.value = "";
            return;
        }

        const validImages = [];

        for (const file of selected) {
            if (!file.type.startsWith("image/")) {
                setMessage(`${file.name} is not an image.`);
                continue;
            }

            if (file.size > MAX_IMAGE_SIZE) {
                setMessage(`${file.name} exceeds the 5 MB limit.`);
                continue;
            }

            validImages.push(file);
        }

        setImages((current) => [
            ...current,
            ...validImages.slice(0, remaining),
        ]);

        event.target.value = "";
    };

    const removeImage = (index) => {
        setImages((current) => current.filter((_, i) => i !== index));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!isLoggedIn) {
            setError("Please login before submitting a review.");
            return;
        }

        if (!comment.trim()) {
            setError("Please write your review.");
            return;
        }

        if (rating < 1 || rating > 5) {
            setError("Please select a rating.");
            return;
        }

        try {
            setSubmitting(true);

            await submitProductReview({
                slug,
                rating,
                title: title.trim(),
                comment: comment.trim(),
                images,
            });

            setTitle("");
            setComment("");
            setRating(5);
            setImages([]);
            setMessage("Thank you! Your review has been submitted.");

            await loadReviews();
            onReviewSubmitted?.();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to submit your review. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const averageRating =
        reviews.length > 0
            ? (
                reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
                reviews.length
            ).toFixed(1)
            : "0.0";

    return (
        <section className="bg-[#FAF8F3] px-5 py-16 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-[1200px]">
                <div className="mb-10 text-center">
                    <p className="text-[10px] tracking-[3px] text-[#B89B72]">
                        CUSTOMER EXPERIENCES
                    </p>

                    <h2 className="mt-3 font-serif text-3xl text-[#25231F] sm:text-4xl">
                        Reviews & <em className="text-[#B89B72]">Ratings</em>
                    </h2>

                    <p className="mt-3 text-xs text-[#817B72]">
                        Real experiences from customers who received this product.
                    </p>
                </div>

                <div className="grid gap-10 border-y border-[#E5DED3] py-8 md:grid-cols-[260px_1fr]">
                    <div className="flex flex-col items-center justify-center border-b border-[#E5DED3] pb-8 md:border-b-0 md:border-r md:pb-0">
                        <span className="font-serif text-6xl text-[#25231F]">
                            {averageRating}
                        </span>

                        <Stars rating={Math.round(Number(averageRating))} size="text-lg" />

                        <p className="mt-3 text-xs text-[#817B72]">
                            {reviews.length} customer reviews
                        </p>
                    </div>

                    <div className="flex flex-col justify-center">
                        <h3 className="font-serif text-2xl text-[#25231F]">
                            Share your experience
                        </h3>

                        <p className="mt-2 text-xs leading-6 text-[#817B72]">
                            Your feedback helps other customers make better choices.
                        </p>
                    </div>
                </div>

                {isLoggedIn ? (
                    <form
                        onSubmit={handleSubmit}
                        className="mt-10 border border-[#E5DED3] bg-white p-5 sm:p-8"
                    >
                        <h3 className="font-serif text-2xl text-[#25231F]">
                            Write a Review
                        </h3>

                        <div className="mt-6">
                            <label className="mb-3 block text-[10px] font-semibold tracking-widest">
                                YOUR RATING
                            </label>

                            <Stars
                                rating={rating}
                                interactive
                                onChange={setRating}
                                size="text-2xl"
                            />
                        </div>

                        <div className="mt-6">
                            <label className="mb-2 block text-[10px] font-semibold tracking-widest">
                                REVIEW TITLE
                            </label>

                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={150}
                                placeholder="Give your review a title"
                                className="w-full border border-[#E5DED3] bg-[#FAF8F3] px-4 py-3 text-sm outline-none focus:border-[#B89B72]"
                            />
                        </div>

                        <div className="mt-5">
                            <label className="mb-2 block text-[10px] font-semibold tracking-widest">
                                YOUR REVIEW *
                            </label>

                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={5}
                                required
                                placeholder="Tell us about the quality, fitting and overall experience..."
                                className="w-full resize-y border border-[#E5DED3] bg-[#FAF8F3] px-4 py-3 text-sm outline-none focus:border-[#B89B72]"
                            />
                        </div>

                        <div className="mt-6">
                            <label className="mb-3 block text-[10px] font-semibold tracking-widest">
                                ADD PHOTOS (MAXIMUM 5)
                            </label>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={images.length >= MAX_IMAGES}
                                className="flex items-center gap-3 border border-dashed border-[#B89B72] px-5 py-4 text-xs text-[#817B72] transition hover:bg-[#FAF8F3] disabled:opacity-40"
                            >
                                <FaCamera className="text-[#B89B72]" />
                                Upload Photos
                            </button>

                            <p className="mt-2 text-[10px] text-[#817B72]">
                                Each photo must be under 5 MB.
                            </p>

                            {images.length > 0 && (
                                <div className="mt-5 flex flex-wrap gap-3">
                                    {images.map((file, index) => (
                                        <div
                                            key={`${file.name}-${index}`}
                                            className="relative h-24 w-24 overflow-hidden border border-[#E5DED3]"
                                        >
                                            <img
                                                src={imagePreviews[index]}
                                                alt={`Preview ${index + 1}`}
                                                className="h-full w-full object-cover"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                aria-label="Remove photo"
                                                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#25231F] text-white"
                                            >
                                                <FaTimes size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="mt-5 text-xs text-red-600">{error}</p>
                        )}

                        {message && (
                            <p className="mt-5 text-xs text-[#718B66]">{message}</p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-7 bg-[#25231F] px-9 py-4 text-[10px] font-semibold tracking-[2px] text-white transition hover:bg-[#B89B72] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? "SUBMITTING..." : "SUBMIT REVIEW"}
                        </button>

                        <p className="mt-4 text-[10px] leading-5 text-[#817B72]">
                            Only customers who have received this product can submit a
                            review. One review is allowed per customer per product.
                        </p>
                    </form>
                ) : (
                    <div className="mt-10 border border-[#E5DED3] bg-white p-6 text-center">
                        <p className="text-sm text-[#817B72]">
                            Please login to write a product review.
                        </p>
                    </div>
                )}

                <div className="mt-14">
                    <h3 className="mb-7 font-serif text-2xl text-[#25231F]">
                        Customer Reviews ({reviews.length})
                    </h3>

                    {loading ? (
                        <p className="py-10 text-center text-sm text-[#817B72]">
                            Loading reviews...
                        </p>
                    ) : error && reviews.length === 0 ? (
                        <p className="py-10 text-center text-sm text-red-600">
                            {error}
                        </p>
                    ) : reviews.length === 0 ? (
                        <div className="border border-[#E5DED3] bg-white px-5 py-12 text-center">
                            <FaStar className="mx-auto text-3xl text-[#B89B72]" />
                            <p className="mt-4 font-serif text-xl">
                                No reviews yet
                            </p>
                            <p className="mt-2 text-xs text-[#817B72]">
                                Be the first customer to share your experience.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {reviews.map((review) => (
                                <article
                                    key={review.id}
                                    className="border border-[#E5DED3] bg-white p-5 sm:p-7"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <FaUserCircle className="text-3xl text-[#B89B72]" />

                                            <div>
                                                <h4 className="text-sm font-semibold text-[#25231F]">
                                                    {review.customer_name || "Customer"}
                                                </h4>

                                                <p className="mt-1 text-[10px] text-[#817B72]">
                                                    {formatDate(review.created_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <Stars rating={Number(review.rating)} />
                                    </div>

                                    {review.title && (
                                        <h4 className="mt-5 font-serif text-xl text-[#25231F]">
                                            {review.title}
                                        </h4>
                                    )}

                                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#817B72]">
                                        {review.comment}
                                    </p>

                                    {review.images?.length > 0 && (
                                        <div className="mt-5 flex flex-wrap gap-3">
                                            {review.images.map((image) => (
                                                <a
                                                    key={image.id}
                                                    href={getImageUrl(image.image)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="h-24 w-24 overflow-hidden border border-[#E5DED3]"
                                                >
                                                    <img
                                                        src={getImageUrl(image.image)}
                                                        alt="Customer review"
                                                        loading="lazy"
                                                        className="h-full w-full object-cover transition hover:scale-105"
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

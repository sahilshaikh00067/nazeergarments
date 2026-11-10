const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL ||
    "https://nazeergarments.onrender.com/api"
).replace(/\/+$/, "");

const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

// Convert backend image path into complete image URL
function getImageUrl(path) {
    if (!path) return "";

    // Handle image object
    if (typeof path === "object") {
        path = path.image || path.image_url || path.url || path.file || "";
    }

    if (!path || typeof path !== "string") return "";

    // Already a complete URL
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    // Handle relative media paths
    return `${MEDIA_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

// Normalize product data received from Django
function normalizeProduct(item) {

const variants = Array.isArray(item.variants)
    ? item.variants
    : [];
    // Support different possible image field names
    const rawImages = Array.isArray(item.images)
        ? item.images
        : [];

    const images = rawImages
        .slice()
        .sort(
            (a, b) =>
                Number(a.sort_order || 0) -
                Number(b.sort_order || 0)
        )
        .map((image) => {
            return getImageUrl(
                image.image ||
                image.image_url ||
                image.url ||
                image.file ||
                image
            );
        })
        .filter(Boolean);

    // Fallback for APIs returning a single product image
    const mainImage = getImageUrl(
        item.image ||
        item.image_url ||
        item.thumbnail ||
        ""
    );

    const finalImages = images.length
        ? images
        : mainImage
            ? [mainImage]
            : [];


const availableVariants = variants.filter(
    (variant) =>
        variant.is_available !== false &&
        Number(variant.stock || 0) > 0 &&
        Number.isInteger(Number(variant.id)) &&
        Number(variant.id) > 0
);

    const sizes = [
        ...new Set(
            availableVariants
                .map((variant) => variant.size)
                .filter(Boolean)
        ),
    ];

    const colors = [
        ...new Set(
            availableVariants
                .map((variant) => variant.color)
                .filter(Boolean)
        ),
    ];

    const badge = item.is_bestseller
        ? "BESTSELLER"
        : item.is_new
            ? "NEW ARRIVAL"
            : item.is_featured
                ? "FEATURED"
                : "";

    return {
        id: item.id,
        slug: item.slug,
        name: item.name,

        category: item.category?.slug || "",
        categoryLabel: item.category?.name || "Collection",

        price: Number(item.price || 0),
        originalPrice: Number(item.mrp || 0),

rating: Number(item.average_rating || 0),
reviews: Number(item.total_reviews || 0),

        badge,

        image: finalImages[0] || "",
        images: finalImages,

        sizes,
        colors,
        variants,

        stock: Number(item.total_stock || 0),

        description: item.description || "",
        brand: item.brand || "",
        fabric: item.fabric || "",
        specs: item.specs || {},

        isFeatured: item.is_featured,
        isBestseller: item.is_bestseller,
        isNew: item.is_new,
    };
}

// Common API request handler
async function apiRequest(endpoint) {
    const url = `${API_BASE_URL}${endpoint}`;


    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `API request failed (${response.status})`
        );
    }

    return response.json();
}

// Get all products
export async function getProducts() {
    const data = await apiRequest("/products/");


    const products = data.products || [];

    return products.map(normalizeProduct);
}

// Get individual product by slug
export async function getProductBySlug(slug) {
    const data = await apiRequest(
        `/products/${encodeURIComponent(slug)}/`
    );

    if (!data.product) {
        throw new Error("Product not found");
    }

    return normalizeProduct(data.product);
}
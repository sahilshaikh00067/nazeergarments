import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "zazeer_garments_cart";

function readCart() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState(readCart);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
        } catch (error) {
            console.error("Unable to save cart:", error);
        }
    }, [cartItems]);

    const addItem = useCallback((product, options = {}) => {
        if (!product?.id) {
            return { success: false, message: "Invalid product." };
        }

        const quantity = Math.max(1, Number(options.quantity) || 1);
        const stock = Math.max(
            0,
            Number(options.stock ?? product.stock ?? 0)
        );

        if (stock <= 0) {
            return { success: false, message: "This product is out of stock." };
        }

        if (quantity > stock) {
            return {
                success: false,
                message: "Requested quantity is not available.",
            };
        }

        const size = options.size || "";
        const color = options.color || "";

        const variantId = Number(options.variantId);

        if (!Number.isInteger(variantId) || variantId <= 0) {
            return {
                success: false,
                message: "Invalid product variant. Please select size and color again.",
            };
        }

        const unitPrice = Number(options.unitPrice ?? product.price ?? 0);

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            return {
                success: false,
                message: "Invalid product price.",
            };
        }

        const key = `${product.id}-${variantId}`;
        const existing = cartItems.find((item) => item.key === key);

        if (existing && existing.quantity + quantity > existing.stock) {
            return {
                success: false,
                message: `Only ${existing.stock} units are available.`,
            };
        }

        setCartItems((current) => {
            const currentItem = current.find((item) => item.key === key);

            if (currentItem) {
                return current.map((item) =>
                    item.key === key
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }

            return [
                ...current,
                {
                    key,
                    productId: product.id,
                    variantId,
                    slug: product.slug,
                    name: product.name,
                    image: product.image || "",
                    price: unitPrice,
                    quantity,
                    stock,
                    size,
                    color,
                },
            ];
        });

        return {
            success: true,
            message: "Product added to your bag.",
        };
    }, [cartItems]);

    const updateQuantity = useCallback((key, quantity) => {
        const nextQuantity = Number(quantity);

        setCartItems((current) =>
            current.map((item) => {
                if (item.key !== key) return item;

                return {
                    ...item,
                    quantity: Math.min(
                        item.stock,
                        Math.max(1, Math.floor(nextQuantity) || 1)
                    ),
                };
            })
        );
    }, []);

    const removeItem = useCallback((key) => {
        setCartItems((current) =>
            current.filter((item) => item.key !== key)
        );
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
    }, []);

    const cartCount = useMemo(
        () => cartItems.reduce((total, item) => total + item.quantity, 0),
        [cartItems]
    );

    const subtotal = useMemo(
        () =>
            cartItems.reduce(
                (total, item) => total + item.price * item.quantity,
                0
            ),
        [cartItems]
    );

    const value = {
        cartItems,
        cartCount,
        subtotal,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error("useCart must be used inside CartProvider.");
    }

    return context;
}
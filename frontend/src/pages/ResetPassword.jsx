import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";

export default function ResetPassword() {
    const [params] = useSearchParams();

    const uid = params.get("uid");
    const token = params.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!uid || !token) {
            setError("Invalid password reset link.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/auth/reset-password/", {
                uid,
                token,
                password,
                confirm_password: confirmPassword,
            });

            setMessage(response.data.message);
        } catch (err) {
            const data = err.response?.data;
            setError(
                data?.message ||
                data?.detail ||
                data?.errors?.password?.[0] ||
                data?.errors?.confirm_password?.[0] ||
                "Unable to reset password."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#FAF8F3] flex items-center justify-center px-5">
            <div className="bg-white p-8 md:p-10 w-full max-w-md">
                <h1 className="font-luxury text-3xl text-center mb-8">
                    Reset Password
                </h1>

                {message ? (
                    <div>
                        <p className="text-green-700 text-center mb-6">
                            {message}
                        </p>
                        <Link to="/login" className="block text-center underline">
                            Sign In
                        </Link>
                    </div>
                ) : (
                    <>
                        {error && (
                            <p className="bg-red-50 text-red-700 p-3 text-sm mb-5">
                                {error}
                            </p>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <input
                                type="password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="New Password"
                                className="w-full border px-4 py-3"
                            />

                            <input
                                type="password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm New Password"
                                className="w-full border px-4 py-3"
                            />

                            <button
                                disabled={loading}
                                className="w-full bg-black text-white py-4"
                            >
                                {loading ? "UPDATING..." : "RESET PASSWORD"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </main>
    );
}
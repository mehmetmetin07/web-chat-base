"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

export function AuthForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    setErrorMsg(error.message);
                } else if (data.user) {
                    setSuccessMsg("Login successful! Redirecting...");
                    window.location.href = "/channels";
                }
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (error) {
                    setErrorMsg(error.message);
                } else {
                    setSuccessMsg("Account created! Check your email or try logging in.");
                }
            }
        } catch (err) {
            setErrorMsg("An unexpected error occurred");
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleAuth} className="flex flex-col gap-4 w-full max-w-sm">
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {isLogin ? "Welcome back" : "Create an account"}
                </h1>
                <p className="text-sm text-gray-500">
                    Enter your email below to {isLogin ? "login" : "create your account"}
                </p>
            </div>
            <div className="grid gap-2">
                <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                />
                {errorMsg && (
                    <p className="text-sm text-red-500 text-center">{errorMsg}</p>
                )}
                {successMsg && (
                    <p className="text-sm text-green-500 text-center">{successMsg}</p>
                )}
                <Button type="submit" disabled={loading}>
                    {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
                </Button>
            </div>
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
            </div>
            <Button
                type="button"
                variant="secondary"
                onClick={() => setIsLogin(!isLogin)}
            >
                {isLogin ? "Create an account" : "Login with existing account"}
            </Button>
        </form>
    );
}

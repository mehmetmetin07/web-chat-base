"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

export function AuthForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setErrorMsg(error.message);
            } else {
                router.refresh();
                router.push("/channels");
            }
        } else {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) {
                setErrorMsg(error.message);
            } else {
                setErrorMsg("Check your email for the login link!");
            }
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
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                {errorMsg && (
                    <p className="text-sm text-red-500 text-center">{errorMsg}</p>
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

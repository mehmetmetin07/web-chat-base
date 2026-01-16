"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Camera, Upload } from "lucide-react";

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/gif"];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [fullName, setFullName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            setUserId(user.id);
            setEmail(user.email || "");

            const { data: profile } = await supabase
                .from("users")
                .select("*")
                .eq("id", user.id)
                .single();

            if (profile) {
                setUsername(profile.username || "");
                setFullName(profile.full_name || "");
                setAvatarUrl(profile.avatar_url || "");
            }

            setLoading(false);
        };

        loadProfile();
    }, [router]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            setMessage({ type: "error", text: "Only JPG, PNG, and GIF files are allowed" });
            return;
        }

        if (file.size > MAX_AVATAR_SIZE) {
            setMessage({ type: "error", text: "File size must be less than 2MB" });
            return;
        }

        setUploading(true);
        setMessage(null);

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${userId}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (uploadError) {
            setMessage({ type: "error", text: "Upload failed: " + uploadError.message });
            setUploading(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        const newUrl = urlData.publicUrl + `?t=${Date.now()}`;
        setAvatarUrl(newUrl);

        const { error: updateError } = await supabase
            .from("users")
            .update({ avatar_url: newUrl })
            .eq("id", userId);

        if (updateError) {
            setMessage({ type: "error", text: updateError.message });
        } else {
            setMessage({ type: "success", text: "Avatar updated!" });
        }

        setUploading(false);
    };

    const handleSave = async () => {
        if (!userId) return;

        setSaving(true);
        setMessage(null);

        const { error } = await supabase
            .from("users")
            .update({
                username: username || null,
                full_name: fullName || null,
                avatar_url: avatarUrl || null,
            })
            .eq("id", userId);

        if (error) {
            if (error.code === "23505") {
                setMessage({ type: "error", text: "This username is already taken" });
            } else {
                setMessage({ type: "error", text: error.message });
            }
        } else {
            setMessage({ type: "success", text: "Profile updated successfully!" });
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

                    <div className="flex items-center gap-6 mb-8">
                        <div className="relative group">
                            <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    (username || email).charAt(0).toUpperCase()
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.gif"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute bottom-0 right-0 h-8 w-8 bg-gray-900 rounded-full flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-50"
                            >
                                {uploading ? (
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Camera className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {fullName || username || email.split("@")[0]}
                            </h2>
                            <p className="text-gray-500">{email}</p>
                            <p className="text-xs text-gray-400 mt-1">Click camera icon to upload (JPG, PNG, GIF)</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <Input
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Unique username for your account
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name
                            </label>
                            <Input
                                placeholder="Enter your full name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Avatar URL (or upload above)
                            </label>
                            <Input
                                placeholder="https://example.com/avatar.jpg"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Paste a URL or use the upload button above
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <Input value={email} disabled className="bg-gray-100" />
                            <p className="text-xs text-gray-500 mt-1">
                                Email cannot be changed
                            </p>
                        </div>
                    </div>

                    {message && (
                        <div className={`mt-4 p-3 rounded ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

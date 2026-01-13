"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Crown, Shield, User, UserX } from "lucide-react";
import { Database } from "@/types/supabase";

type ServerMember = {
    id: string;
    user_id: string;
    role: string;
    users: Database["public"]["Tables"]["users"]["Row"];
};

export default function ServerSettingsPage({
    params,
}: {
    params: Promise<{ serverId: string }>;
}) {
    const { serverId } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [server, setServer] = useState<Database["public"]["Tables"]["servers"]["Row"] | null>(null);
    const [members, setMembers] = useState<ServerMember[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [serverName, setServerName] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setCurrentUserId(user.id);

            const { data: serverData } = await supabase
                .from("servers")
                .select("*")
                .eq("id", serverId)
                .single();

            if (serverData) {
                setServer(serverData);
                setServerName(serverData.name);
                setIsOwner(serverData.owner_id === user.id);
            }

            const { data: membersData } = await supabase
                .from("server_members")
                .select("*, users(*)")
                .eq("server_id", serverId);

            if (membersData) {
                setMembers(membersData as any);
            }

            setLoading(false);
        };

        loadSettings();
    }, [serverId, router]);

    const handleSaveServer = async () => {
        if (!isOwner || !server) return;
        setSaving(true);
        setMessage(null);

        const { error } = await supabase
            .from("servers")
            .update({ name: serverName })
            .eq("id", server.id);

        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setMessage({ type: "success", text: "Server settings saved!" });
        }
        setSaving(false);
    };

    const handleRoleChange = async (memberId: string, userId: string, newRole: string) => {
        if (!isOwner || userId === currentUserId) return;

        const { error } = await supabase
            .from("server_members")
            .update({ role: newRole })
            .eq("id", memberId);

        if (!error) {
            setMembers((prev) =>
                prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
            );
        }
    };

    const handleKick = async (memberId: string, userId: string) => {
        if (!isOwner || userId === currentUserId) return;

        const { error } = await supabase
            .from("server_members")
            .delete()
            .eq("id", memberId);

        if (!error) {
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "owner":
                return <Crown className="h-4 w-4 text-yellow-500" />;
            case "admin":
                return <Shield className="h-4 w-4 text-blue-500" />;
            case "moderator":
                return <Shield className="h-4 w-4 text-green-500" />;
            default:
                return <User className="h-4 w-4 text-gray-400" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-500 mb-4">Only server owners can access settings</p>
                    <Button onClick={() => router.back()}>Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                <h1 className="text-2xl font-bold text-gray-900 mb-6">Server Settings</h1>

                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">General</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Server Name
                            </label>
                            <Input
                                value={serverName}
                                onChange={(e) => setServerName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Invite Code
                            </label>
                            <code className="block bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                                {server?.invite_code}
                            </code>
                        </div>
                    </div>
                    {message && (
                        <div className={`mt-4 p-3 rounded ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {message.text}
                        </div>
                    )}
                    <div className="mt-4">
                        <Button onClick={handleSaveServer} disabled={saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Members ({members.length})
                    </h2>
                    <div className="space-y-3">
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                        {member.users?.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">
                                                {member.users?.username || member.users?.full_name || member.users?.email?.split("@")[0]}
                                            </span>
                                            {getRoleIcon(member.role)}
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {member.users?.email}
                                        </span>
                                    </div>
                                </div>
                                {member.user_id !== currentUserId && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={member.role}
                                            onChange={(e) => handleRoleChange(member.id, member.user_id, e.target.value)}
                                            className="text-sm border rounded px-2 py-1"
                                        >
                                            <option value="member">Member</option>
                                            <option value="moderator">Moderator</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <button
                                            onClick={() => handleKick(member.id, member.user_id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                                            title="Kick"
                                        >
                                            <UserX className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

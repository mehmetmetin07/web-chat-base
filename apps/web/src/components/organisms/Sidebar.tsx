"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash, Plus, LogOut, Copy, Check, Users, Link as LinkIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServerChannels } from "@/hooks/useServerChannels";
import { useUsers } from "@/hooks/useUsers";
import { CreateChannelModal } from "@/components/molecules/CreateChannelModal";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Server = Database["public"]["Tables"]["servers"]["Row"];

interface SidebarProps {
    className?: string;
    server: Server | null;
}

export function Sidebar({ className, server }: SidebarProps) {
    const pathname = usePathname();
    const { channels, loading: channelsLoading, createChannel } = useServerChannels(server?.id ?? null);
    const { users, loading: usersLoading } = useUsers(server?.id);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showInvite, setShowInvite] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id ?? null);
            setUserEmail(data.user?.email ?? null);
        });
    }, []);

    const handleCreateChannel = async (name: string) => {
        if (!userId) return;
        await createChannel(name, userId);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    const copyInviteLink = () => {
        if (server?.invite_code) {
            const inviteUrl = `${window.location.origin}/invite/${server.invite_code}`;
            navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const copyInviteCode = () => {
        if (server?.invite_code) {
            navigator.clipboard.writeText(server.invite_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!server) {
        return (
            <div className={cn("flex h-full w-60 flex-col items-center justify-center border-r bg-gray-100", className)}>
                <p className="text-sm text-gray-500 text-center px-4">
                    Select a server or create one to get started
                </p>
            </div>
        );
    }

    return (
        <>
            <div className={cn("flex h-full w-60 flex-col border-r bg-gray-100", className)}>
                <div className="flex h-12 items-center justify-between border-b px-4 bg-gray-200">
                    <span className="font-semibold truncate">{server.name}</span>
                    <Link
                        href={`/servers/${server.id}/settings`}
                        className="p-1 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-300"
                    >
                        <Settings className="h-4 w-4" />
                    </Link>
                </div>

                <button
                    onClick={() => setShowInvite(!showInvite)}
                    className="flex items-center justify-between px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm border-b"
                >
                    <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Invite People
                    </span>
                    <LinkIcon className="h-4 w-4" />
                </button>

                {showInvite && (
                    <div className="p-3 bg-blue-50 border-b space-y-2">
                        <div className="text-xs text-gray-600">Invite Code:</div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white px-2 py-1 rounded text-sm font-mono border">
                                {server.invite_code}
                            </code>
                            <button
                                onClick={copyInviteCode}
                                className="p-2 bg-white rounded border hover:bg-gray-50"
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>
                        <button
                            onClick={copyInviteLink}
                            className="w-full text-xs text-blue-600 hover:underline"
                        >
                            Copy invite link
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-auto py-2">
                    <nav className="px-2 text-sm font-medium">
                        <div className="flex items-center justify-between px-2 mb-1">
                            <span className="text-xs font-semibold uppercase text-gray-500">
                                Text Channels
                            </span>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                disabled={!userId}
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        {channelsLoading ? (
                            <div className="px-2 py-2 text-xs text-gray-400">Loading...</div>
                        ) : channels.length === 0 ? (
                            <div className="px-2 py-2 text-xs text-gray-400">No channels yet</div>
                        ) : (
                            channels.map((channel) => (
                                <Link
                                    key={channel.id}
                                    href={`/servers/${server.id}/channels/${channel.id}`}
                                    className={cn(
                                        "flex items-center gap-2 rounded px-2 py-1.5 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900",
                                        pathname.includes(channel.id) && "bg-gray-300 text-gray-900"
                                    )}
                                >
                                    <Hash className="h-4 w-4 text-gray-500" />
                                    {channel.name}
                                </Link>
                            ))
                        )}

                        <div className="flex items-center justify-between px-2 mt-4 mb-1">
                            <span className="text-xs font-semibold uppercase text-gray-500">
                                Members ({users.length + 1})
                            </span>
                        </div>
                        {usersLoading ? (
                            <div className="px-2 py-2 text-xs text-gray-400">Loading...</div>
                        ) : (
                            <>
                                {userEmail && (
                                    <div className="flex items-center gap-2 rounded px-2 py-1.5 text-gray-600">
                                        <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                                            {userEmail.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="truncate">{userEmail.split("@")[0]} (you)</span>
                                    </div>
                                )}
                                {users.map((user) => (
                                    <Link
                                        key={user.id}
                                        href={`/servers/${server.id}/dm/${user.id}`}
                                        className="flex items-center gap-2 rounded px-2 py-1.5 text-gray-600 transition-all hover:bg-gray-200"
                                    >
                                        <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="truncate">{user.full_name || user.email?.split("@")[0]}</span>
                                    </Link>
                                ))}
                            </>
                        )}
                    </nav>
                </div>

                <div className="border-t p-3 bg-gray-200">
                    {userEmail && (
                        <div className="flex items-center justify-between">
                            <Link
                                href="/profile"
                                className="flex items-center gap-2 hover:opacity-80"
                            >
                                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                    {userEmail.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900 truncate max-w-[100px]">
                                        {userEmail.split("@")[0]}
                                    </span>
                                    <span className="text-xs text-gray-500">Online</span>
                                </div>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="rounded p-2 text-gray-400 hover:bg-gray-300 hover:text-gray-600"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <CreateChannelModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateChannel}
            />
        </>
    );
}

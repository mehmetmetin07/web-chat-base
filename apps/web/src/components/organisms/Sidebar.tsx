"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, Users, Hash, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChannels } from "@/hooks/useChannels";
import { CreateChannelModal } from "@/components/molecules/CreateChannelModal";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const { channels, loading, createChannel } = useChannels();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id ?? null);
        });
    }, []);

    const handleCreateChannel = async (name: string) => {
        if (!userId) return;
        await createChannel(name, userId);
    };

    return (
        <>
            <div className={cn("flex h-full w-64 flex-col border-r bg-gray-50", className)}>
                <div className="flex h-14 items-center border-b px-4">
                    <span className="font-semibold">Web Chat Base</span>
                </div>
                <div className="flex-1 overflow-auto py-4">
                    <nav className="grid items-start px-2 text-sm font-medium">
                        <Link
                            href="/"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900",
                                pathname === "/" && "bg-gray-100 text-gray-900"
                            )}
                        >
                            <Home className="h-4 w-4" />
                            Home
                        </Link>

                        <div className="mt-4 flex items-center justify-between px-3">
                            <span className="text-xs font-semibold uppercase text-gray-400">
                                Channels
                            </span>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                disabled={!userId}
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        {loading ? (
                            <div className="px-3 py-2 text-xs text-gray-400">Loading...</div>
                        ) : (
                            channels.map((channel) => (
                                <Link
                                    key={channel.id}
                                    href={`/channels/${channel.id}`}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900",
                                        pathname === `/channels/${channel.id}` && "bg-gray-100 text-gray-900"
                                    )}
                                >
                                    <Hash className="h-4 w-4" />
                                    {channel.name}
                                </Link>
                            ))
                        )}

                        <div className="mt-4 px-3 text-xs font-semibold uppercase text-gray-400">
                            Direct Messages
                        </div>
                        <Link
                            href="/dm"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900"
                        >
                            <Users className="h-4 w-4" />
                            Direct Messages
                        </Link>

                        <div className="mt-auto">
                            <Link
                                href="/settings"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900"
                            >
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                        </div>
                    </nav>
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

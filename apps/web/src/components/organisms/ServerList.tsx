"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServers } from "@/hooks/useServers";
import { CreateServerModal } from "@/components/molecules/CreateServerModal";
import { JoinServerModal } from "@/components/molecules/JoinServerModal";

interface ServerListProps {
    selectedServerId: string | null;
    onSelectServer: (serverId: string) => void;
}

export function ServerList({ selectedServerId, onSelectServer }: ServerListProps) {
    const { servers, loading, createServer, joinServer } = useServers();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    const handleCreateServer = async (name: string) => {
        const server = await createServer(name);
        if (server) {
            onSelectServer(server.id);
        }
    };

    const handleJoinServer = async (code: string) => {
        const server = await joinServer(code);
        if (server) {
            onSelectServer(server.id);
            return true;
        }
        return false;
    };

    return (
        <>
            <div className="flex h-full w-16 flex-col items-center gap-2 border-r bg-gray-900 py-3">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 w-12 rounded-full bg-gray-700 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <>
                        {servers.map((server) => (
                            <button
                                key={server.id}
                                onClick={() => onSelectServer(server.id)}
                                className={cn(
                                    "group relative h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold transition-all hover:rounded-2xl hover:bg-blue-600",
                                    selectedServerId === server.id && "rounded-2xl bg-blue-600"
                                )}
                            >
                                {server.image_url ? (
                                    <img src={server.image_url} alt={server.name} className="h-full w-full rounded-full object-cover" />
                                ) : (
                                    server.name.charAt(0).toUpperCase()
                                )}
                                <div className={cn(
                                    "absolute left-0 w-1 bg-white rounded-r transition-all",
                                    selectedServerId === server.id ? "h-10" : "h-0 group-hover:h-5"
                                )} />
                            </button>
                        ))}
                    </>
                )}

                <div className="w-8 border-t border-gray-700" />

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center text-green-500 transition-all hover:rounded-2xl hover:bg-green-500 hover:text-white"
                >
                    <Plus className="h-6 w-6" />
                </button>

                <button
                    onClick={() => setShowJoinModal(true)}
                    className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs transition-all hover:rounded-2xl hover:bg-gray-600"
                >
                    Join
                </button>
            </div>

            <CreateServerModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateServer}
            />

            <JoinServerModal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                onSubmit={handleJoinServer}
            />
        </>
    );
}

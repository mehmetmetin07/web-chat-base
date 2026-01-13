"use client";

import { useState, useEffect } from "react";
import { ServerList } from "@/components/organisms/ServerList";
import { Sidebar } from "@/components/organisms/Sidebar";
import { useServers } from "@/hooks/useServers";
import { Database } from "@/types/supabase";

type Server = Database["public"]["Tables"]["servers"]["Row"];

interface DashboardLayoutProps {
    children: React.ReactNode;
    initialServerId?: string;
}

export function DashboardLayout({ children, initialServerId }: DashboardLayoutProps) {
    const { servers, loading } = useServers();
    const [selectedServerId, setSelectedServerId] = useState<string | null>(initialServerId ?? null);
    const [selectedServer, setSelectedServer] = useState<Server | null>(null);

    useEffect(() => {
        if (initialServerId) {
            setSelectedServerId(initialServerId);
        } else if (servers.length > 0 && !selectedServerId) {
            setSelectedServerId(servers[0].id);
        }
    }, [servers, initialServerId, selectedServerId]);

    useEffect(() => {
        if (selectedServerId) {
            const server = servers.find((s) => s.id === selectedServerId);
            setSelectedServer(server ?? null);
        } else {
            setSelectedServer(null);
        }
    }, [selectedServerId, servers]);

    return (
        <div className="flex h-screen bg-gray-50">
            <ServerList
                selectedServerId={selectedServerId}
                onSelectServer={setSelectedServerId}
            />
            <Sidebar server={selectedServer} />
            <main className="flex-1 overflow-hidden">{children}</main>
        </div>
    );
}

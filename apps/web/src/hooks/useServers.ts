"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Server = Database["public"]["Tables"]["servers"]["Row"];

export function useServers() {
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchServers = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUserId(user?.id ?? null);

                if (!user?.id) {
                    setLoading(false);
                    return;
                }

                const { data: memberships, error: memberError } = await supabase
                    .from("server_members")
                    .select("server_id")
                    .eq("user_id", user.id);

                if (!memberships || memberships.length === 0) {
                    setServers([]);
                    setLoading(false);
                    return;
                }

                const serverIds = memberships.map((m) => m.server_id);

                const { data: serversData, error: serverError } = await supabase
                    .from("servers")
                    .select("*")
                    .in("id", serverIds)
                    .order("created_at", { ascending: true });

                setServers(serversData || []);
            } catch (err) {
                setServers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchServers();

        const channel = supabase
            .channel("server_members_changes")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "server_members",
                },
                () => {
                    fetchServers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const createServer = async (name: string) => {
        if (!currentUserId) {
            console.error("No current user ID");
            return null;
        }

        const { data, error } = await supabase
            .from("servers")
            .insert({ name, owner_id: currentUserId })
            .select()
            .single();

        console.log("Create result:", data, "Error:", error);

        if (error) {
            // console.error("Server create error:", error.message);
        }

        if (!error && data) {
            setServers((prev) => [...prev, data]);
            return data;
        }
        return null;
    };

    const joinServer = async (inviteCode: string) => {
        if (!currentUserId) return null;

        const { data: server } = await supabase
            .from("servers")
            .select("*")
            .eq("invite_code", inviteCode)
            .single();

        if (!server) return null;

        const { error } = await supabase.from("server_members").insert({
            server_id: server.id,
            user_id: currentUserId,
            role: "member",
        });

        if (!error) {
            setServers((prev) => [...prev, server]);
            return server;
        }
        return null;
    };

    return { servers, loading, currentUserId, createServer, joinServer };
}

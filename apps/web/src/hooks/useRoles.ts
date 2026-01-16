"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Role = Database["public"]["Tables"]["server_roles"]["Row"];

export function useRoles(serverId: string) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!serverId) return;

        const fetchRoles = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from("server_roles")
                    .select("*")
                    .eq("server_id", serverId)
                    .order("position", { ascending: false }); // Highest position first

                if (error) throw error;
                setRoles(data || []);
            } catch (err: any) {
                console.error("Error fetching roles:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();

        const channel = supabase
            .channel(`roles:${serverId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "server_roles",
                    filter: `server_id=eq.${serverId}`,
                },
                () => {
                    fetchRoles();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [serverId]);

    const createRole = async (name: string, color: string = "#99aab5", permissions: Record<string, boolean> = { SEND_MESSAGES: true }) => {
        try {
            const maxPosition = roles.reduce((max, r) => Math.max(max, r.position ?? 0), 0);
            const { data, error } = await supabase
                .from("server_roles")
                .insert({
                    server_id: serverId,
                    name,
                    color,
                    position: maxPosition + 1,
                    permissions,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateRole = async (roleId: string, updates: Partial<Role>) => {
        try {
            const { data, error } = await supabase
                .from("server_roles")
                .update(updates)
                .eq("id", roleId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const deleteRole = async (roleId: string) => {
        try {
            const { error } = await supabase
                .from("server_roles")
                .delete()
                .eq("id", roleId);

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateRolePositions = async (roles: Role[]) => {
        try {
            // Update each role's position
            // This is naive and should ideally be a batch update or RPC, 
            // but for now promise.all is fine for small role counts
            await Promise.all(
                roles.map((role, index) =>
                    supabase
                        .from("server_roles")
                        .update({ position: roles.length - 1 - index }) // Reverse index so top of list = highest position
                        .eq("id", role.id)
                )
            );
        } catch (err: any) {
            setError(err.message);
        }
    };

    return { roles, loading, error, createRole, updateRole, deleteRole, updateRolePositions };
}

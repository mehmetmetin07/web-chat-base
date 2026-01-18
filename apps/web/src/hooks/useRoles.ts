"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

export type Role = Database["public"]["Tables"]["server_roles"]["Row"];

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
            if (error) throw error;

            // Log action
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("moderation_logs").insert({
                    server_id: serverId,
                    moderator_id: user.id,
                    action: "role_create",
                    metadata: { role_name: name, color, permissions }
                });
            }

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
            if (error) throw error;

            // Log action
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("moderation_logs").insert({
                    server_id: serverId,
                    moderator_id: user.id,
                    action: "role_update",
                    metadata: { role_id: roleId, updates }
                });
            }

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

            // Log action
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Find role name from state if possible, otherwise just ID
                const roleName = roles.find(r => r.id === roleId)?.name || "Unknown Role";
                await supabase.from("moderation_logs").insert({
                    server_id: serverId,
                    moderator_id: user.id,
                    action: "role_delete",
                    metadata: { role_id: roleId, role_name: roleName }
                });
            }
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

    const assignRoleToMember = async (memberId: string, roleId: string) => {
        try {
            const { error } = await supabase
                .from("server_member_roles")
                .insert({
                    server_id: serverId,
                    user_id: memberId,
                    role_id: roleId,
                });

            if (error) throw error;

            // Log action
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const roleName = roles.find(r => r.id === roleId)?.name || "Unknown Role";
                await supabase.from("moderation_logs").insert({
                    server_id: serverId,
                    moderator_id: user.id,
                    target_user_id: memberId,
                    action: "role_assign",
                    metadata: { role_id: roleId, role_name: roleName }
                });
            }
        } catch (err: any) {
            console.error("Error assigning role:", err);
            setError(err.message);
            throw err;
        }
    };

    const removeRoleFromMember = async (memberId: string, roleId: string) => {
        try {
            const { error } = await supabase
                .from("server_member_roles")
                .delete()
                .eq("server_id", serverId)
                .eq("user_id", memberId)
                .eq("role_id", roleId);

            if (error) throw error;

            // Log action
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const roleName = roles.find(r => r.id === roleId)?.name || "Unknown Role";
                await supabase.from("moderation_logs").insert({
                    server_id: serverId,
                    moderator_id: user.id,
                    target_user_id: memberId,
                    action: "role_remove",
                    metadata: { role_id: roleId, role_name: roleName }
                });
            }
        } catch (err: any) {
            console.error("Error removing role:", err);
            setError(err.message);
            throw err;
        }
    };

    const kickMember = async (memberId: string) => {
        try {
            const { error } = await supabase
                .from("server_members")
                .delete()
                .eq("server_id", serverId)
                .eq("user_id", memberId);

            if (error) throw error;
        } catch (err: any) {
            console.error("Error kicking member:", err);
            setError(err.message);
            throw err;
        }
    };

    const banMember = async (memberId: string) => {
        try {
            const { error } = await supabase
                .from("server_bans")
                .insert({
                    server_id: serverId,
                    user_id: memberId,
                });

            if (error) throw error;
        } catch (err: any) {
            console.error("Error banning member:", err);
            setError(err.message);
            throw err;
        }
    };

    return { roles, loading, error, createRole, updateRole, deleteRole, updateRolePositions, assignRoleToMember, removeRoleFromMember, kickMember, banMember };
}

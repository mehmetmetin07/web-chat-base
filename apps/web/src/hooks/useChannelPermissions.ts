"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type ServerRole = {
    id: string;
    server_id: string;
    name: string;
    color: string;
    position: number;
    permissions: Record<string, boolean>;
};

type ChannelPermission = {
    id?: string;
    channel_id: string;
    role_id: string;
    // Basic
    can_view: boolean;
    can_send: boolean;
    can_read_history: boolean;
    // Content
    can_attach: boolean;
    can_embed_links: boolean;
    can_add_reactions: boolean;
    can_use_external_emojis: boolean;
    // Interaction
    can_mention: boolean;
    can_mention_everyone: boolean;
    can_create_invite: boolean;
    // Moderation
    can_manage: boolean;
    can_delete_messages: boolean;
    can_pin_messages: boolean;
    // Rate Limiting
    slowmode_seconds: number;
};

const DEFAULT_PERMISSIONS: Omit<ChannelPermission, "id" | "channel_id" | "role_id"> = {
    can_view: true,
    can_send: true,
    can_read_history: true,
    can_attach: true,
    can_embed_links: true,
    can_add_reactions: true,
    can_use_external_emojis: true,
    can_mention: true,
    can_mention_everyone: false,
    can_create_invite: true,
    can_manage: false,
    can_delete_messages: false,
    can_pin_messages: false,
    slowmode_seconds: 0,
};

export type PermissionField = keyof Omit<ChannelPermission, "id" | "channel_id" | "role_id">;

export function useChannelPermissions(channelId: string | null, serverId: string | null) {
    const [permissions, setPermissions] = useState<ChannelPermission[]>([]);
    const [roles, setRoles] = useState<ServerRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!channelId || !serverId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        const [rolesRes, permissionsRes] = await Promise.all([
            supabase.from("server_roles").select("*").eq("server_id", serverId).order("position", { ascending: false }),
            supabase.from("channel_permissions").select("*").eq("channel_id", channelId),
        ]);

        if (rolesRes.error) {
            setError(rolesRes.error.message);
            setLoading(false);
            return;
        }

        if (permissionsRes.error) {
            setError(permissionsRes.error.message);
            setLoading(false);
            return;
        }

        setRoles(rolesRes.data as ServerRole[]);
        setPermissions(permissionsRes.data as ChannelPermission[]);
        setLoading(false);
    }, [channelId, serverId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updatePermission = async (
        roleId: string,
        field: PermissionField,
        value: boolean | number
    ) => {
        if (!channelId) return;

        const existing = permissions.find((p) => p.role_id === roleId);

        if (existing?.id) {
            await supabase
                .from("channel_permissions")
                .update({ [field]: value })
                .eq("id", existing.id);

            setPermissions((prev) =>
                prev.map((p) => (p.role_id === roleId ? { ...p, [field]: value } : p))
            );
        } else {
            const { data } = await supabase
                .from("channel_permissions")
                .insert({
                    channel_id: channelId,
                    role_id: roleId,
                    ...DEFAULT_PERMISSIONS,
                    [field]: value,
                })
                .select()
                .single();

            if (data) {
                setPermissions((prev) => [...prev, data as ChannelPermission]);
            }
        }
    };

    const getPermissionForRole = (roleId: string): ChannelPermission => {
        const existing = permissions.find((p) => p.role_id === roleId);
        if (existing) return existing;
        return { ...DEFAULT_PERMISSIONS, role_id: roleId, channel_id: channelId || "" };
    };

    return { permissions, roles, loading, error, updatePermission, getPermissionForRole, refetch: fetchData };
}

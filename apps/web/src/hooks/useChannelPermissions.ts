"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type ChannelPermission = {
    id?: string;
    channel_id: string;
    role: "admin" | "moderator" | "member";
    can_send: boolean;
    can_attach: boolean;
    can_mention: boolean;
    slowmode_seconds: number;
};

const DEFAULT_PERMISSIONS: Omit<ChannelPermission, "id" | "channel_id"> = {
    role: "member",
    can_send: true,
    can_attach: true,
    can_mention: true,
    slowmode_seconds: 0,
};

export function useChannelPermissions(channelId: string | null) {
    const [permissions, setPermissions] = useState<ChannelPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPermissions = useCallback(async () => {
        if (!channelId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from("channel_permissions")
            .select("*")
            .eq("channel_id", channelId);

        if (fetchError) {
            setError(fetchError.message);
            setLoading(false);
            return;
        }

        const roles: Array<"admin" | "moderator" | "member"> = ["admin", "moderator", "member"];
        const fullPermissions = roles.map((role) => {
            const existing = data?.find((p) => p.role === role);
            if (existing) return existing as ChannelPermission;
            return { ...DEFAULT_PERMISSIONS, role, channel_id: channelId };
        });

        setPermissions(fullPermissions);
        setLoading(false);
    }, [channelId]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    const updatePermission = async (
        role: "admin" | "moderator" | "member",
        field: keyof Omit<ChannelPermission, "id" | "channel_id" | "role">,
        value: boolean | number
    ) => {
        if (!channelId) return;

        const existing = permissions.find((p) => p.role === role);

        if (existing?.id) {
            await supabase
                .from("channel_permissions")
                .update({ [field]: value })
                .eq("id", existing.id);
        } else {
            await supabase.from("channel_permissions").insert({
                channel_id: channelId,
                role,
                [field]: value,
            });
        }

        setPermissions((prev) =>
            prev.map((p) => (p.role === role ? { ...p, [field]: value } : p))
        );
    };

    const getPermissionForRole = (role: "admin" | "moderator" | "member") => {
        return permissions.find((p) => p.role === role) || { ...DEFAULT_PERMISSIONS, role, channel_id: channelId || "" };
    };

    return { permissions, loading, error, updatePermission, getPermissionForRole, refetch: fetchPermissions };
}

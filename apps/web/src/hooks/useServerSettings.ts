"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ServerSettings = {
    id: string;
    server_id: string;
    banned_words: string[];
    allowed_file_types: string[];
    spam_threshold: number;
    spam_window_seconds: number;
    spam_action: string;
    link_filter: boolean;
    invite_filter: boolean;
};

export function useServerSettings(serverId: string | null) {
    const [settings, setSettings] = useState<ServerSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) {
            setLoading(false);
            return;
        }

        const fetchSettings = async () => {
            const { data } = await supabase
                .from("server_settings")
                .select("*")
                .eq("server_id", serverId)
                .single();

            if (data) {
                setSettings(data as any);
            }
            setLoading(false);
        };

        fetchSettings();
    }, [serverId]);

    const checkMessage = (content: string): { allowed: boolean; reason?: string } => {
        if (!settings) return { allowed: true };

        const lowerContent = content.toLowerCase();

        if (settings.banned_words && settings.banned_words.length > 0) {
            for (const word of settings.banned_words) {
                if (lowerContent.includes(word.toLowerCase())) {
                    return { allowed: false, reason: `Contains banned word: ${word}` };
                }
            }
        }

        if (settings.link_filter) {
            const urlRegex = /https?:\/\/[^\s]+/gi;
            if (urlRegex.test(content)) {
                return { allowed: false, reason: "Links are not allowed" };
            }
        }

        if (settings.invite_filter) {
            const inviteRegex = /discord\.gg\/|discord\.com\/invite\//gi;
            if (inviteRegex.test(content)) {
                return { allowed: false, reason: "Invite links are not allowed" };
            }
        }

        return { allowed: true };
    };

    return { settings, loading, checkMessage };
}

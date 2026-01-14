"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Message = Database["public"]["Tables"]["messages"]["Row"] & {
    users: Database["public"]["Tables"]["users"]["Row"] | null;
};

export function useChat(channelId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<Database["public"]["Tables"]["users"]["Row"] | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userData } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", user.id)
                    .single();
                setCurrentUser(userData);
            }
        };
        getUser();
    }, []);

    useEffect(() => {
        if (!channelId) {
            setLoading(false);
            return;
        }

        const fetchMessages = async () => {
            setError(null);

            const { data, error: fetchError } = await supabase
                .from("messages")
                .select("*, users:sender_id(*)")
                .eq("group_id", channelId)
                .order("created_at", { ascending: true });

            if (fetchError) {
                setError(fetchError.message);
            }

            setMessages((data as any) || []);
            setLoading(false);
        };

        fetchMessages();

        const channel = supabase
            .channel(`room:${channelId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `group_id=eq.${channelId}`,
                },
                async (payload) => {
                    const newMessage = payload.new as Database["public"]["Tables"]["messages"]["Row"];

                    setMessages((prev) => {
                        const exists = prev.some((m) => m.id === newMessage.id);
                        if (exists) return prev;

                        const fetchAndUpdate = async () => {
                            const { data: user } = await supabase
                                .from("users")
                                .select("*")
                                .eq("id", newMessage.sender_id)
                                .single();

                            setMessages((current) =>
                                current.map((m) =>
                                    m.id === newMessage.id ? { ...m, users: user } : m
                                )
                            );
                        };

                        fetchAndUpdate();

                        return [...prev, { ...newMessage, users: null }];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [channelId]);

    const sendMessage = useCallback(async (content: string, senderId: string) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempId,
            content,
            sender_id: senderId,
            receiver_id: null,
            group_id: channelId,
            type: "text",
            created_at: new Date().toISOString(),
            users: currentUser,
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        const { data, error: sendError } = await supabase
            .from("messages")
            .insert({
                content,
                sender_id: senderId,
                group_id: channelId,
                type: "text",
            })
            .select()
            .single();

        if (sendError) {
            setError(sendError.message);
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
        } else if (data) {
            setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m))
            );
        }
    }, [channelId, currentUser]);

    const sendFileMessage = useCallback(async (fileUrl: string, senderId: string, fileType: string) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempId,
            content: fileUrl,
            sender_id: senderId,
            receiver_id: null,
            group_id: channelId,
            type: fileType,
            created_at: new Date().toISOString(),
            users: currentUser,
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        const { data, error: sendError } = await supabase
            .from("messages")
            .insert({
                content: fileUrl,
                sender_id: senderId,
                group_id: channelId,
                type: fileType,
            })
            .select()
            .single();

        if (sendError) {
            setError(sendError.message);
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
        } else if (data) {
            setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m))
            );
        }
    }, [channelId, currentUser]);

    return { messages, loading, error, sendMessage, sendFileMessage };
}

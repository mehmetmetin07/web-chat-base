"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Message = Database["public"]["Tables"]["messages"]["Row"] & {
    users: Database["public"]["Tables"]["users"]["Row"] | null;
};

export function useDM(otherUserId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [currentUserProfile, setCurrentUserProfile] = useState<Database["public"]["Tables"]["users"]["Row"] | null>(null);
    const [otherUserProfile, setOtherUserProfile] = useState<Database["public"]["Tables"]["users"]["Row"] | null>(null);

    // Initial Fetch & Auth
    useEffect(() => {
        const fetchUserAndMessages = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const myId = user?.id;
            setCurrentUserId(myId ?? null);

            if (!myId || !otherUserId) {
                setLoading(false);
                return;
            }

            // Fetch profiles
            const { data: profiles } = await supabase
                .from("users")
                .select("*")
                .in("id", [myId, otherUserId]);

            if (profiles) {
                const myProfile = profiles.find(u => u.id === myId) || null;
                const otherProfile = profiles.find(u => u.id === otherUserId) || null;
                setCurrentUserProfile(myProfile);
                setOtherUserProfile(otherProfile);
            }

            // Fetch messages
            const { data, error } = await supabase
                .from("messages")
                .select("*, users!messages_sender_fk(*)") // Use explicit FK if needed, or simple 'users(*)' if unambiguous
                .is("group_id", null)
                .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myId})`)
                .order("created_at", { ascending: true });

            if (!error) {
                setMessages((data as any) || []);
            }
            setLoading(false);
        };

        fetchUserAndMessages();
    }, [otherUserId]);

    // Subscription
    useEffect(() => {
        if (!otherUserId || !currentUserId) return;

        const channel = supabase
            .channel(`dm_sub_${otherUserId}`) // Unique channel name per User pair logic if needed, but client-side ID is enough
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                },
                async (payload) => {
                    const newMessage = payload.new as Database["public"]["Tables"]["messages"]["Row"];

                    // Check if relevant
                    const isRelevant =
                        (newMessage.sender_id === currentUserId && newMessage.receiver_id === otherUserId) ||
                        (newMessage.sender_id === otherUserId && newMessage.receiver_id === currentUserId);

                    if (isRelevant) {
                        setMessages((prev) => {
                            if (prev.some(m => m.id === newMessage.id)) return prev;

                            // Attach user profile synchronously
                            const senderProfile = newMessage.sender_id === currentUserId ? currentUserProfile : otherUserProfile;

                            const msgWithUser = {
                                ...newMessage,
                                users: senderProfile
                            };

                            return [...prev, msgWithUser as any];
                        });
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "messages",
                },
                (payload) => {
                    const updatedMessage = payload.new as Message;
                    setMessages((prev) => prev.map((m) =>
                        m.id === updatedMessage.id ? { ...m, ...updatedMessage, users: m.users } : m
                    ));
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "messages",
                },
                (payload) => {
                    setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
                }
            )
            .subscribe((status) => {
                console.log(`DM Subscription status for user ${otherUserId}:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [otherUserId, currentUserId, currentUserProfile, otherUserProfile]);

    const sendMessage = async (content: string, type: "text" | "image" | "file" | "video" = "text") => {
        if (!currentUserId || !otherUserId) return;

        const tempId = crypto.randomUUID();
        const optimisticMessage: Message = {
            id: tempId,
            content,
            sender_id: currentUserId,
            receiver_id: otherUserId,
            group_id: null,
            created_at: new Date().toISOString(),
            type,
            users: currentUserProfile
        };

        // Optimistic Update
        setMessages((prev) => [...prev, optimisticMessage]);

        const { data, error } = await supabase.from("messages").insert({
            content,
            sender_id: currentUserId,
            receiver_id: otherUserId,
            group_id: null,
            type,
        }).select().single();

        if (error) {
            console.error("Error sending DM:", error);
            // Rollback
            setMessages((prev) => prev.filter(m => m.id !== tempId));
        } else {
            // Replace optimistic with real
            setMessages((prev) => prev.map(m => m.id === tempId ? { ...m, ...data, users: currentUserProfile } : m));
        }
    };

    const deleteMessage = async (messageId: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        await supabase.from("messages").delete().eq("id", messageId);
    };

    return {
        messages,
        loading,
        sendMessage,
        currentUserId,
        deleteMessage,
        currentUserProfile,
        otherUserProfile
    };
}

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

            // Fetch my profile for optimistic updates
            const { data: myProfile } = await supabase
                .from("users")
                .select("*")
                .eq("id", myId)
                .single();
            setCurrentUserProfile(myProfile);

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
                    console.log("Realtime event received:", newMessage); // Debug log

                    // Check if this message belongs to this conversation
                    const isRelevant =
                        (newMessage.sender_id === currentUserId && newMessage.receiver_id === otherUserId) ||
                        (newMessage.sender_id === otherUserId && newMessage.receiver_id === currentUserId);

                    if (isRelevant) {
                        // Avoid duplicates from optimistic updates
                        setMessages((prev) => {
                            if (prev.some(m => m.id === newMessage.id)) return prev;

                            // If it's incoming (not from us), we might need to fetch user profile 
                            // if it wasn't a standard 'select' fetch.
                            // But wait, we can just append it and let the UI handle the sender info 
                            // or do a quick fetch.
                            return [...prev]; // Placeholder to trigger effect or logic below
                        });

                        // We strictly verify sender before adding fully
                        const { data: user } = await supabase
                            .from("users")
                            .select("*")
                            .eq("id", newMessage.sender_id)
                            .single();

                        setMessages((prev) => {
                            if (prev.some(m => m.id === newMessage.id)) return prev;

                            // If we don't have user, we might want to fail gracefully or use partial data
                            const msgWithUser = { ...newMessage, users: user };
                            return [...prev, msgWithUser as any];
                        });

                        // NOTIFICATION / SOUND could go here
                        if (newMessage.sender_id !== currentUserId) {
                            // playSound() or similar if requested later
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log(`DM Subscription status for user ${otherUserId}:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [otherUserId, currentUserId]);

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

    return { messages, loading, sendMessage, currentUserId };
}

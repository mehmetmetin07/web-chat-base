"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type User = Database["public"]["Tables"]["users"]["Row"];

export function useUsers(serverId?: string | null) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchServerMembers = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const myId = user?.id;
                setCurrentUserId(myId ?? null);

                if (!myId) {
                    setLoading(false);
                    return;
                }

                if (!serverId) {
                    setUsers([]);
                    setLoading(false);
                    return;
                }

                const { data: members } = await supabase
                    .from("server_members")
                    .select("user_id")
                    .eq("server_id", serverId)
                    .neq("user_id", myId);

                if (!members || members.length === 0) {
                    setUsers([]);
                    setLoading(false);
                    return;
                }

                const userIds = members.map((m) => m.user_id);

                const { data: usersData } = await supabase
                    .from("users")
                    .select("*")
                    .in("id", userIds)
                    .order("full_name", { ascending: true });

                setUsers(usersData || []);
            } catch (err) {
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchServerMembers();
    }, [serverId]);

    return { users, loading, currentUserId };
}

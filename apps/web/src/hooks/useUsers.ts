"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type User = Database["public"]["Tables"]["users"]["Row"];
type Role = Database["public"]["Tables"]["server_roles"]["Row"];

export type MemberWithRoles = User & {
    roles: Role[];
    highestRole: Role | null;
};

export function useUsers(serverId?: string | null) {
    const [users, setUsers] = useState<User[]>([]); // Keep for backward compatibility
    const [members, setMembers] = useState<MemberWithRoles[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);

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

                // Fetch current user profile
                const { data: myProfile } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", myId)
                    .single();

                if (myProfile) {
                    setCurrentUserProfile(myProfile);
                }

                if (!serverId) {
                    setUsers([]);
                    setMembers([]);
                    setLoading(false);
                    return;
                }

                // 1. Fetch server members (all of them)
                const { data: serverMembers } = await supabase
                    .from("server_members")
                    .select("user_id")
                    .eq("server_id", serverId);

                if (!serverMembers || serverMembers.length === 0) {
                    setUsers([]);
                    setMembers([]);
                    setLoading(false);
                    return;
                }

                const userIds = serverMembers.map((m) => m.user_id);

                // 2. Fetch User Details
                const { data: usersData } = await supabase
                    .from("users")
                    .select("*")
                    .in("id", userIds)
                    .order("full_name", { ascending: true });

                setUsers(usersData || []);

                // 3. Fetch Roles for these members
                const { data: memberRoles } = await supabase
                    .from("server_member_roles")
                    .select(`
                        user_id,
                        role:server_roles(*)
                    `)
                    .eq("server_id", serverId);

                // 4. Merge Data
                const enrichedMembers: MemberWithRoles[] = (usersData || []).map(user => {
                    const userRoles = memberRoles
                        ?.filter(mr => mr.user_id === user.id && mr.role)
                        .map(mr => mr.role as unknown as Role) || [];

                    // Sort roles by position (descending)
                    userRoles.sort((a, b) => b.position - a.position);

                    return {
                        ...user,
                        roles: userRoles,
                        highestRole: userRoles[0] || null
                    };
                });

                setMembers(enrichedMembers as unknown as MemberWithRoles[]);

            } catch (err) {
                console.error("Error useUsers:", err);
                setUsers([]);
                setMembers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchServerMembers();

        // Subscribe to changes (simplified: just refresh on role/member changes)
        // Subscribe to changes
        const channel = supabase
            .channel(`users_in_${serverId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${serverId}` }, () => {
                console.log("Member change detected, refreshing...");
                fetchServerMembers();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "server_member_roles", filter: `server_id=eq.${serverId}` }, () => {
                console.log("Role assignment change detected, refreshing...");
                fetchServerMembers();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "server_roles", filter: `server_id=eq.${serverId}` }, () => {
                console.log("Role definition change detected, refreshing...");
                fetchServerMembers();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
                // Optional: Refresh if user profiles change (e.g. avatar/name)
                // This might be noisy, but good for "realtime" feel.
                fetchServerMembers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [serverId]);

    return { users, members, loading, currentUserId, currentUserProfile };
}

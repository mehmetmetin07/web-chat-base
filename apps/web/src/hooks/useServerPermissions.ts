import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Permissions = {
    [key: string]: boolean;
};

export function useServerPermissions(serverId: string) {
    const [permissions, setPermissions] = useState<Permissions>({});
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        if (!serverId) return;

        const fetchPermissions = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // Check if owner
            const { data: server } = await supabase.from("servers").select("owner_id").eq("id", serverId).single();
            if (server && server.owner_id === user.id) {
                setIsOwner(true);
                setPermissions({ ADMINISTRATOR: true }); // Owner has all permissions
                setLoading(false);
                return;
            }

            // Fetch user roles
            const { data: memberRoles } = await supabase
                .from("server_member_roles")
                .select("role_id, server_roles(permissions)")
                .eq("server_id", serverId)
                .eq("user_id", user.id);

            if (memberRoles) {
                const combinedPermissions: Permissions = {};
                memberRoles.forEach((mr: any) => {
                    const rolePerms = mr.server_roles?.permissions as Permissions;
                    if (rolePerms) {
                        Object.keys(rolePerms).forEach(key => {
                            if (rolePerms[key]) combinedPermissions[key] = true;
                        });
                    }
                });
                setPermissions(combinedPermissions);
            }
            setLoading(false);
        };

        fetchPermissions();
    }, [serverId]);

    return { permissions, isOwner, loading, can: (permission: string) => isOwner || !!permissions["ADMINISTRATOR"] || !!permissions[permission] };
}

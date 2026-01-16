"use client";

import { useState } from "react";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/atoms/Button";
import { RoleModal } from "@/components/molecules/RoleModal";
import { Shield, Plus, Trash2, GripVertical, Edit2 } from "lucide-react";

type Permissions = {
    ADMINISTRATOR?: boolean;
    MANAGE_SERVER?: boolean;
    MANAGE_CHANNELS?: boolean;
    MANAGE_ROLES?: boolean;
    KICK_MEMBERS?: boolean;
    BAN_MEMBERS?: boolean;
    MODERATE_MEMBERS?: boolean;
    SEND_MESSAGES?: boolean;
};

type Role = {
    id: string;
    name: string;
    color: string | null;
    position: number;
    permissions: Permissions | null;
};

export function RoleManagement({ serverId }: { serverId: string }) {
    const { roles, loading, error, createRole, updateRole, deleteRole } = useRoles(serverId);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const handleOpenCreate = () => {
        setModalMode("create");
        setEditingRole(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (role: Role) => {
        setModalMode("edit");
        setEditingRole(role);
        setModalOpen(true);
    };

    const handleSave = async (data: { name: string; color: string; permissions: Permissions }) => {
        if (modalMode === "create") {
            await createRole(data.name, data.color, data.permissions as Record<string, boolean>);
        } else if (editingRole) {
            await updateRole(editingRole.id, {
                name: data.name,
                color: data.color,
                permissions: data.permissions as any,
            });
        }
    };

    const handleDelete = async (roleId: string, roleName: string) => {
        if (confirm(`Are you sure you want to delete the role "${roleName}"? This cannot be undone.`)) {
            await deleteRole(roleId);
        }
    };

    if (loading) return <div className="text-center py-8 text-gray-500">Loading roles...</div>;
    if (error) return <div className="text-red-500 text-center py-8">Error: {error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Roles
                </h2>
                <Button onClick={handleOpenCreate}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Role
                </Button>
            </div>

            <div className="space-y-2">
                {roles.map((role) => (
                    <div
                        key={role.id}
                        className="flex items-center gap-4 p-3 bg-white border rounded-lg shadow-sm group hover:border-blue-200 transition-colors"
                    >
                        <GripVertical className="h-5 w-5 text-gray-300 cursor-move" />

                        <div className="flex items-center gap-3 flex-1">
                            <div
                                className="h-8 w-8 rounded-full border shadow-sm flex-shrink-0"
                                style={{ backgroundColor: role.color || "#99aab5" }}
                            />
                            <div className="min-w-0">
                                <div className="font-medium truncate">{role.name}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider">
                                    {(role.permissions as Permissions)?.ADMINISTRATOR ? "Administrator" : "Role"} • Position {role.position}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                onClick={() => handleOpenEdit(role as Role)}
                                size="sm"
                                variant="ghost"
                            >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                            {role.name !== "Owner" && role.name !== "Member" && (
                                <Button
                                    onClick={() => handleDelete(role.id, role.name)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}

                {roles.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded border border-dashed">
                        No roles found. Create one to get started.
                    </div>
                )}
            </div>

            <RoleModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                mode={modalMode}
                initialData={
                    editingRole
                        ? {
                            id: editingRole.id,
                            name: editingRole.name,
                            color: editingRole.color || "#99aab5",
                            permissions: (editingRole.permissions as Permissions) || {},
                        }
                        : undefined
                }
            />
        </div>
    );
}

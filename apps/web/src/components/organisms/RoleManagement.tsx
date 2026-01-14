"use client";

import { useState } from "react";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Shield, Plus, Trash2, Save, GripVertical } from "lucide-react";

export function RoleManagement({ serverId }: { serverId: string }) {
    const { roles, loading, error, createRole, updateRole, deleteRole } = useRoles(serverId);
    const [newRoleName, setNewRoleName] = useState("");
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; color: string }>({ name: "", color: "" });

    const handleCreate = async () => {
        if (!newRoleName.trim()) return;
        await createRole(newRoleName);
        setNewRoleName("");
    };

    const startEdit = (role: any) => {
        setEditingRole(role.id);
        setEditForm({ name: role.name, color: role.color || "#99aab5" });
    };

    const handleUpdate = async () => {
        if (!editingRole) return;
        await updateRole(editingRole, { name: editForm.name, color: editForm.color });
        setEditingRole(null);
    };

    const handleDelete = async (roleId: string, roleName: string) => {
        if (confirm(`Are you sure you want to delete the role "${roleName}"? This cannot be undone.`)) {
            await deleteRole(roleId);
        }
    };

    if (loading) return <div>Loading roles...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Roles
                </h2>
                <div className="flex gap-2">
                    <Input
                        placeholder="New Role Name"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className="w-48"
                    />
                    <Button onClick={handleCreate} disabled={!newRoleName.trim()}>
                        <Plus className="h-4 w-4 mr-1" />
                        Create Role
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                {roles.map((role) => (
                    <div
                        key={role.id}
                        className="flex items-center gap-4 p-3 bg-white border rounded-lg shadow-sm group hover:border-blue-200 transition-colors"
                    >
                        <GripVertical className="h-5 w-5 text-gray-300 cursor-move" />

                        {editingRole === role.id ? (
                            <div className="flex-1 flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 mb-1 block">Role Name</label>
                                    <Input
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={editForm.color}
                                            onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                                            className="h-9 w-9 p-1 rounded border cursor-pointer"
                                        />
                                        <Input
                                            value={editForm.color}
                                            onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                                            className="w-24 font-mono text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end gap-2 h-full pb-0.5">
                                    <Button onClick={handleUpdate} size="sm" variant="primary">
                                        <Save className="h-4 w-4" />
                                    </Button>
                                    <Button onClick={() => setEditingRole(null)} size="sm" variant="ghost">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 flex-1">
                                    <div
                                        className="h-8 w-8 rounded-full border shadow-sm"
                                        style={{ backgroundColor: role.color || "#99aab5" }}
                                    />
                                    <div>
                                        <div className="font-medium">{role.name}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider">
                                            {role.permissions?.["ADMINISTRATOR"] ? "Administrator" : "Role"} • {role.position}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button onClick={() => startEdit(role)} size="sm" variant="ghost">
                                        Edit
                                    </Button>
                                    {role.name !== "Owner" && role.name !== "Member" && (
                                        <Button onClick={() => handleDelete(role.id, role.name)} size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {roles.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded border border-dashed">
                        No roles found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRoles, Role } from "@/hooks/useRoles";
import { Button } from "@/components/atoms/Button";
import { RoleModal } from "@/components/molecules/RoleModal";
import { Shield, Plus, Trash2, GripVertical, Edit2 } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// Removed local Role type definition as we are importing it from useRoles

function SortableRoleItem({ role, onEdit, onDelete }: { role: Role; onEdit: (role: Role) => void; onDelete: (id: string, name: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: role.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
        position: "relative" as "relative",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-4 p-3 bg-white border rounded-lg shadow-sm group hover:border-blue-200 transition-colors"
        >
            <div {...attributes} {...listeners} className="cursor-move p-1 text-gray-400 hover:text-gray-600">
                <GripVertical className="h-5 w-5" />
            </div>

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
                <Button onClick={() => onEdit(role)} size="sm" variant="ghost">
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                </Button>
                {role.name !== "Owner" && role.name !== "Member" && (
                    <Button
                        onClick={() => onDelete(role.id, role.name)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

export function RoleManagement({ serverId }: { serverId: string }) {
    const { roles, loading, error, createRole, updateRole, deleteRole, updateRolePositions } = useRoles(serverId);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [optimisticRoles, setOptimisticRoles] = useState<Role[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        setOptimisticRoles(roles);
    }, [roles]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            setOptimisticRoles((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Update database
                updateRolePositions(newItems);

                return newItems;
            });
        }
    };

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

    const activeRole = activeId ? optimisticRoles.find((r) => r.id === activeId) : null;

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

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={optimisticRoles.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {optimisticRoles.map((role) => (
                            <SortableRoleItem
                                key={role.id}
                                role={role}
                                onEdit={handleOpenEdit}
                                onDelete={handleDelete}
                            />
                        ))}

                        {optimisticRoles.length === 0 && (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded border border-dashed">
                                No roles found. Create one to get started.
                            </div>
                        )}
                    </div>
                </SortableContext>

                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>
                    {activeRole ? (
                        <div className="items-center gap-4 p-3 bg-white border border-blue-500 rounded-lg shadow-xl flex opacity-90">
                            <div className="p-1">
                                <GripVertical className="h-5 w-5 text-gray-600" />
                            </div>
                            <div className="flex items-center gap-3 flex-1">
                                <div
                                    className="h-8 w-8 rounded-full border shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: activeRole.color || "#99aab5" }}
                                />
                                <div className="font-medium">{activeRole.name}</div>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

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

import { useEffect, useRef } from "react";
import { Shield, UserMinus, Ban, Check } from "lucide-react";
import { Role } from "@/hooks/useRoles";

interface MemberContextMenuProps {
    position: { x: number; y: number };
    onClose: () => void;
    member: any; // Using any for now to avoid circular deps with useUsers type, can refine later
    roles: Role[];
    onAssignRole: (roleId: string) => void;
    onRemoveRole: (roleId: string) => void;
    onKick: () => void;
    onBan: () => void;
    canManageRoles: boolean;
    canKick: boolean;
    canBan: boolean;
    myRolePosition: number;
}

export function MemberContextMenu({
    position,
    onClose,
    member,
    roles,
    onAssignRole,
    onRemoveRole,
    onKick,
    onBan,
    canManageRoles,
    canKick,
    canBan,
    myRolePosition
}: MemberContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    // Prevent menu from going off-screen
    const style = {
        top: Math.min(position.y, window.innerHeight - 300),
        left: Math.min(position.x, window.innerWidth - 200),
    };

    const memberRoleIds = new Set(member.roles?.map((r: any) => r.id));

    return (
        <div
            ref={menuRef}
            style={style}
            className="fixed z-50 w-56 bg-gray-800 text-gray-200 rounded-lg shadow-xl border border-gray-700 py-1"
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="px-3 py-2 border-b border-gray-700 mb-1">
                <div className="font-semibold text-white truncate">{member.full_name}</div>
                <div className="text-xs text-gray-400 capitalize">Member Options</div>
            </div>

            {canManageRoles && roles.length > 0 && (
                <>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">Roles</div>
                    <div className="max-h-48 overflow-y-auto">
                        {roles.filter(r => r.name !== "@everyone").map((role) => {
                            const hasRole = memberRoleIds.has(role.id);
                            return (
                                <button
                                    key={role.id}
                                    disabled={role.position >= myRolePosition}
                                    onClick={() => hasRole ? onRemoveRole(role.id) : onAssignRole(role.id)}
                                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between group ${role.position >= myRolePosition ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-700"}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: role.color || "#99aab5" }}
                                        />
                                        <span className={hasRole ? "text-white" : "text-gray-400"}>
                                            {role.name}
                                        </span>
                                    </div>
                                    {hasRole && <Check className="w-3 h-3 text-green-500" />}
                                </button>
                            );
                        })}
                    </div>
                    <div className="my-1 border-b border-gray-700" />
                </>
            )}

            <div className="py-1">
                {canKick && (
                    <button
                        onClick={onKick}
                        disabled={(member.highestRole?.position || 0) >= myRolePosition}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 ${(member.highestRole?.position || 0) >= myRolePosition ? "opacity-50 cursor-not-allowed text-gray-500" : "hover:bg-red-900/50 text-red-400 hover:text-red-300"}`}
                    >
                        <UserMinus className="w-4 h-4" />
                        Kick Member
                    </button>
                )}
                {canBan && (
                    <button
                        onClick={onBan}
                        disabled={(member.highestRole?.position || 0) >= myRolePosition}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 ${(member.highestRole?.position || 0) >= myRolePosition ? "opacity-50 cursor-not-allowed text-gray-500" : "hover:bg-red-900/50 text-red-400 hover:text-red-300"}`}
                    >
                        <Ban className="w-4 h-4" />
                        Ban Member
                    </button>
                )}
                {!canKick && !canBan && !canManageRoles && (
                    <div className="px-3 py-2 text-xs text-gray-500 text-center">
                        No actions available
                    </div>
                )}
            </div>
        </div>
    );
}

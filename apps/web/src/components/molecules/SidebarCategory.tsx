"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Database } from "@/types/supabase";

// Manual type definition since types are not regenerated yet
type ChannelCategory = {
    id: string;
    server_id: string | null;
    name: string;
    position: number;
    is_collapsed: boolean;
    created_at: string;
};

interface SidebarCategoryProps {
    category: ChannelCategory;
    isCollapsed: boolean;
    onToggle: (id: string) => void;
    children: React.ReactNode;
}

export function SidebarCategory({ category, isCollapsed, onToggle, children }: SidebarCategoryProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: category.id,
        data: {
            type: "Category",
            category,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-2">
            <button
                onClick={() => onToggle(category.id)}
                {...attributes}
                {...listeners}
                className="w-full flex items-center gap-1 px-2 py-1 text-xs font-semibold uppercase text-gray-500 hover:text-gray-700 transition-colors cursor-grab active:cursor-grabbing"
            >
                {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                ) : (
                    <ChevronDown className="h-3 w-3" />
                )}
                {category.name}
            </button>
            {!isCollapsed && (
                <div className="space-y-0.5">
                    {children}
                </div>
            )}
        </div>
    );
}

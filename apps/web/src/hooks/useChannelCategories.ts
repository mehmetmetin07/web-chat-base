"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type ChannelCategory = {
    id: string;
    server_id: string;
    name: string;
    position: number;
    is_collapsed: boolean;
    created_at: string;
};

type Channel = {
    id: string;
    name: string;
    category_id: string | null;
    position: number;
};

export function useChannelCategories(serverId: string | null) {
    const [categories, setCategories] = useState<ChannelCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = useCallback(async () => {
        if (!serverId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from("channel_categories")
            .select("*")
            .eq("server_id", serverId)
            .order("position", { ascending: true });

        if (fetchError) {
            setError(fetchError.message);
            setLoading(false);
            return;
        }

        setCategories(data as ChannelCategory[]);
        setLoading(false);
    }, [serverId]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const createCategory = async (name: string): Promise<ChannelCategory | null> => {
        if (!serverId) return null;

        const maxPosition = categories.reduce((max, c) => Math.max(max, c.position), 0);

        const { data, error: insertError } = await supabase
            .from("channel_categories")
            .insert({
                server_id: serverId,
                name,
                position: maxPosition + 1,
            })
            .select()
            .single();

        if (insertError) {
            setError(insertError.message);
            return null;
        }

        const newCategory = data as ChannelCategory;
        setCategories((prev) => [...prev, newCategory]);
        return newCategory;
    };

    const updateCategory = async (categoryId: string, updates: Partial<Pick<ChannelCategory, "name" | "position" | "is_collapsed">>) => {
        await supabase.from("channel_categories").update(updates).eq("id", categoryId);
        setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, ...updates } : c)));
    };

    const deleteCategory = async (categoryId: string) => {
        await supabase.from("channel_categories").delete().eq("id", categoryId);
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    };

    const toggleCollapsed = async (categoryId: string) => {
        const category = categories.find((c) => c.id === categoryId);
        if (category) {
            await updateCategory(categoryId, { is_collapsed: !category.is_collapsed });
        }
    };

    return {
        categories,
        loading,
        error,
        createCategory,
        updateCategory,
        deleteCategory,
        toggleCollapsed,
        refetch: fetchCategories,
    };
}

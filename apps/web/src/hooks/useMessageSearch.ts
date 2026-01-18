import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SearchResult {
    id: string;
    content: string;
    created_at: string;
    channel_id: string;
    channel_name: string;
    server_id: string;
    user_id: string;
    user_full_name: string;
    user_avatar_url: string | null;
}

export function useMessageSearch() {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchMessages = async (query: string, serverId?: string, channelId?: string) => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.rpc('search_messages', {
                search_query: query,
                p_server_id: serverId || null,
                p_channel_id: channelId || null,
                limit_val: 20
            });

            if (error) throw error;
            setResults(data || []);
        } catch (err: any) {
            console.error('Search error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const clearSearch = () => {
        setResults([]);
        setError(null);
    };

    return { results, isLoading, error, searchMessages, clearSearch };
}

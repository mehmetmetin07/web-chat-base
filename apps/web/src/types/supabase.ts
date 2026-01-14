export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    username: string | null;
                    full_name: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    last_seen: string | null;
                };
                Insert: {
                    id: string;
                    email: string;
                    username?: string | null;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    last_seen?: string | null;
                };
                Update: {
                    id?: string;
                    email?: string;
                    username?: string | null;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    last_seen?: string | null;
                };
            };
            servers: {
                Row: {
                    id: string;
                    name: string;
                    owner_id: string;
                    invite_code: string;
                    image_url: string | null;
                    description: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    owner_id: string;
                    invite_code?: string;
                    image_url?: string | null;
                    description?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    owner_id?: string;
                    invite_code?: string;
                    image_url?: string | null;
                    description?: string | null;
                    created_at?: string;
                };
            };
            server_members: {
                Row: {
                    id: string;
                    server_id: string;
                    user_id: string;
                    role: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    server_id: string;
                    user_id: string;
                    role?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    server_id?: string;
                    user_id?: string;
                    role?: string;
                    created_at?: string;
                };
            };
            groups: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    owner_id: string;
                    server_id: string | null;
                    image_url: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    owner_id: string;
                    server_id?: string | null;
                    image_url?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    owner_id?: string;
                    server_id?: string | null;
                    image_url?: string | null;
                    created_at?: string;
                };
            };
            messages: {
                Row: {
                    id: string;
                    sender_id: string;
                    receiver_id: string | null;
                    group_id: string | null;
                    content: string;
                    type: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    sender_id: string;
                    receiver_id?: string | null;
                    group_id?: string | null;
                    content: string;
                    type?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    sender_id?: string;
                    receiver_id?: string | null;
                    group_id?: string | null;
                    content?: string;
                    type?: string;
                    created_at?: string;
                };
            };
        };
    };
}

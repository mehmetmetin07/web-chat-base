"use client";

import Link from "next/link";
import { DashboardLayout } from "@/components/templates/DashboardLayout";
import { useUsers } from "@/hooks/useUsers";

export default function DMListPage() {
    const { users, loading } = useUsers();

    return (
        <DashboardLayout>
            <div className="flex h-full flex-1 flex-col bg-white">
                <div className="flex h-14 items-center border-b px-4">
                    <div className="font-medium">Direct Messages</div>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                                    <div className="h-4 w-32 bg-gray-200 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-8">
                            No other users yet.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-500 mb-4">Select a user to start a conversation</p>
                            {users.map((user) => (
                                <Link
                                    key={user.id}
                                    href={`/dm/${user.id}`}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                        {user.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {user.full_name || user.email?.split("@")[0]}
                                        </div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

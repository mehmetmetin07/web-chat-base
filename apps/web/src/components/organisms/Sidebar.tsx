import Link from "next/link";
import { Home, MessageSquare, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    return (
        <div className={cn("flex h-full w-64 flex-col border-r bg-gray-50", className)}>
            <div className="flex h-14 items-center border-b px-4">
                <span className="font-semibold">Web Chat Base</span>
            </div>
            <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-2 text-sm font-medium">
                    <Link
                        href="/"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900"
                    >
                        <Home className="h-4 w-4" />
                        Home
                    </Link>
                    <Link
                        href="/channels"
                        className="flex items-center gap-3 rounded-lg bg-gray-100 px-3 py-2 text-gray-900 transition-all hover:text-gray-900"
                    >
                        <MessageSquare className="h-4 w-4" />
                        Channels
                    </Link>
                    <Link
                        href="/dm"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900"
                    >
                        <Users className="h-4 w-4" />
                        Direct Messages
                    </Link>
                    <Link
                        href="/settings"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900"
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </Link>
                </nav>
            </div>
        </div>
    );
}

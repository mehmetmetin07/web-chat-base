import { Sidebar } from "@/components/organisms/Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-100">
            <Sidebar className="hidden md:flex" />
            <main className="flex flex-1 flex-col overflow-hidden">
                {children}
            </main>
        </div>
    );
}

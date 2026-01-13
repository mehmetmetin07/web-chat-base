import { AuthForm } from "@/components/molecules/AuthForm";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <AuthForm />
            </div>
        </div>
    );
}

import { DMChatArea } from "@/components/organisms/DMChatArea";
import { DashboardLayout } from "@/components/templates/DashboardLayout";

export default function DMPage({ params }: { params: { userId: string } }) {
    return (
        <DashboardLayout>
            <DMChatArea userId={params.userId} />
        </DashboardLayout>
    );
}

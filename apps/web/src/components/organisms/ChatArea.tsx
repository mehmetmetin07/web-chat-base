import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

export function ChatArea() {
    return (
        <div className="flex h-full flex-1 flex-col bg-white">
            <div className="flex h-14 items-center justify-between border-b px-4">
                <div className="font-medium"># general</div>
                <div className="flex items-center gap-2">
                </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
                <div className="flex flex-col gap-4">
                    <div className="text-center text-sm text-gray-500">
                        Welcome to the beginning of the #general channel.
                    </div>
                </div>
            </div>
            <div className="p-4">
                <div className="flex gap-2">
                    <Input placeholder="Message #general" className="flex-1" />
                    <Button>Send</Button>
                </div>
            </div>
        </div>
    );
}

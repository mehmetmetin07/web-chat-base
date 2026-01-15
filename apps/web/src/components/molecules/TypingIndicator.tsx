"use client";

type TypingIndicatorProps = {
    typingUsers: { userId: string; username: string }[];
};

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
    if (typingUsers.length === 0) return null;

    const names = typingUsers.map((u) => u.username);
    let text = "";

    if (names.length === 1) {
        text = `${names[0]} is typing`;
    } else if (names.length === 2) {
        text = `${names[0]} and ${names[1]} are typing`;
    } else if (names.length === 3) {
        text = `${names[0]}, ${names[1]}, and ${names[2]} are typing`;
    } else {
        text = `${names.length} people are typing`;
    }

    return (
        <div className="flex items-center gap-2 px-4 py-1 text-xs text-gray-500">
            <div className="flex gap-0.5">
                <span className="animate-bounce [animation-delay:-0.3s] h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                <span className="animate-bounce [animation-delay:-0.15s] h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-gray-400"></span>
            </div>
            <span>{text}...</span>
        </div>
    );
}

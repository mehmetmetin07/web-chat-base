import { File as FileIcon, Download } from "lucide-react";

function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function FileMessage({ content, type, timestamp }: { content: string; type: string; timestamp: string }) {
    const isImage = type === "image" || content.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isVideo = type === "video" || content.match(/\.(mp4|webm|mov)$/i);

    if (isImage) {
        return (
            <div className="max-w-sm">
                <img src={content} alt="Shared image" className="rounded-lg max-h-64 object-cover" />
                <div className="flex justify-between items-center mt-1">
                    <a
                        href={content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                    >
                        <Download className="h-3 w-3" />
                        Download
                    </a>
                    <span className="text-[10px] text-gray-400">{formatTime(timestamp)}</span>
                </div>
            </div>
        );
    }

    if (isVideo) {
        return (
            <div className="max-w-sm">
                <video src={content} controls className="rounded-lg max-h-64" />
                <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-gray-400">{formatTime(timestamp)}</span>
                </div>
            </div>
        );
    }

    const fileName = content.split("/").pop() || "File";
    const displayFileName = fileName.split("-").slice(1).join("-") || fileName;

    return (
        <div>
            <a
                href={content}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100"
            >
                <FileIcon className="h-8 w-8 text-blue-500" />
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{displayFileName}</div>
                    <div className="text-xs text-gray-500">Click to download</div>
                </div>
                <Download className="h-4 w-4 text-gray-400" />
            </a>
            <div className="flex justify-end mt-1">
                <span className="text-[10px] text-gray-400">{formatTime(timestamp)}</span>
            </div>
        </div>
    );
}

"use client";

import { useVoice } from "@/providers/VoiceProvider";
import { Mic, MicOff, PhoneOff, Signal } from "lucide-react";
import { Button } from "@/components/atoms/Button";

export function VoiceConnectionBar() {
    const { activeChannelId, activeChannelName, isConnected, leaveVoiceChannel, toggleMute, isMuted } = useVoice();

    if (!activeChannelId) return null;

    return (
        <div className="bg-gray-900 border-t border-gray-800 p-2 text-white">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-green-500">
                    <Signal className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Voice Connected</span>
                </div>
                <div onClick={leaveVoiceChannel} className="cursor-pointer hover:text-red-400">
                    <PhoneOff className="w-4 h-4" />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="text-sm font-medium pl-6 truncate max-w-[120px]">
                    {activeChannelName || "Channel"}
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={toggleMute}
                        className={`p-1.5 rounded hover:bg-gray-700 ${isMuted ? 'text-red-500' : 'text-gray-300'}`}
                    >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

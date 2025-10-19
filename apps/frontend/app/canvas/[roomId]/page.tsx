"use client";

import { useState, useEffect } from "react";
import RoomCanvas from "@/components/RoomCanvas";

export default function CanvasPage({ params }:{
    params: Promise<{
        roomId: string
    }>
}){
    const [roomId, setRoomId] = useState<string>("");

    useEffect(() => {
        params.then((resolvedParams) => {
            setRoomId(resolvedParams.roomId);
        });
    }, [params]);

    if (!roomId) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div>
            <RoomCanvas roomId={roomId}></RoomCanvas>
        </div>
    );
}
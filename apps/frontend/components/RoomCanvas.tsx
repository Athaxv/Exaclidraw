"use client";

import { WS_URL } from "@/config";
import { useEffect, useState } from "react";
import { Canvas } from "./Canvas";

export default function RoomCanvas({roomId}: { roomId: string }){
    const [socket, setSocket] = useState<WebSocket | null>(null)

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlNWQ3ODUyOC03ZGQ3LTRiN2UtOTliMy0yMThmZDVjZDRiOGYiLCJlbWFpbCI6ImF0aGFydkBnbWFpbC5jb20iLCJpYXQiOjE3NTgyMTI2NjB9.oc_61o3rzYI3_ZQbBcTRUkJclRkQMBEFLfKQy5WKrSs`);

        ws.onopen = () => {
            setSocket(ws);
            const joinRoomData = JSON.stringify({
                type: "join_room",
                roomId
            });
            console.log(joinRoomData);
            ws.send(joinRoomData);
        }

    }, [])

    if (!socket){
        return <div>
            Connecting to the Server...
        </div>
    }

    return <div>
        {/* <h1>Hola, amigos</h1> */}
        <Canvas roomId={roomId} socket={socket} />
    </div>
}
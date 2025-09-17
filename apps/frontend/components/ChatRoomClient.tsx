"use client"
import { useEffect, useState } from "react"
import { useSocket } from "../../web/hooks/useSocket"

export function ChatRoomClient({
    messages,
    id
}: {
    messages: { message: string}[],
    id: string
}) {
    const [chats, setChats] = useState(messages)
    const [currentmsg, setCurrentMsg] = useState("");
    const { socket, loading } = useSocket()
    
    useEffect(() => {
        if (socket && !loading){
            socket.send(JSON.stringify({
                type: "join_room",
                roomId: id
            }))
            socket.onmessage = (event) => {
                const parsedData = JSON.parse(event.data);
                if (parsedData.type === "chat"){
                    setChats(c => [...c, {message: parsedData.message}])
                }
            }
        }
    }, [socket, loading, id])

    return <div>
        {messages.map(m => (
            <>
                <div>
            {m.message}
        </div>
            </>
        ))}
        <input type="text" placeholder="Enter your message" value={currentmsg} onChange={(e) => setCurrentMsg(e.target.value)} />
        <button onClick={() => {
            socket?.send(JSON.stringify({
                type: "chat",
                roomId: id,
                message: currentmsg
            }))
            setCurrentMsg("")
        }}>Send!</button>
    </div>
}
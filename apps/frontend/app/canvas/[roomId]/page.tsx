import RoomCanvas from "@/components/RoomCanvas"

export default async function CanvasPage({ params }:{
    params: {
        roomId: string
    }
}){
    const roomId = await params.roomId;
    return (
        <div>
            <RoomCanvas roomId={roomId}></RoomCanvas>
        </div>
    )
}
import axios from 'axios';
import React from 'react'
import { BACKEND_URL } from "@/config";
import { ChatRoom } from "@/components/ChatRoom";

interface RoomPageParams {
  params: {
    slug: string;
  };
}

async function getRoomId({ params }: RoomPageParams){
  const { slug } = params;
    try {
      const response = await axios.get(`${BACKEND_URL}/room/${slug}`)
    if (!response.data.room) {
        throw new Error("Room not found");
    }
    return response.data.room.id;
    } catch (error) {
      console.error("Error fetching the roomId", error);
      throw new Error("Failed to fetch room. Please try again later")
    }
}

async function Chat({ params }: RoomPageParams) {
    const roomId = await getRoomId({ params });
    
  return (
    <div>
      <ChatRoom id={roomId}/>
      hi, 
      
    </div>
  )
}

export default Chat
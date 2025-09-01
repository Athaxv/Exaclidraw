import { WebSocketServer } from 'ws';
import { JWT_SECRET } from '@repo/backend-common/config';
import jwt from "jsonwebtoken"
import { prismaClient } from "@repo/db/client"

const wss = new WebSocketServer({ port: 8080 });

import type { WebSocket as WsWebSocket } from 'ws';

interface User {
    ws: WsWebSocket,
    rooms: string[],
    userId: string
}

const users: User[] = []

function checkUser(token: string): string | null {
    try {
        const decode = jwt.verify(token ?? "", JWT_SECRET)

    if (typeof decode == "string"){
        return null;
    }
    // @ts-ignore   TODO
    if (!decode || !decode.userId){
        return null;
    }

    return decode.userId;
    } catch (error) {
        return null;
    }
}

wss.on("connection", function connection(ws, request){
    const url = request.url;
    if (!url){
        return;
    }
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const token = queryParams.get('token') || ""

    const authenticated = checkUser(token)

    if (authenticated == null){
        ws.close();
        return;
    }

    users.push({
        userId: authenticated,
        rooms: [],
        ws
    })

    ws.on('message', function message(data){
        const parsedData = JSON.parse(data as unknown as string)

        if (parsedData.type == "join_room"){
            const user = users.find(x => x.ws === ws)
            user?.rooms.push(parsedData.roomId)
        }

        if (parsedData.type == "leave_room"){
            const user = users.find(x => x.ws === ws)
            if (!user){
                return;
            }
            user.rooms = user?.rooms.filter(x => x === parsedData.room);
        }

        if (parsedData.type == "chat"){
            const roomId = parsedData.roomId
            const message = parsedData.message;

            await prismaClient

            users.forEach(user => {
                if (user.rooms.includes(roomId)){
                    user.ws.send(JSON.stringify({
                        type: "chat",
                        message: message,
                        roomId
                    }))
                }
            })

        }
    })

})
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

        if (typeof decode == "string") {
            return null;
        }
        // @ts-ignore   TODO
        if (!decode || !decode.userId) {
            return null;
        }

        return decode.userId;
    } catch (error) {
        return null;
    }
}

wss.on("connection", function connection(ws, request) {
    const url = request.url;
    if (!url) {
        return;
    }
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const token = queryParams.get('token') || ""

    const authenticated = checkUser(token)

    if (authenticated == null) {
        ws.close();
        return;
    }

    users.push({
        userId: authenticated,
        rooms: [],
        ws
    })

    ws.on('message', async function message(data) {
        let parsedData;
        try {
            // Convert Buffer to string if needed
            const strData = typeof data === "string" ? data : data.toString();
            parsedData = JSON.parse(strData);
        } catch (err) {
            // Invalid JSON, ignore or handle error
            console.log("Invalid message received:", data);
            return;
        }
        console.log(parsedData)
        if (!parsedData || typeof parsedData !== "object" || !parsedData.type) {
            // Invalid message structure
            return;
        }

        if (parsedData.type == "join_room") {
            const user = users.find(x => x.ws === ws)
            user?.rooms.push(parsedData.roomId)
        }

        if (parsedData.type == "leave_room") {
            const user = users.find(x => x.ws === ws)
            if (!user) {
                return;
            }
            user.rooms = user?.rooms.filter(x => x === parsedData.room);
        }

        if (parsedData.type == "chat") {
            const roomId = parsedData.roomId
            const message = parsedData.message;

            const user = users.find(x => x.ws === ws);
            const userId = user?.userId;

            if (!userId) {
                console.log("No user was found with this userId");
                return;
            }


            await prismaClient.chat.create({
                data: {
                    message,
                    userId,
                    roomId: Number(roomId)
                }
            })

            users.forEach(user => {
                if (user.rooms.includes(roomId)) {
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
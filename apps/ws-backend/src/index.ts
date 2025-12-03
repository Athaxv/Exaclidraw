import { WebSocketServer, WebSocket } from "ws";
import { JWT_SECRET } from "@repo/backend-common";
import jwt from "jsonwebtoken";
import { prismaClient } from "@repo/db";

const PORT = Number(process.env.WS_PORT ?? process.env.PORT ?? 8080);
const wss = new WebSocketServer({ port: PORT });

wss.on("listening", () => {
    console.log(`ws-backend listening on port ${PORT}`);
});

wss.on("error", (err) => {
    if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
        console.error(
            `Port ${PORT} is already in use. Set WS_PORT or stop the other process.`
        );
        process.exit(1);
    }
    throw err;
});

interface User {
    ws: WebSocket,
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
            if (user) {
                const roomId = parsedData.roomId;
                user.rooms.push(roomId);
                console.log(`User ${user.userId} joined room ${roomId}`);
                
                // Broadcast to all users in the room that someone joined
                users.forEach(targetUser => {
                    if (targetUser.rooms.includes(roomId) && targetUser.userId !== user.userId) {
                        targetUser.ws.send(JSON.stringify({
                            type: "user_joined",
                            userId: user.userId,
                            color: parsedData.cursorColor || null,
                            roomId
                        }));
                    }
                });
            }
        }

        if (parsedData.type == "leave_room") {
            const user = users.find(x => x.ws === ws)
            if (!user) {
                return;
            }
            user.rooms = user?.rooms.filter(x => x === parsedData.room);
        }

        if (parsedData.type == "chat") {
            const roomId = parsedData.roomId;
            const message = parsedData.message;

            const user = users.find(x => x.ws === ws);
            const userId = user?.userId;

            if (!userId) {
                console.log("No user was found with this userId");
                return;
            }

            const numericRoomId = Number(roomId);
            if (!Number.isFinite(numericRoomId)) {
                console.warn(`Invalid roomId "${roomId}" provided for chat message.`);
                return;
            }

            try {
                await prismaClient.chat.create({
                    data: {
                        message,
                        userId,
                        roomId: numericRoomId
                    }
                });

                users.forEach(user => {
                    if (user.rooms.includes(roomId)) {
                        user.ws.send(JSON.stringify({
                            type: "chat",
                            message: message,
                            roomId
                        }))
                    }
                });
            } catch (error) {
                console.error("Failed to persist chat payload:", error);
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Unable to persist message"
                    }));
                }
            }

        }

        if (parsedData.type == "cursor_position") {
            const roomId = parsedData.roomId
            const cursorData = parsedData.cursorData;

            const user = users.find(x => x.ws === ws);
            const userId = user?.userId;

            if (!userId) {
                console.log("No user was found with this userId");
                return;
            }

            console.log(`User ${userId} sending cursor position in room ${roomId}`);

            // Broadcast cursor position to all users in the same room (except sender)
            let broadcastCount = 0;
            users.forEach(targetUser => {
                if (targetUser.rooms.includes(roomId) && targetUser.userId !== userId) {
                    broadcastCount++;
                    targetUser.ws.send(JSON.stringify({
                        type: "cursor_position",
                        cursorData: {
                            ...cursorData,
                            userId
                        },
                        roomId
                    }))
                }
            });
            
            console.log(`Cursor position broadcasted to ${broadcastCount} users in room ${roomId}`);
        }
    })

})
import express from "express"
// Update the import path below to the correct relative or package path where your types are defined
// Update the import path below to the correct relative or package path where your types are defined
import { signinSchema, createUserSchema, createRoomSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db"
import { middleware } from "./middleware.js";
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "@repo/backend-common";
import cors from "cors";

const app = express()

app.use(express.json());
app.use(cors());

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.post('/auth/v1/signin', async function (req, res) {
    try {
        const parseddata = signinSchema.safeParse(req.body)
        if (!parseddata.success) {
            return res.json({
                message: "Incorrect input given"
            })
        }
        console.log(parseddata)
        const checkuser = await prismaClient.user.findFirst({
            where: {
                email: parseddata.data.email,
                password: parseddata.data.password
            }
        })
        if (!checkuser) {
            return res.status(401).json({
                message: 'No user exists with this email'
            })
        }
        const token = jwt.sign({ userId: checkuser?.id, email: checkuser?.email }, JWT_SECRET, { expiresIn: '7d'});
        console.log("Token", token)
        console.log(checkuser)
        // check the user

        return res.json({
            userId: token,
        })
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({
            message: 'Internal server error'
        })
    }
})

app.post('/auth/v1/signup', async function (req, res) {
    try {
        const parseddata = createUserSchema.safeParse(req.body)
        if (!parseddata.success) {
            return res.status(400).json({
                message: "Incorrect input given"
            })
        }
        
        // Check if user already exists
        const checkUser = await prismaClient.user.findFirst({
            where: {
                email: parseddata.data.email
            }
        })
        if (checkUser) {
            return res.status(409).json({ 
                message: "User already exists with this email" 
            })
        }

        const new_user = await prismaClient.user.create({
            data: {
                email: parseddata.data.email,
                password: parseddata.data.password,
                username: parseddata.data.name
            }
        })
        console.log(new_user);

        return res.status(201).json({
            message: 'User signed successfully'
        })
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({
            message: 'Internal server error'
        })
    }
})

app.get('/me',  middleware ,async function (req, res) {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({
            message: "Not Authenticated"
        })
    }

    res.status(200).json({ userId: userId});
})

app.post('/room', middleware, async (req, res) => {
    const parseddata = createRoomSchema.safeParse(req.body)
    if (!parseddata.success) {
        res.json({
            message: "Incorrect input given"
        })
        return;
    }
    try {
        const userId = req.userId;
        if (!userId) {
            return res.json({
                message: 'Provide a valid userID'
            })
        }
        const new_room = await prismaClient.room.create({
            data: {
                slug: parseddata.data.username,
                adminId: userId as string
            }
        })
        console.log(new_room)

        return res.json({
        message: new_room
    })
    }
    catch (error) {
        res.json({
            messsage: 'error creating a new room'
        })
    }
})

app.get('/chat/:roomId', async function (req, res) {
    const roomId = Number(req.params.roomId);
    const messages = await prismaClient.chat.findMany({
        where: {
            roomId: roomId
        },
        orderBy: {
            id: "desc"
        },
        take: 50
    })

    res.json({
        messages
    })
})

app.get('/room/:slug', async function (req, res) {
    const slug = req.params.slug;
    const room = await prismaClient.room.findFirst({
        where: {
            slug: slug
        }
    })

    res.json({
        room
    })
})

app.get('/rooms', middleware, async function (req, res) {
    const userId = req.userId;

    const rooms = await prismaClient.room.findMany({
        where: {
            adminId: userId
        }
    })

    res.json({
        message: rooms
    })
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
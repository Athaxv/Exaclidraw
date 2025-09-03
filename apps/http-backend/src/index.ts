import express from "express"
// Update the import path below to the correct relative or package path where your types are defined
// Update the import path below to the correct relative or package path where your types are defined
import { signinSchema, createUserSchema, createRoomSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client"
import { middleware } from "./middleware.js";

const app = express()

app.use(express.json());

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
            res.status(401).json({
                message: 'No user exists with this email'
            })
        }
        console.log(checkuser)
        // check the user

        return res.json({
            userId: checkuser
        })
    } catch (error) {
        res.json({
            message: error
        })
    }
})

app.post('/auth/v1/signup', async function (req, res) {
    const parseddata = createUserSchema.safeParse(req.body)
    if (!parseddata.success) {
        return res.json({
            message: "Incorrect input given"
        })
    }
    const new_user = await prismaClient.user.create({
        data: {
            email: parseddata.data.email,
            password: parseddata.data.password,
            username: parseddata.data.username
        }
    })
    console.log(new_user);

    return res.json({
        message: 'User logged successfully'
    })
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
        slug
    })
})

app.listen(5000)
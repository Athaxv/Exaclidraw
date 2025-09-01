import express from "express"
// Update the import path below to the correct relative path where signinSchema is defined, for example:
import signinSchema from "@repo/common/types"
import createUserSchema from "@repo/common/types"
import createRoomSchema from "@repo/common/types"
import { prismaClient } from "@repo/db/client"
// If signinSchema is not the default export, use:
// import { signinSchema } from "../../common/src/types";
const app = express()

app.use(express.json());

app.post('/auth/v1/signin', async function (req, res) {
    const parseddata = signinSchema.safeParse(req.body)
    if (!parseddata.success) {
        res.json({
            message: "Incorrect input given"
        })
    }
    const checkuser = await prismaClient.user.findFirst({
        where: {
            email: parseddata.data.emai
        }
    })
    if (!checkuser) {
        res.status(401).json({
            message: 'No user exists with this email'
        })
    }

    // check the user

    return res.json({
        message: 'User registered successfully'
    })
})

app.post('/auth/v1/signup', async function (req, res) {
    const parseddata = createUserSchema.safeParse(req.body)
    if (!parseddata.success) {
        res.json({
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


    return res.json({
        message: 'User logged successfully'
    })
})

app.post('/room', async (req, res) => {
    const parseddata = createRoomSchema.safeParse(req.body)
    if (!parseddata.success) {
        res.json({
            message: "Incorrect input given"
        })
    }
    try {
            const userId = req.userId;
            if (!userId){
                return res.json({
                    message: 'Provide a valid userID'
                })
            }
            const new_room = await prismaClient.room.create({
                data: {
                    slug: parseddata.data.name,
                    adminId: userId as string
                }
            })
        } 
        catch (error) {
            res.json({
                messsage: 'error creating a new room'
            })
        }
})

app.listen(5000)
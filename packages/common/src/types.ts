// @ts-ignore 
import { z } from "zod";

export const createUserSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(3).max(20),
    email: z.email()
})
export const signinSchema = z.object({
    email: z.email(),
    password: z.string().min(3).max(20),
})
export const createRoomSchema = z.object({
    username: z.string().min(3).max(20),
})


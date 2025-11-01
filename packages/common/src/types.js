"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoomSchema = exports.signinSchema = exports.createUserSchema = void 0;
// @ts-ignore 
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(20),
    password: zod_1.z.string().min(3).max(20),
    email: zod_1.z.email()
});
exports.signinSchema = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string().min(3).max(20),
});
exports.createRoomSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(20),
});

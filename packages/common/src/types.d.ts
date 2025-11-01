import { z } from "zod";
export declare const createUserSchema: z.ZodObject<{
    name: z.ZodString;
    password: z.ZodString;
    email: z.ZodEmail;
}, z.core.$strip>;
export declare const signinSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export declare const createRoomSchema: z.ZodObject<{
    username: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=types.d.ts.map
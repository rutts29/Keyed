import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
export declare function validateBody<T extends ZodSchema>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateQuery<T extends ZodSchema>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateParams<T extends ZodSchema>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
export declare const schemas: {
    wallet: z.ZodString;
    pagination: z.ZodObject<{
        limit: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
        cursor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        cursor?: string | undefined;
    }, {
        limit?: string | undefined;
        cursor?: string | undefined;
    }>;
    createProfile: z.ZodObject<{
        username: z.ZodString;
        bio: z.ZodOptional<z.ZodString>;
        profileImageUri: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        username: string;
        bio?: string | undefined;
        profileImageUri?: string | undefined;
    }, {
        username: string;
        bio?: string | undefined;
        profileImageUri?: string | undefined;
    }>;
    updateProfile: z.ZodObject<{
        bio: z.ZodOptional<z.ZodString>;
        profileImageUri: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        bio?: string | undefined;
        profileImageUri?: string | undefined;
    }, {
        bio?: string | undefined;
        profileImageUri?: string | undefined;
    }>;
    createPost: z.ZodObject<{
        contentUri: z.ZodString;
        contentType: z.ZodDefault<z.ZodEnum<["image", "video", "text", "multi"]>>;
        caption: z.ZodOptional<z.ZodString>;
        isTokenGated: z.ZodDefault<z.ZodBoolean>;
        requiredToken: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        contentUri: string;
        contentType: "image" | "video" | "text" | "multi";
        isTokenGated: boolean;
        caption?: string | undefined;
        requiredToken?: string | undefined;
    }, {
        contentUri: string;
        contentType?: "image" | "video" | "text" | "multi" | undefined;
        caption?: string | undefined;
        isTokenGated?: boolean | undefined;
        requiredToken?: string | undefined;
    }>;
    comment: z.ZodObject<{
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        text: string;
    }, {
        text: string;
    }>;
    tip: z.ZodObject<{
        creatorWallet: z.ZodString;
        amount: z.ZodNumber;
        postId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        creatorWallet: string;
        amount: number;
        postId?: string | undefined;
    }, {
        creatorWallet: string;
        amount: number;
        postId?: string | undefined;
    }>;
    subscribe: z.ZodObject<{
        creatorWallet: z.ZodString;
        amountPerMonth: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        creatorWallet: string;
        amountPerMonth: number;
    }, {
        creatorWallet: string;
        amountPerMonth: number;
    }>;
    withdraw: z.ZodObject<{
        amount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        amount: number;
    }, {
        amount: number;
    }>;
    semanticSearch: z.ZodObject<{
        query: z.ZodString;
        limit: z.ZodDefault<z.ZodNumber>;
        rerank: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        query: string;
        rerank: boolean;
    }, {
        query: string;
        limit?: number | undefined;
        rerank?: boolean | undefined;
    }>;
    report: z.ZodObject<{
        reason: z.ZodEnum<["nsfw", "spam", "harassment", "other"]>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        reason: "nsfw" | "spam" | "harassment" | "other";
        description?: string | undefined;
    }, {
        reason: "nsfw" | "spam" | "harassment" | "other";
        description?: string | undefined;
    }>;
    authChallenge: z.ZodObject<{
        wallet: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        wallet: string;
    }, {
        wallet: string;
    }>;
    authVerify: z.ZodObject<{
        wallet: z.ZodString;
        signature: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        wallet: string;
        signature: string;
    }, {
        wallet: string;
        signature: string;
    }>;
};
//# sourceMappingURL=validation.d.ts.map
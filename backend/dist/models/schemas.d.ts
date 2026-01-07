import { z } from 'zod';
export declare const UserProfileSchema: z.ZodObject<{
    wallet: z.ZodString;
    username: z.ZodNullable<z.ZodString>;
    bio: z.ZodNullable<z.ZodString>;
    profile_image_uri: z.ZodNullable<z.ZodString>;
    follower_count: z.ZodNumber;
    following_count: z.ZodNumber;
    post_count: z.ZodNumber;
    created_at: z.ZodNullable<z.ZodString>;
    is_verified: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    wallet: string;
    username: string | null;
    bio: string | null;
    following_count: number;
    follower_count: number;
    post_count: number;
    profile_image_uri: string | null;
    created_at: string | null;
    is_verified: boolean;
}, {
    wallet: string;
    username: string | null;
    bio: string | null;
    following_count: number;
    follower_count: number;
    post_count: number;
    profile_image_uri: string | null;
    created_at: string | null;
    is_verified: boolean;
}>;
export declare const PostSchema: z.ZodObject<{
    id: z.ZodString;
    creator_wallet: z.ZodString;
    content_uri: z.ZodString;
    content_type: z.ZodEnum<["image", "video", "text", "multi"]>;
    caption: z.ZodNullable<z.ZodString>;
    timestamp: z.ZodString;
    likes: z.ZodNumber;
    comments: z.ZodNumber;
    tips_received: z.ZodNumber;
    is_token_gated: z.ZodBoolean;
    required_token: z.ZodNullable<z.ZodString>;
    llm_description: z.ZodNullable<z.ZodString>;
    auto_tags: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    scene_type: z.ZodNullable<z.ZodString>;
    mood: z.ZodNullable<z.ZodString>;
    safety_score: z.ZodNullable<z.ZodNumber>;
    alt_text: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    caption: string | null;
    creator_wallet: string;
    mood: string | null;
    id: string;
    likes: number;
    comments: number;
    auto_tags: string[] | null;
    is_token_gated: boolean;
    required_token: string | null;
    content_uri: string;
    content_type: "image" | "video" | "text" | "multi";
    tips_received: number;
    llm_description: string | null;
    scene_type: string | null;
    safety_score: number | null;
    alt_text: string | null;
}, {
    timestamp: string;
    caption: string | null;
    creator_wallet: string;
    mood: string | null;
    id: string;
    likes: number;
    comments: number;
    auto_tags: string[] | null;
    is_token_gated: boolean;
    required_token: string | null;
    content_uri: string;
    content_type: "image" | "video" | "text" | "multi";
    tips_received: number;
    llm_description: string | null;
    scene_type: string | null;
    safety_score: number | null;
    alt_text: string | null;
}>;
export declare const CommentSchema: z.ZodObject<{
    id: z.ZodString;
    post_id: z.ZodString;
    commenter_wallet: z.ZodString;
    text: z.ZodString;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    timestamp: string;
    id: string;
    post_id: string;
    commenter_wallet: string;
}, {
    text: string;
    timestamp: string;
    id: string;
    post_id: string;
    commenter_wallet: string;
}>;
export declare const TransactionSchema: z.ZodObject<{
    signature: z.ZodString;
    type: z.ZodEnum<["tip", "subscribe", "post", "follow", "like"]>;
    from_wallet: z.ZodNullable<z.ZodString>;
    to_wallet: z.ZodNullable<z.ZodString>;
    amount: z.ZodNullable<z.ZodNumber>;
    post_id: z.ZodNullable<z.ZodString>;
    timestamp: z.ZodString;
    status: z.ZodEnum<["pending", "confirmed", "failed"]>;
}, "strip", z.ZodTypeAny, {
    type: "tip" | "subscribe" | "post" | "follow" | "like";
    status: "pending" | "confirmed" | "failed";
    timestamp: string;
    signature: string;
    amount: number | null;
    post_id: string | null;
    from_wallet: string | null;
    to_wallet: string | null;
}, {
    type: "tip" | "subscribe" | "post" | "follow" | "like";
    status: "pending" | "confirmed" | "failed";
    timestamp: string;
    signature: string;
    amount: number | null;
    post_id: string | null;
    from_wallet: string | null;
    to_wallet: string | null;
}>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Post = z.infer<typeof PostSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
//# sourceMappingURL=schemas.d.ts.map
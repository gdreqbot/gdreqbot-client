export interface User {
    userId: string;
    userName: string;
    platform?: Platform;
}

export interface Session extends User {
    secret: string;
}

export type Platform = "twitch" | "youtube";

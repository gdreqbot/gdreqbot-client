import { User } from "../structs/user";

export const defaultValues: Levels = {
    levels: []
}

export interface Levels {
    levels: LevelData[];
}

export interface LevelData {
    name: string;
    creator: string;
    id: string;
    user?: User;
    notes?: string;
}

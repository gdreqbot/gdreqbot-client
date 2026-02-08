import { User } from "../structs/user";
import { LevelData } from "./levels";

export const defaultValues: Blacklist = {
    users: [],
    levels: [],
}

export interface Blacklist {
    users: User[];
    levels: LevelData[];
}

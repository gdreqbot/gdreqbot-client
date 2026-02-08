import PermLevels from "../structs/PermLevels";

export const defaultValues: Perms = {
    perms: []
}

export interface Perms {
    perms: Perm[]
}

export interface Perm {
    cmd: string;
    perm: PermLevels;
}

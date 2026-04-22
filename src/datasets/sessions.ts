import { Session } from "../structs/user";

export const defaultValues: Sessions = {
    twitch: {
        userId: "",
        userName: "",
        secret: ""
    },
    youtube: {
        userId: "",
        userName: "",
        secret: ""
    }
}

export interface Sessions {
    twitch: Session;
    youtube: Session;
}

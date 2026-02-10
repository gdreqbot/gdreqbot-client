import { User } from "../structs/user";

export const defaultValues: Session = {
    userId: "",
    userName: "",
    secret: ""
}

export interface Session extends User {
    secret: string;
}

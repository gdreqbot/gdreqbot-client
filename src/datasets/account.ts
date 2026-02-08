import { User } from "../structs/user";

export const defaultValues: Account = {
    userId: "",
    userName: "",
    secret: ""
}

export interface Account extends User {
    secret: string;
}

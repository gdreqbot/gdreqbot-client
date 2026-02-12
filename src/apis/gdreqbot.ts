import superagent from "superagent";
import { User } from "../structs/user";
import Logger from "../modules/Logger";

export async function checkServer(logger: Logger) {
    for (let i = 0; i < 4; i++) {
        try {
            await superagent
                .get(`${process.env.URL}/health`)
                .timeout(2000);

            logger.log("Remote Server is online");
            return true;
        } catch {
            logger.log(`Waiting for remote server... (${i+1}/4)`);
            await new Promise(res => setTimeout(res, 1000));
        }
    }
    
    return false;
}

export async function getBlacklist(query: string, type: "users" | "levels"): Promise<boolean|null> {
    try {
        let res = await superagent
            .get(`${process.env.URL}/api/global-bl`)
            .set('Type', type)
            .set('Id', query);

        return res.body.text;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getUser(secret: string, version: string): Promise<User> {
    try {
        let res = await superagent
            .get(`${process.env.URL}/api/me`)
            .set('Authorization', `Bearer ${secret}`)
            .set('Version', version);

        return {
            userId: res.body.userId,
            userName: res.body.userName
        };
    } catch (e) {
        throw new APIError(e.response.body.text, e.response.body.upstream ?? null);
    }
}

class APIError extends Error {
    upstream?: string;
    
    constructor(message: string, upstream?: string) {
        super(message);

        this.upstream = upstream;
    }
}

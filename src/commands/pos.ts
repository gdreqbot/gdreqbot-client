import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import { LevelData } from "../datasets/levels";
import { Settings } from "../datasets/settings";

export = class PosCommand extends BaseCommand {
    constructor() {
        super({
            name: "pos",
            description: "Get your level's position in the queue, or a specific one",
            category: "requests",
            args: "[<query>]",
            aliases: ["p", "position"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[]): Promise<Response> {
        let levels: LevelData[] = client.db.load("levels").levels;
        let sets: Settings = client.db.load("settings");

        let query = "";
        if (args[0]) {
            query = args.join(" ");
        } else {
            let usrLvls = levels.filter(l => l.user.userId == msg.userInfo.userId); // todo: change to userId
            if (!usrLvls?.length)
                return { path: "generic.user_no_lvls" };

            query = usrLvls[0].id;
        }

        let res = client.req.getLevel(client, query);

        switch (res.status) {
            case ResCode.EMPTY:
                return { path: "generic.empty_q" };

            case ResCode.NOT_FOUND:
                return { path: "generic.not_in_q" };

            case ResCode.OK: {
                let path: string;
                if (sets.random_queue) {
                    if (args[0]) path = "pos.random.alt";
                    else path = "pos.random.base";
                } else {
                    if (args[0]) path = "pos.base.alt";
                    else path = "pos.base.base";
                }

                return {
                    path,
                    data: {
                        name: res.level.name,
                        pos: res.pos+1
                    }
                }
            }
        }
    }
}

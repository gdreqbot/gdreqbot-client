import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import { ResCode } from "../modules/Request";
import BaseCommand, { Response } from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { User } from "../structs/user";

export = class NextCommand extends BaseCommand {
    constructor() {
        super({
            name: "next",
            description: "Shifts the queue",
            category: "requests",
            aliases: ["n", "skip"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true,
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { auto: boolean, silent: boolean }): Promise<Response> {
        //if (!opts.auto) {
        //    let updateUsers: User[] = updatedb.get("updateUsers");
        //    let updateUser: User = updateUsers.find((u: User) => u.userId == msg.userInfo.userId);
        //    if (!updateUser) {
        //        await `Hey! There is a requests dashboard now: ${process.env.URL}/dashboard || You can still use commands if you wish (this message won't appear anymore)`;
        //        updateUsers.push({ userId: msg.channelId, userName: channel });
        //        await updatedb.set("updateUsers", updateUsers);
        //        client.logger.log(`Update note sent in channel: ${channel}`);
        //        return;
        //    }
        //}

        let res = await client.req.next(client);

        switch (res.status) {
            case ResCode.EMPTY:
                if (!opts.silent && !opts.auto) return { path: "generic.empty_q" };


            case ResCode.ERROR:
                return { path: "generic.error" };

            case ResCode.OK:
                let path = res.random ? "next.random" : "next.base";

                if (!opts.silent)
                    return {
                        path,
                        data: {
                            name: res.level.name,
                            id: res.level.id,
                            creator: res.level.creator
                        }
                    }
        }
    }
}

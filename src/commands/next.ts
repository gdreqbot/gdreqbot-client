import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import { ResCode } from "../modules/Request";
import BaseCommand from "../structs/BaseCommand";
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

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { auto: boolean, silent: boolean }): Promise<string> {
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
                if (!opts.silent && !opts.auto) return "Kappa The queue is empty.";


            case ResCode.ERROR:
                return "An error occurred.";

            case ResCode.OK:
                if (!opts.silent) return `PogChamp Next ${res.random ? "random " : ""}level: '${res.level.name}' (${res.level.id}) by ${res.level.creator}`;
        }
    }
}

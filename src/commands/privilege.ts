import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class PrivilegeCommand extends BaseCommand {
    constructor() {
        super({
            name: "privilege",
            description: "Run a command in privilege mode for those supporting it (type !pr help <command> for info)",
            args: "<command>",
            aliases: ["pr", "prm", "prmode"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { userPerms: PermLevels, auto: boolean, silent: boolean }): Promise<Response> {
        if (!args.length)
            return { path: "privilege.no_cmd" };

        let newArgs = args.join(" ").trim().split(/ +/);
        let cmdName = newArgs.shift().toLowerCase();

        let cmd = client.commands.get(cmdName)
            || client.commands.values().find(c => c.config.aliases?.includes(cmdName));

        if (!cmd || !cmd.config.enabled || cmd.config.permLevel > opts.userPerms) return;
        if (!cmd.config.supportsPrivilege)
            return { path: "privilege.no_support" };

        if (!cmd.config.supportsSilent && opts.silent) return;

        try {
            client.logger.log(`(auto) Running command: ${cmd.info.name} in channel: ${channel} in privilege mode`);
            let res = await cmd.run(client, msg, channel, newArgs, {
                userPerms: opts.userPerms,
                auto: opts.auto,
                silent: opts.silent,
                privilegeMode: true
            });

            if (res) return res;
        } catch (e) {
            console.error(e);
            return { path: "generic.error" };
        }
    }
}

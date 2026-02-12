import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { Perm } from "../datasets/perms";
import { Settings } from "../datasets/settings";

export = class HelpCommand extends BaseCommand {
    constructor() {
        super({
            name: "help",
            description: "Lists commands",
            privilegeDesc: "Lists commands that support privilege mode",
            args: "[<command>]",
            privilegeArgs: "[<command>]",
            aliases: ["h", "?", "commands", "cmd"],
            enabled: true,
            supportsPrivilege: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { userPerms: PermLevels, privilegeMode: boolean }): Promise<Response> {
        let cmd = client.commands.get(args[0])
            || client.commands.values().find(c => c.config.aliases.includes(args[0]));

        if (args[0] && !cmd)
            return { path: "help.not_found" };

        let sets: Settings = client.db.load("settings", );

        if (opts.privilegeMode) {
            if (cmd) {
                if (!cmd.config.supportsPrivilege)
                    return { path: "help.no_pr" };

                return {
                    path: "help.cmd.pr",
                    data: {
                        prefix: sets.prefix ?? client.config.prefix,
                        name: cmd.info.name,
                        desc: sets.prefix ? cmd.info.privilegeDesc.replace(client.config.prefix, sets.prefix) : cmd.info.privilegeDesc,
                        args: cmd.info.privilegeArgs ? `${sets.prefix ?? client.config.prefix}pr ${cmd.info.name} ${cmd.info.privilegeArgs}` : "none"
                    }
                }
            } else {
                return {
                    path: "help.list.pr",
                    data: {
                        prefix: sets.prefix ?? client.config.prefix,
                        list: client.commands.values().filter(c => c.config.supportsPrivilege).map(c => `${sets.prefix?? client.config.prefix}pr ${c.info.name}`).toArray().join(sets.prefix == "-" ? " | " : " - ")
                    }
                }
            }
        } else {
            let perms: Perm[] = client.db.load("perms").perms;

            if (cmd) {
                let customPerm = perms?.find(p => p.cmd == cmd.info.name);

                return {
                    path: "help.cmd.base",
                    data: {
                        prefix: sets.prefix ?? client.config.prefix,
                        name: cmd.info.name,
                        desc: sets.prefix ? cmd.info.description.replace(client.config.prefix, sets.prefix) : cmd.info.description,
                        args: cmd.info.args ? `${sets.prefix ?? client.config.prefix}pr ${cmd.info.name} ${cmd.info.args}` : "none",
                        aliases: cmd.config.aliases?.join(", ") || "none",
                        perm: PermLevels[customPerm?.perm || cmd.config.permLevel]
                    }
                }
            } else {
                return {
                    path: "help.list.base",
                    data: {
                        prefix: sets.prefix ?? client.config.prefix,
                        list: client.commands.values().filter(c => (perms?.find(p => p.cmd == c.info.name)?.perm || c.config.permLevel) <= opts.userPerms).map(c => `${sets.prefix ?? client.config.prefix}${c.info.name}`).toArray().join(sets.prefix == "-" ? " | " : " - ")
                    }
                }
            }
        }
    }
}

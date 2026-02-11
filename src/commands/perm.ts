import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { Perm } from "../datasets/perms";
import { Settings } from "../datasets/settings";

export = class PermCommand extends BaseCommand {
    constructor() {
        super({
            name: "perm",
            description: "View your permission level",
            privilegeDesc: "Set required perms for a command",
            privilegeArgs: "set|reset <command> [<perm>]",
            aliases: ["permission", "permissions"],
            enabled: true,
            permLevel: PermLevels.BLACKLISTED,
            supportsPrivilege: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { userPerms: PermLevels, privilegeMode: boolean }): Promise<Response> {
        if (!opts.privilegeMode)
            return { path: "perm.base", data: { perm: PermLevels[opts.userPerms] } };

        if (!args.length || (!["set", "reset"].includes(args[0]))) return { path: "perm.invalid_action" };
        if (!args[1]) return { path: "perm.no_cmd" };
        let cmd = client.commands.get(args[1])
            || client.commands.values().find(c => c.config.aliases?.includes(args[1]));

        if (!cmd) return { path: "perm.not_found" };

        let perms: Perm[] = client.db.load("perms", ).perms;
        let customPerms = perms.find(p => p.cmd == cmd.info.name);
        if ((customPerms?.perm || cmd.config.permLevel) > opts.userPerms) return { path: "perm.unauthorized_cmd" };

        let sets: Settings = client.db.load("settings", );

        switch (args[0]) {
            case "set": {
                if (!args[2]) return { path: "perm.no_perm", data: { perms: Object.keys(PermLevels).filter(k => isNaN(Number(k))).join(" | ") } };

                let perm = args[2].toUpperCase();
                if (!Object.keys(PermLevels).includes(perm)) return { path: "perm.invalid_perm", data: { perms: Object.keys(PermLevels).filter(k => isNaN(Number(k))).join(" | ") } };

                let value: PermLevels = (PermLevels as any)[perm];
                if (value > opts.userPerms) return { path: "perm.unauthorized_perm" };
                
                if (customPerms) {
                    customPerms.perm = value;
                } else {
                    perms.push({
                        cmd: cmd.info.name,
                        perm: value
                    });
                }

                await client.db.save("perms", { perms });
                return {
                    path: "perm.set",
                    data: {
                        prefix: sets.prefix ?? client.config.prefix,
                        cmd: cmd.info.name,
                        perm
                    }
                }
            }

            case "reset": {
                if (customPerms) {
                    perms.splice(perms.findIndex(p => p.cmd == cmd.info.name), 1);
                    await client.db.save("perms", { perms });
                }

                return {
                    path: "perm.reset",
                    data: {
                        prefix: sets.prefix ?? client.config.prefix,
                        cmd: cmd.info.name,
                        perm: PermLevels[cmd.config.permLevel]
                    }
                }
            }
        }
    }
}

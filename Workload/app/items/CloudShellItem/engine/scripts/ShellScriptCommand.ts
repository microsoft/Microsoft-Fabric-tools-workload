import { Script } from "../../CloudShellItemModel";
import { ScriptCommandContext } from "./IScriptCommand";
import { BaseScriptCommand } from "./BaseScriptCommand";

/**
 * Command for executing Shell scripts wrapped in Python subprocess
 */
export class ShellScriptCommand extends BaseScriptCommand {
    protected async getPythonWrapperContent(script: Script, context: ScriptCommandContext): Promise<string> {
        throw new Error("Method not implemented.");
    }
}

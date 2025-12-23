import { Script } from "../../CloudShellItemModel";
import { ScriptCommandContext } from "./IScriptCommand";
import { BaseScriptCommand } from "./BaseScriptCommand";

/**
 * Command for executing Python scripts as Spark batch jobs.
 * 
 * Executes Python code directly in Spark without additional wrapping.
 * Script content is uploaded to OneLake as-is and executed by Spark.
 * 
 * Parameters are available via Spark configuration:
 * - spark.conf.get("spark.script.param.{name}")
 * 
 * Use this for:
 * - PySpark data processing scripts
 * - Spark DataFrame operations
 * - Native Python code execution in Spark context
 */
export class PythonScriptCommand extends BaseScriptCommand {

    /**
     * Returns script content without modification.
     * Python code is executed directly by Spark.
     * 
     * @param script Script with Python content
     * @param context Execution context (unused)
     * @returns Promise resolving to script content as-is
     */
    protected async getPythonWrapperContent(script: Script, context: ScriptCommandContext): Promise<string> {
        return script.content;
    }

}

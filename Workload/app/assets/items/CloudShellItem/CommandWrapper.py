import os
import subprocess;
import json;


fabToken = "REPLACE_WITH_FAB_TOKEN"
fabTokenOnelake = "REPLACE_WITH_FAB_TOKEN_ONELAKE"
fabTokenAzure = "REPLACE_WITH_AZURE_TOKEN"

if fabToken and fabTokenOnelake: # and fabTokenAzure:
    os.environ["FAB_TOKEN"] = fabToken
    os.environ["FAB_TOKEN_ONELAKE"] = fabTokenOnelake   
    #os.environ["FAB_TOKEN_AZURE"] = fabTokenAzure
    
# Command to be executed
command = "REPLACE_WITH_COMMAND"

# Execute the command using subprocess
result = subprocess.run(command, shell=True, capture_output=True, text=True)
jsonResult = {"returncode": result.returncode, "stdout": result.stdout.strip(), "stderr": result.stderr.strip()}
print(json.dumps(jsonResult))
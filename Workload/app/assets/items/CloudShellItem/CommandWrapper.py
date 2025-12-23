import os
import subprocess;
import json;

fullCommand = "REPLACE_WITH_COMMAND"

result = subprocess.run(fullCommand, shell=True, capture_output=True, text=True)
jsonResult = {"returncode": result.returncode, "stdout": result.stdout.strip(), "stderr": result.stderr.strip()}
print(json.dumps(jsonResult))
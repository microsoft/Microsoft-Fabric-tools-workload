####################################################
# FabCliCheckWrapper.py
# Wrapper script to check Fabric CLI installation in a Spark environment.
####################################################

import subprocess;
import json;

result = subprocess.run("fab --version", shell=True, capture_output=True, text=True);
jsonResult = {"returncode": result.returncode, "stdout": result.stdout.strip(), "stderr": result.stderr.strip()};
print(json.dumps(jsonResult));
import subprocess
import sys
import os
import json

from pyspark.sql import SparkSession

# Initialize Spark session
spark = SparkSession.builder.appName("CloudShellScript").getOrCreate()

# Access script parameters from Spark configuration
# Parameters are passed as spark.script.param.<parameter_name>
def get_parameter(param_name, default_value=""):
    """Get a parameter value from Spark configuration."""
    conf_key = f"spark.script.param.{param_name}"
    return spark.conf.get(conf_key, default_value)


def run_fab_cli_commands(cmd):
    """Run Fabric CLI commands with appropriate authentication."""
    print(f"fab {cmd}")
    result = subprocess.run(f"fab {cmd}", shell=True, capture_output=True, text=True)
    print("\n" + result.stdout)
    if result.stderr:
        print("\n" + result.stderr, file=sys.stderr)
    if result.returncode != 0:
        print(f"\nCommand failed with exit code {result.returncode}")
        sys.exit(result.returncode)

# Set up authentication for Fabric CLI
if(get_parameter("fabCLIAuthInfo")):
    fabCLIAuthInfo = json.loads(get_parameter("fabCLIAuthInfo"))
    # Set environment variables for Fabric CLI authentication
    if fabCLIAuthInfo.get("oboToken") and fabCLIAuthInfo.get("oboTokenOnelake") and fabCLIAuthInfo.get("oboTokenAzure"):
        os.environ["FAB_TOKEN"] = fabCLIAuthInfo.get("oboToken", "")
        os.environ["FAB_TOKEN_ONELAKE"] = fabCLIAuthInfo.get("oboTokenOnelake", "")
        os.environ["FAB_TOKEN_AZURE"] = fabCLIAuthInfo.get("oboTokenAzure", "")
    elif fabCLIAuthInfo.get("clientId") and fabCLIAuthInfo.get("clientSecret") and fabCLIAuthInfo.get("tenantId"):
        # Service principal authentication
        clientId = fabCLIAuthInfo.get("clientId")
        clientSecret = fabCLIAuthInfo.get("clientSecret")
        tenantId = fabCLIAuthInfo.get("tentantId")
        run_fab_cli_commands(f"auth login -u {clientId} -p {clientSecret} --tenant {tenantId}")


# Run Fabric CLI commands passed as parameter
commands = json.loads(get_parameter("commands", "[]"))

for cmd in commands:
    run_fab_cli_commands(cmd)
      
print("All Fabric CLI commands executed successfully")

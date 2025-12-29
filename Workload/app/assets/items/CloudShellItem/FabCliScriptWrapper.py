####################################################
# FabCliScriptWrapper.py
# Wrapper script to run Fabric CLI commands with authentication in a Spark environment.
####################################################

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
    print(f"fab {cmd}", flush=True)
    
    # Run command without capturing output - let it stream directly to stdout/stderr
    result = subprocess.run(f"fab {cmd}", shell=True)
    
    if result.returncode != 0:
        print(f"\nCommand failed with exit code {result.returncode}", flush=True)
        sys.exit(result.returncode)


####################################################
# Logic starts here
####################################################
printParameters = get_parameter("sys.printParameters", "false").lower() == "true"
if(printParameters):
    # Print all parameters
    print("Script parameters:")
    try:
        all_conf = spark.sparkContext.getConf().getAll()
        for key, value in all_conf:
            if key.startswith("spark.script.param.") and not key.startswith("spark.script.param.sys"):
                print(f"  {key[len('spark.script.param.'):]}: {value}")
    except Exception as e:
        print(f"Warning: Could not retrieve all parameters: {e}")   


# Set up authentication for Fabric CLI
fabCLIAuthInfo = get_parameter("sys.fabCLIAuthInfo")
if fabCLIAuthInfo:
    print("Configuring Fabric CLI authentication...")
    authConfig = json.loads(fabCLIAuthInfo)
    
    # OBO token authentication
    if authConfig.get("obo"):
        print("Setting up OBO token authentication...")
        obo = authConfig.get("obo")
        
        if obo.get("token"):
            os.environ["FAB_TOKEN"] = obo.get("token", "")
            print(f"FAB_TOKEN set: {len(obo.get('token', ''))} characters")
        
        if obo.get("tokenOnelake"):
            os.environ["FAB_TOKEN_ONELAKE"] = obo.get("tokenOnelake", "")
            print(f"FAB_TOKEN_ONELAKE set: {len(obo.get('tokenOnelake', ''))} characters")
        
        if obo.get("tokenAzure"):
            os.environ["FAB_TOKEN_AZURE"] = obo.get("tokenAzure", "")
            print(f"FAB_TOKEN_AZURE set: {len(obo.get('tokenAzure', ''))} characters")
    
    # Service principal authentication
    elif authConfig.get("client"):
        print("Using service principal authentication...")
        client = authConfig.get("client")
        clientId = client.get("clientId")
        clientSecret = client.get("clientSecret")
        tenantId = client.get("tenantId")
        
        if clientId and clientSecret and tenantId:
            run_fab_cli_commands(f"auth login -u {clientId} -p {clientSecret} --tenant {tenantId}")
        else:
            print("Warning: Incomplete client credentials in fabCLIAuthInfo")
    else:
        print("Warning: No valid authentication configuration found in fabCLIAuthInfo")
else:
    print("Warning: No fabCLIAuthInfo parameter provided")



# Run Fabric CLI commands passed as parameter
commands = json.loads(get_parameter("sys.commands", "[]"))

for cmd in commands:
    run_fab_cli_commands(cmd)
      
print("All Fabric CLI commands executed successfully")

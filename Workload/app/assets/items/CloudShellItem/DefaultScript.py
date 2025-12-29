"""
Default Python Script Template
This script demonstrates how to access parameters and use PySpark in Fabric.
"""

from pyspark.sql import SparkSession

# Initialize Spark session
spark = SparkSession.builder.appName("CloudShellScript").getOrCreate()

# Access script parameters from Spark configuration
# Parameters are passed as spark.script.param.<parameter_name>
def get_parameter(param_name, default_value=""):
    """Get a parameter value from Spark configuration."""
    conf_key = f"spark.script.param.{param_name}"
    return spark.conf.get(conf_key, default_value)

# Your script logic here
print("Script started successfully!")
print(f"Spark version: {spark.version}")


# Example: Read parameters
# Accessing a (system) parameter
print(f"Workspace ID: {get_parameter('WORKSPACE_ID')}")
print(f"Item ID: {get_parameter('ITEM_ID')}")

# Add your parameters in the Scripts panel and they will be available here
# param_key = "myParameter"
# param_value = get_parameter(param_key, "default_value")
# print("Parameter " + param_key + ": " + param_value)

# Example: Create a simple DataFrame
data = [
    ("Alice", 34),
    ("Bob", 45),
    ("Charlie", 29)
]
columns = ["Name", "Age"]
df = spark.createDataFrame(data, columns)

print("Sample DataFrame:")
df.show()

# Add your data processing logic here

print("Script completed successfully!")

# Stop Spark session
spark.stop()

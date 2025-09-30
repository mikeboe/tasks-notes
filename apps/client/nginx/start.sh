#!/bin/bash

cd /app

# Check if env.example exists
if [[ ! -f .env.example ]]; then
  echo "env.example file not found!"
  exit 1
fi

echo "Reading keys from env.example and fetching their values from the environment..."

# Initialize an empty JSON string
JSON_STRING="{"

# Read each line from env.example
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip empty lines and comments
  if [[ -z "$line" ]] || [[ "$line" =~ ^# ]]; then
    continue
  fi

  # Extract the key (remove '=' and any trailing spaces)
  KEY=$(echo "$line" | sed 's/=.*//')
  echo "Processing key: $KEY"

  # Retrieve the corresponding value from the environment
  VALUE=$(eval echo \${$KEY})

  # Log the fetched value or a message if not set
  if [[ -n "$VALUE" ]]; then
    echo "Found value for $KEY: $VALUE"
  else
    echo "No value found for $KEY, defaulting to empty string"
  fi

  # Ensure the key has a value; if not, assign an empty string
  VALUE=${VALUE:-""}
  echo "Final value: $VALUE"


  # Escape forward slashes in the value
  ESCAPED_VALUE=$(echo "$VALUE" | sed 's/\//\\\//g')
  echo "Escaped value: $ESCAPED_VALUE"

  # Append the key-value pair to the JSON string
  JSON_STRING="${JSON_STRING}\"${KEY}\":\"${ESCAPED_VALUE}\","
done < .env.example

# Remove the trailing comma and close the JSON string
JSON_STRING="${JSON_STRING%,}}"

echo "Constructed JSON string: $JSON_STRING"
# Replace the placeholder in index.html
sed -i.bak "s/\"import_meta_env_placeholder\"/$JSON_STRING/" ./build/index.html

echo "Placeholder in index.html has been replaced with the environment variables."


cd /app/build
nginx -g "daemon off;"
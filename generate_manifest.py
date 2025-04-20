import os
import json

DATA_DIR = 'data'
MANIFEST_FILE = 'manifest.json'

def generate_manifest():
    video_ids = []
    try:
        # List files in the data directory
        for filename in os.listdir(DATA_DIR):
            # Check if it's a JSON file
            if filename.endswith('.json'):
                # Extract the video ID (filename without .json)
                video_id = filename[:-5] # Remove the last 5 characters (".json")
                video_ids.append(video_id)

        # Sort the IDs alphabetically for consistency
        video_ids.sort()

        # Write the list to the manifest file
        with open(MANIFEST_FILE, 'w') as f:
            json.dump(video_ids, f, indent=2) # Use indent for readability (optional)

        print(f"Successfully generated '{MANIFEST_FILE}' with {len(video_ids)} video IDs.")

    except FileNotFoundError:
        print(f"Error: Data directory '{DATA_DIR}' not found.")
        print("Make sure you are running this script from the root of your project directory.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    generate_manifest()
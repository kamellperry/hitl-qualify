import os
import json

import sys
from pathlib import Path

SUCCESS_DATA_FILE = "aggregated_profiles.json"
ERROR_DATA_FILE = "unparsed_profiles.json"

# Add the project root to the path to access modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Define paths
data_dir = Path(__file__).resolve().parent.parent / "data"
db_dir = data_dir / "db"
comments_path = db_dir / "comments.json"
aggregated_profiles_path = db_dir / "parsed_profiles" / SUCCESS_DATA_FILE
unparsed_profiles_path = db_dir / "parsed_profiles" / ERROR_DATA_FILE

# Load comments data
with open(comments_path, "r", encoding="utf-8") as f:
    comments = json.load(f)

# Load aggregated profiles data
with open(aggregated_profiles_path, "r", encoding="utf-8") as f:
    profiles = json.load(f)

# Extract usernames from profiles
parsed_usernames = set(profile["username"] for profile in profiles)

# Find usernames in comments that aren't in profiles
unparsed_profiles = []
for comment in comments:
    username = comment.get("username")
    if username and username not in parsed_usernames:
        unparsed_profiles.append(
            {"username": username, "profileUrl": comment.get("profileUrl", "")}
        )

# Remove duplicates by converting to a dictionary with username as key
unique_unparsed = {}
for profile in unparsed_profiles:
    username = profile["username"]
    if username not in unique_unparsed:
        unique_unparsed[username] = profile

# Convert back to list
unparsed_profiles_list = list(unique_unparsed.values())

# Save unparsed profiles to file
os.makedirs(os.path.dirname(unparsed_profiles_path), exist_ok=True)
with open(unparsed_profiles_path, "w", encoding="utf-8") as f:
    json.dump(unparsed_profiles_list, f, indent=2)

print(
    f"Found {len(unparsed_profiles_list)} unparsed profiles out of {len(comments)} comments"
)

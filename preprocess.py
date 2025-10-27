import json

INPUT_FILE = "INPUT.json"
OUTPUT_FILE = "scrape_data.json"

with open(INPUT_FILE, "r") as f:
    data = json.load(f)

output_list = []
for item in data:
    username = item.get("username", "")
    profile_url = f"https://www.instagram.com/{username}/"
    output_list.append({"username": username, "profileURL": profile_url})

with open(OUTPUT_FILE, "w") as f:
    json.dump(output_list, f, indent=2)

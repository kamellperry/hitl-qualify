# scrape_followers/classify_profiles.py
import json
import os
import sys
import time
import webbrowser
from pathlib import Path

import readchar

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DIST_DIR = PROJECT_ROOT / "dist"

INPUT_FILE = DIST_DIR / "scrape_data.json"
OUTPUT_FILE = DIST_DIR / "classified_data.json"


def load_data(filepath):
    """Loads JSON data from a file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file not found at {filepath}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {filepath}")
        sys.exit(1)


def save_classified_data(filepath, data):
    """Saves classified data to a JSON file."""
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
    except IOError as e:
        print(f"Error saving data to {filepath}: {e}")


def display_status(current, total, yes, no, maybe, qualified):
    print('\033[2J\033[H', end='')  # Clear screen and move cursor to home
    print(f"Classification Progress: {current}/{total}")
    print(f"Yes: {yes}, No: {no}, Maybe: {maybe}, Qualified: {qualified}")
    print("-" * 40)


def main():
    profiles = load_data(INPUT_FILE)
    classified_profiles = []
    processed_urls = set()
    yes_count = 0
    no_count = 0
    maybe_count = 0
    qualified_count = 0

    # Load existing classifications if output file exists to resume
    if os.path.exists(OUTPUT_FILE):
        print(f"Resuming from existing output file: {OUTPUT_FILE}")
        classified_profiles = load_data(OUTPUT_FILE)
        processed_urls = {
            p["profileURL"] for p in classified_profiles if "profileURL" in p
        }
        print(f"Loaded {len(classified_profiles)} previously classified profiles.")
        for p in classified_profiles:
            if p.get("classification") == "yes":
                yes_count += 1
            elif p.get("classification") == "no":
                no_count += 1
            elif p.get("classification") == "maybe":
                maybe_count += 1
            if p.get("classification") in ["yes", "maybe"]:
                qualified_count += 1

    profiles_to_classify = [
        p for p in profiles if p.get("profileURL") not in processed_urls
    ]

    if not profiles_to_classify:
        print("All profiles from the input file have already been classified.")
        return

    print(f"\nStarting classification. Total to classify: {len(profiles_to_classify)}")
    print(
        "--> Right Arrow (Yes), <-- Left Arrow (No), ^ Up Arrow (Maybe), 's' (Save & Stop)"
    )

    try:
        for i, profile in enumerate(profiles_to_classify):
            display_status(len(classified_profiles) + 1, len(profiles), yes_count, no_count, maybe_count, qualified_count)
            profile_url = profile.get("profileURL")
            profile_username = profile.get("username")
            profile_text = profile.get("profileText", profile_username).replace(
                "\n", " | "
            )

            if not profile_url:
                print(f"Skipping profile {i + 1} due to missing URL: {profile_text}")
                continue

            print(f"\n--- Profile {len(classified_profiles) + 1} / {len(profiles)} ---")
            print(f"Text: {profile_text}")
            print(f"URL: {profile_url}")

            # Open in browser
            webbrowser.open_new_tab(profile_url)
            time.sleep(0.5)
            os.system('osascript -e \'tell application "Ghostty" to activate\'')

            print("Your choice? ", end="", flush=True)

            while True:
                key = readchar.readkey()

                if key == readchar.key.RIGHT:
                    decision = "y"
                    print("Yes")
                    break
                elif key == readchar.key.LEFT:
                    decision = "n"
                    print("No")
                    break
                elif key == readchar.key.UP:
                    decision = "m"
                    print("Maybe")
                    break
                elif key.lower() == "s":
                    decision = "s"
                    print("Save & Stop")
                    break
                elif key == readchar.key.CTRL_C:
                    raise KeyboardInterrupt
                else:
                    pass

            if decision == "s":
                print("Stopping and saving progress...")
                save_classified_data(OUTPUT_FILE, classified_profiles)
                print(
                    f"Progress saved to {OUTPUT_FILE}. Run the script again to resume."
                )
                sys.exit(0)
            elif decision == "y":
                profile["classification"] = "yes"
                yes_count += 1
                qualified_count += 1
            elif decision == "n":
                profile["classification"] = "no"
                no_count += 1
            elif decision == "m":
                profile["classification"] = "maybe"
                maybe_count += 1
                qualified_count += 1

            classified_profiles.append(profile)

            # Save progress periodically (e.g., every 5 classifications)
            if (i + 1) % 5 == 0:
                print("Saving intermediate progress...")
                save_classified_data(OUTPUT_FILE, classified_profiles)

    except KeyboardInterrupt:
        print("\nKeyboard interrupt detected. Saving progress...")
    finally:
        # Ensure final save on exit or completion
        print("Saving final classifications...")
        save_classified_data(OUTPUT_FILE, classified_profiles)
        print(f"Classification complete. All data saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

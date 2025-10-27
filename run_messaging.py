# scrape_followers/run_messaging.py
import json
import webbrowser
import os
import sys
import readchar
import random
import re
import pyperclip  # Added for clipboard functionality

# Stef

PROFILE_DATA_FILE = "vy_test.json"
MESSAGE_TEMPLATE_FILE = "default.db.json"
# We will update PROFILE_DATA_FILE in place


def load_json_data(filepath):
    """Loads JSON data from a file."""
    if not os.path.exists(filepath):
        print(f"Error: Input file not found at {filepath}", file=sys.stderr)
        return None
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading or parsing {filepath}: {e}", file=sys.stderr)
        return None


def save_profile_data(filepath, data_list):
    """Saves profile data (list of dicts) to a JSON file."""
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data_list, f, indent=4, ensure_ascii=False)
    except IOError as e:
        print(f"Error saving data to {filepath}: {e}", file=sys.stderr)
    except Exception as e:
        print(f"An unexpected error occurred during saving: {e}", file=sys.stderr)


def format_name(name_str: str) -> str:
    """Capitalizes the first letter and lowercases the rest."""
    if not name_str:
        return ""
    return name_str[0].upper() + name_str[1:].lower()


def get_personalized_name(profile: dict) -> str:
    """Extracts and formats the best possible name for personalization."""
    name_to_use = ""
    try:
        name_info = profile.get("processed_data", {}).get("name_info", {})
        parsed_names = name_info.get("parsed_name", [])
        raw_name = name_info.get("raw_name", "")

        # Priority 1: First name from parsed_name list
        if parsed_names:
            name_to_use = parsed_names[0].split()[
                0
            ]  # Take first word of first parsed name

        # Priority 2: Fallback to cleaned raw_name
        elif raw_name:
            # Clean: Keep only A-Z, a-z, and spaces
            cleaned_name = re.sub(r"[^A-Za-z ]+", "", raw_name).strip()
            if cleaned_name:  # Check if anything alphabetic remains
                # Check if it contains at least one letter
                if re.search(r"[A-Za-z]", cleaned_name):
                    name_to_use = cleaned_name.split()[0]  # Take first word

    except Exception as e:
        print(f"Warning: Error processing name for {profile.get('profileURL')}: {e}")
        name_to_use = ""  # Default to no name on error

    # Format the final name
    return format_name(name_to_use)


def main():
    # Load message templates
    message_data = load_json_data(MESSAGE_TEMPLATE_FILE)
    if (
        message_data is None
        or "messages" not in message_data
        or not message_data["messages"]
    ):
        print(
            f"Error: Could not load valid message templates from {MESSAGE_TEMPLATE_FILE}",
            file=sys.stderr,
        )
        sys.exit(1)
    message_templates = [msg["content"] for msg in message_data["messages"]]
    print(f"Loaded {len(message_templates)} message templates.")

    # Load profile data
    profiles_list = load_json_data(PROFILE_DATA_FILE)
    if profiles_list is None:
        print(f"Make sure {PROFILE_DATA_FILE} exists and contains the profile data.")
        sys.exit(1)
    # Convert to dict for easier lookup and update
    profiles_dict = {
        p.get("profileURL"): p for p in profiles_list if p.get("profileURL")
    }
    initial_profile_count = len(profiles_dict)
    print(f"Loaded {initial_profile_count} profiles from {PROFILE_DATA_FILE}.")

    # Identify profiles classified as 'yes' that haven't been processed yet
    profiles_to_process_urls = []
    for url, profile in profiles_dict.items():
        if profile.get("classification") == "yes" and "processed_status" not in profile:
            profiles_to_process_urls.append(url)

    if not profiles_to_process_urls:
        print(
            "All 'yes' classified profiles seem to have a 'processed_status'. Nothing to do."
        )
        return

    total_to_process = len(profiles_to_process_urls)
    print(f"Starting messaging process for {total_to_process} profiles.")
    print(
        "--> Right Arrow (Yes - Processed), <-- Left Arrow (No - Not Processed), 's' (Save & Stop)"
    )

    processed_count = 0
    try:
        for i, profile_url in enumerate(profiles_to_process_urls):
            profile = profiles_dict[profile_url]
            profile_text = profile.get("profileText", "No text available").replace(
                "\n", " | "
            )

            print(
                f"\n--- Processing Profile {i + 1} / {total_to_process} --- ({profile_url})"
            )
            # print(f"Text: {profile_text}")

            # 1. Select random message
            chosen_template = random.choice(message_templates)

            # 2. Personalize message
            personalized_name = get_personalized_name(profile)
            # print(f"Using name: '{personalized_name}'") # Debugging
            final_message = chosen_template.replace(
                "{{Name}}", personalized_name
            ).strip()
            # If name was empty, remove potential leading space like "Yo !"
            final_message = re.sub(r"(Yo|Hey|Hi) +!", r"\1!", final_message)
            final_message = re.sub(r"(Yo|Hey|Hi) +,", r"\1,", final_message)

            # 3. Copy to clipboard
            try:
                pyperclip.copy(final_message)
                print("✓ Message personalized and copied to clipboard.")
            except Exception as e:
                print(f"Warning: Could not copy to clipboard: {e}", file=sys.stderr)
                print("--- MESSAGE ---:")
                print(final_message)
                print("---------------")

            # 4. Open browser
            webbrowser.open_new_tab(profile_url)

            # 5. Prompt user
            print("Was this message sent/processed successfully? ", end="", flush=True)

            while True:
                key = readchar.readkey()
                decision = None

                if key == readchar.key.RIGHT:
                    decision = "yes"
                    print("Yes")
                    break
                elif key == readchar.key.LEFT:
                    decision = "no"
                    print("No")
                    break
                elif key.lower() == "s":
                    decision = "s"
                    print("Save & Stop")
                    break
                elif key == readchar.key.CTRL_C:
                    raise KeyboardInterrupt
                else:
                    pass  # Ignore other keys

            if decision == "s":
                print("Stopping and saving progress...")
                save_profile_data(PROFILE_DATA_FILE, list(profiles_dict.values()))
                print(
                    f"Progress saved to {PROFILE_DATA_FILE}. Run the script again to resume."
                )
                sys.exit(0)
            else:
                # Update the profile in our main dictionary
                profiles_dict[profile_url]["processed_status"] = decision
                processed_count += 1

            # Save progress periodically (e.g., every 5 profiles)
            if (processed_count % 5 == 0) and processed_count > 0:
                print("Saving intermediate progress...")
                save_profile_data(PROFILE_DATA_FILE, list(profiles_dict.values()))

    except KeyboardInterrupt:
        print("\nKeyboard interrupt detected. Saving progress...")
    finally:
        # Ensure final save on exit or completion
        print("Saving final processing status...")
        save_profile_data(PROFILE_DATA_FILE, list(profiles_dict.values()))
        print(
            f"Processing complete. {processed_count} profiles updated in {PROFILE_DATA_FILE}"
        )


if __name__ == "__main__":
    main()

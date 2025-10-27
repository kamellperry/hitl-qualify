# scrape_followers/run_name_extraction_test.py
"""
Reads classified profile data, extracts potential names using data_processing module,
and saves the results to a new JSON file for review.
"""

import json
import sys
import os
from data_processing import extract_potential_names

INPUT_FILE = "classified_data.json"
OUTPUT_FILE = "name_extraction_test_results.json"


def main():
    # Ensure input file exists
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Input file not found at {INPUT_FILE}", file=sys.stderr)
        print("Please ensure the classification script has been run.", file=sys.stderr)
        sys.exit(1)

    # Load profiles from the classified data file
    print(f"Loading profiles from {INPUT_FILE}...")
    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            profiles = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading or parsing {INPUT_FILE}: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Loaded {len(profiles)} profiles.")
    print("Running name extraction...")

    results = []
    extraction_count = 0

    # Process each profile
    for profile in profiles:
        profile_username = profile.get("username")
        profile_text = profile.get("profileText", profile_username)
        parts = profile_text.split("\n")

        # Target the display name (usually the second part)
        # Use the first part (username) or full text as fallback if display name is missing/short
        text_to_analyze = ""
        if len(parts) >= 2 and parts[1].strip():
            text_to_analyze = parts[1].strip()
        elif parts:
            text_to_analyze = parts[0].strip()  # Fallback to username

        extracted_names = []
        if text_to_analyze:
            extracted_names = extract_potential_names(text_to_analyze)
            if extracted_names:
                extraction_count += 1

        # Prepare the output profile object
        result_profile = profile.copy()  # Start with original data

        # Create the name processing result object
        name_data = {"raw_name": text_to_analyze, "parsed_name": extracted_names}

        # Initialize processed_data as a dictionary if it doesn't exist
        if "processed_data" not in result_profile:
            result_profile["processed_data"] = {}
        elif not isinstance(result_profile["processed_data"], dict):
            # Handle case where it might exist but isn't a dict (e.g., from previous runs)
            print(
                f"Warning: Overwriting non-dict processed_data for {profile.get('profileURL')}"
            )
            result_profile["processed_data"] = {}

        # Assign the name data object to the 'name_info' key
        result_profile["processed_data"]["name_info"] = name_data

        results.append(result_profile)

    print(
        f"Name extraction complete. Found potential names in {extraction_count} profiles."
    )

    # Save the results to the output file
    print(f"Saving results to {OUTPUT_FILE}...")
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=4, ensure_ascii=False)
        print("✓ Results saved successfully.")
    except IOError as e:
        print(f"Error saving results to {OUTPUT_FILE}: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

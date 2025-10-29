"""
Data processing utilities for scrape_followers project.
Provides functions for extracting information from text using NLP.
"""

import sys
from typing import List

# Global variable for the NLP model to avoid reloading it constantly
_NLP_MODEL = None


def _load_spacy_model():
    """Loads the spaCy NLP model, handling potential errors."""
    global _NLP_MODEL
    if _NLP_MODEL is None:
        try:
            import spacy

            # Load the small English model
            _NLP_MODEL = spacy.load("en_core_web_sm")
            print("✓ spaCy model 'en_core_web_sm' loaded.")
        except ImportError:
            print("Error: spaCy library not found.", file=sys.stderr)
            print("Please install it: uv pip install spacy", file=sys.stderr)
            sys.exit(1)
        except OSError:
            print("Error: spaCy model 'en_core_web_sm' not found.", file=sys.stderr)
            print(
                "Please download it: python -m spacy download en_core_web_sm",
                file=sys.stderr,
            )
            sys.exit(1)
    return _NLP_MODEL


def extract_potential_names(text: str) -> List[str]:
    """
    Extracts potential person names from a given text string using spaCy NLP.

    Args:
        text: The text string to analyze.

    Returns:
        A list of strings, where each string is a potential person name identified.
        Returns an empty list if no names are found or if spaCy fails to load.
    """
    try:
        nlp = _load_spacy_model()
        if nlp is None:  # Exit if model loading failed
            raise Exception("Failed to load spaCy model")

        # Process the text using the loaded spaCy pipeline
        doc = nlp(text)

        # Extract entities recognized as persons
        names = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]

        return names
    except Exception as e:
        raise e


# Example Usage (can be run separately or imported)
# if __name__ == "__main__":
#     test_texts = [
#         "espnw\nespnW\nFollow",
#         "senecaswallace\nSeneca Wallace\nFollow",
#         "abigailmille.r\nABIGAIL MILLER\nFollow",
#         "tbell.3\n𝓣𝓻𝓮 𝓑𝓮𝓵𝓵\nFollow", # Example with different font/chars
#         "_obald\nO\nFollow", # Example with single letter
#         "Jane Doe and John Smith went to the park.",
#         "Just a regular sentence without names."
#     ]
#
#     print("Testing name extraction:")
#     for text in test_texts:
#         # Often you'll want to process specific parts, like the display name
#         parts = text.split('\\n')
#         display_name_part = parts[1] if len(parts) > 1 else text # Use display name or full text
#
#         found_names = extract_potential_names(display_name_part)
#         print(f"--- Text: '{display_name_part}' ---")
#         if found_names:
#             print(f"  Names found: {found_names}")
#         else:
#             print("  No names found.")

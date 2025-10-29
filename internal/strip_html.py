import re
import sys
from pathlib import Path
import colors as c  # pyright: ignore[reportImplicitRelativeImport]

# Add the project root to the path to access modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
# Define paths
data_dir = Path(__file__).resolve().parent.parent / "data"


def remove_attribute_content(html_content: str) -> str:
    """
    Removes the content inside HTML attribute values using regex.

    Args:
        html_content: A string containing the HTML source code.

    Returns:
        A string with the content of attribute values removed.
    """
    # Regex to find attr="value" or attr='value'
    # Group 1: Attribute name, Group 2: Quote type, Group 3: Value content
    pattern = re.compile(r'([\w\-]+)\s*=\s*(["\'])(.*?)\2', re.DOTALL)
    # Replacement keeps the attribute name and empty quotes: attr="" or attr=''
    replacement = r"\1=\2\2"
    modified_html = pattern.sub(replacement, html_content)
    return modified_html


def remove_specific_tag_content(html_content: str) -> str:
    """
    Removes the inner content of <style> and <script> tags.

    Args:
        html_content: A string containing HTML source code.

    Returns:
        A string with the inner content of specified tags removed.
    """
    # --- Remove <style> content ---
    # Regex explanation:
    # (<style[^>]*>)     # Group 1: Capture the opening <style> tag and its attributes
    # (.*?)              # Group 2: Capture the inner content (non-greedily)
    # (<\/style>)        # Group 3: Capture the closing </style> tag
    style_pattern = re.compile(
        r"(<style[^>]*>)(.*?)(<\/style>)", re.DOTALL | re.IGNORECASE
    )
    # **** CORRECTED REPLACEMENT ****
    # Keep Group 1 (opening tag) and Group 3 (closing tag), removing Group 2 (content)
    html_content = style_pattern.sub(r"\1\3", html_content)

    # --- Remove <script> content ---
    # Regex explanation:
    # (<script[^>]*>)    # Group 1: Capture the opening <script> tag and its attributes
    # (.*?)              # Group 2: Capture the inner content (non-greedily)
    # (<\/script>)       # Group 3: Capture the closing </script> tag
    script_pattern = re.compile(
        r"(<script[^>]*>)(.*?)(<\/script>)", re.DOTALL | re.IGNORECASE
    )
    # **** CORRECTED REPLACEMENT ****
    # Keep Group 1 (opening tag) and Group 3 (closing tag), removing Group 2 (content)
    html_content = script_pattern.sub(r"\1\3", html_content)

    # --- Link tags ---
    # No action needed here for *inner* content removal as <link> tags are typically empty.
    # Attribute content was already handled by remove_attribute_content.

    return html_content


def minify_whitespace(html_content: str) -> str:
    """
    Removes extraneous whitespace for better structural clarity.
    - Removes space between tags (> <).
    - Strips leading/trailing whitespace from each line.
    - Removes empty lines.

    Args:
        html_content: String containing HTML.

    Returns:
        String with reduced whitespace.
    """
    # 1. Remove whitespace between tags (most impactful for structure)
    #    Handles > \n <, >   <, etc.
    html_content = re.sub(r">\s+<", "><", html_content, flags=re.DOTALL)

    # 2. Process line by line for finer cleanup
    lines = html_content.splitlines()
    stripped_lines = []
    for line in lines:
        stripped_line = line.strip()  # Remove leading/trailing whitespace
        if stripped_line:  # Only keep non-empty lines
            stripped_lines.append(stripped_line)

    # 3. Join the cleaned lines back together.
    #    Using "" joins everything into one line (maximum compaction).
    #    Using "\n" would preserve line breaks between the remaining content.
    #    Let's go with maximum compaction as requested.
    return "".join(stripped_lines)
    # Alternatively, for slightly more readability:
    # return "\n".join(stripped_lines)


def process_html(input_filename: str | Path, output_filename: str | Path) -> None:
    try:
        # Read the input HTML file
        with open(input_filename, "r", encoding="utf-8") as f_in:
            original_html = f_in.read()

        # Step 1: Remove content from attribute values
        html_step1 = remove_attribute_content(original_html)

        # Step 2: Remove content from specific tags
        html_step2 = remove_specific_tag_content(html_step1)

        # Step 3: Minify whitespace
        processed_html = minify_whitespace(html_step2)

        # Write the processed HTML to a new file
        with open(output_filename, "w", encoding="utf-8") as f_out:
            f_out.write(processed_html)

        print(
            f"Successfully processed '{input_filename}' and saved the result to '{output_filename}'."
        )
        # Optionally print a snippet to console
        # print("\n--- Snippet of Processed HTML ---")
        # print(processed_html[:1000]) # Print the first 1000 characters
        # print("...")

    except FileNotFoundError:
        print(f"Error: Input file '{input_filename}' not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


def process_single_file(single_file_path: str | Path) -> None:
    """Process a single HTML file at the given path."""
    file = Path(single_file_path)
    if not file.exists():
        print(f"Error: File '{file}' not found.")
        return

    output_filename = (
        data_dir / "errors" / "stripped_html" / f"stripped_{file.stem}.html"
    )

    # Skip if output file already exists
    if output_filename.exists():
        print(f"{c.yellow(f'Skipping {file.name} - already processed')}\n")
        return

    # File names should be blue and bold, but not the whole string
    print(
        f"Processing {c.blue(file.name)} and saving to {c.blue(output_filename.name)}\n"
    )
    process_html(file, output_filename)
    print(f"{c.green(f'Done processing {file.name}')}\n")


def main() -> None:
    all_files = list(data_dir.glob("errors/error_page_*.html"))

    print(f"Processing up to {c.bold(str(len(all_files)))} files\n")
    print("-" * 80)
    try:
        for file in all_files:
            output_filename = (
                data_dir / "errors" / "stripped_html" / f"stripped_{file.stem}.html"
            )
            # Skip if output file already exists
            if output_filename.exists():
                print(f"{c.yellow(f'Skipping {file.name} - already processed')}\n")
                print("-" * 80)
                continue
            input_filename = file
            # File names should be blue and bold, but not the whole string
            print(
                f"Processing {c.blue(input_filename.name)} and saving to {c.blue(output_filename.name)}\n"
            )
            process_html(file, output_filename)
            print(f"{c.green(f'Done processing {input_filename.name}')}\n")
            print("-" * 80)
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    main()

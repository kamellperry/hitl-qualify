# ANSI color codes
_BLUE = "\033[94m"
_YELLOW = "\033[93m"
_GREEN = "\033[92m"
_BOLD = "\033[1m"
_RESET = "\033[0m"


def blue(text: str) -> str:
    return f"{_BLUE}{text}{_RESET}"


def yellow(text: str) -> str:
    return f"{_YELLOW}{text}{_RESET}"


def green(text: str) -> str:
    return f"{_GREEN}{text}{_RESET}"


def bold(text: str) -> str:
    return f"{_BOLD}{text}{_RESET}"

import random
import string

def generate_invite_code(prefix: str = "COMM") -> str:
    """Generates a unique 8-character invite code (e.g., COMM-8X92)."""
    chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{chars}"
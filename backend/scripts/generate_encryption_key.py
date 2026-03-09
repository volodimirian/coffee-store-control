"""Generate encryption key for OFD API keys encryption."""
from cryptography.fernet import Fernet


def generate_key() -> str:
    """Generate a new Fernet encryption key."""
    return Fernet.generate_key().decode()


if __name__ == "__main__":
    key = generate_key()
    print("\n" + "="*70)
    print("Generated ENCRYPTION_KEY for OFD API keys:")
    print("="*70)
    print(f"\n{key}\n")
    print("="*70)
    print("Add this to your .env file:")
    print(f"ENCRYPTION_KEY={key}")
    print("="*70 + "\n")

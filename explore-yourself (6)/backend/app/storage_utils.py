"""
Storage utility functions to load data from local files or databutton storage
"""
import os
import pandas as pd
from pathlib import Path

# Try to import databutton if available
try:
    import databutton as db
    HAS_DATABUTTON = True
except ImportError:
    HAS_DATABUTTON = False

# Base path for local data storage
# Try multiple possible locations for DataStorage
_possible_paths = [
    Path(__file__).parent.parent / "DataStorage",  # /app/backend/DataStorage (production)
    Path(__file__).parent.parent.parent / "DataStorage",  # development
]

DATA_DIR = None
for path in _possible_paths:
    if path.exists():
        DATA_DIR = path
        print(f"[DataStorage] Found data directory at: {path}")
        break

if DATA_DIR is None:
    # Default to first path even if it doesn't exist yet
    DATA_DIR = _possible_paths[0]
    print(f"[DataStorage] WARNING: No existing data directory found. Using default: {DATA_DIR}")
else:
    # List files to verify
    try:
        files = list(DATA_DIR.glob("*"))
        print(f"[DataStorage] Found {len(files)} files in {DATA_DIR}")
    except Exception as e:
        print(f"[DataStorage] ERROR listing files: {e}")

def get_text_data(name: str) -> str:
    """
    Get text data from local file or databutton storage

    Args:
        name: Name of the text file (without extension for databutton)

    Returns:
        Text content as string
    """
    # Map databutton storage names to local file names
    file_mapping = {
        "abilty-cleaned-1-txt": "abilty_cleaned (1).txt",
        "knowledge-cleaned-1-txt": "knowledge_cleaned (1).txt",
        "skills-cleaned-1-txt": "skills_cleaned (1).txt",
    }

    # Try local file first
    local_filename = file_mapping.get(name, f"{name}.txt")
    local_path = DATA_DIR / local_filename

    if local_path.exists():
        with open(local_path, 'r', encoding='utf-8') as f:
            return f.read()

    # Fallback to databutton storage if available
    if HAS_DATABUTTON:
        try:
            return db.storage.text.get(name)
        except Exception as e:
            raise FileNotFoundError(f"Could not load text data '{name}': {e}")

    raise FileNotFoundError(f"Data file not found: {local_path}")


def get_dataframe(name: str) -> pd.DataFrame:
    """
    Get dataframe from local CSV file or databutton storage

    Args:
        name: Name of the dataframe (databutton storage name without extension)

    Returns:
        pandas DataFrame
    """
    # Map databutton storage names to local file names
    file_mapping = {
        "elements-skills-csv": "elements-skills-csv",
        "elements-abilities-csv": "elements-abilities-csv",
        "elements-knowledge-2-csv": "elements-knowledge-2-csv",
        "elements-interests-csv": "elements-interests-csv",
        "elements-scales-reference-csv": "elements-scales-reference-csv",
        "all-career-clusters-1-csv": "all-career-clusters-1-csv",
        "career-validation-csv": "career-validation-csv",
    }

    # Try local file first
    local_filename = file_mapping.get(name, f"{name}.csv")
    local_path = DATA_DIR / local_filename

    if local_path.exists():
        # Try reading as Apache Arrow/Feather format first (Databutton uses Arrow)
        try:
            return pd.read_feather(local_path)
        except:
            pass

        # Try as Parquet
        try:
            return pd.read_parquet(local_path)
        except:
            pass

        # Try as CSV with different encodings
        for encoding in ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']:
            try:
                return pd.read_csv(local_path, encoding=encoding)
            except:
                continue

        # Last resort: try with errors='ignore'
        try:
            return pd.read_csv(local_path, encoding='utf-8', errors='ignore')
        except Exception as e:
            raise FileNotFoundError(f"Could not read dataframe from {local_path}: {e}")

    # Fallback to databutton storage if available
    if HAS_DATABUTTON:
        try:
            return db.storage.dataframes.get(name)
        except Exception as e:
            raise FileNotFoundError(f"Could not load dataframe '{name}': {e}")

    raise FileNotFoundError(f"Data file not found: {local_path}")

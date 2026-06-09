"""Pytest configuration and shared fixtures."""

import sys
from pathlib import Path

import pytest

# Add the parent directory to the path so we can import lovamap_proto
repo_root = Path(__file__).parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))


@pytest.fixture
def fixtures_dir():
    """Return the path to the fixtures directory."""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def valid_minimal_json(fixtures_dir):
    """Return path to valid minimal JSON fixture."""
    return fixtures_dir / "valid_minimal.json"


@pytest.fixture
def valid_full_json(fixtures_dir):
    """Return path to valid full JSON fixture."""
    return fixtures_dir / "valid_full.json"


@pytest.fixture
def invalid_wrong_type_json(fixtures_dir):
    """Return path to invalid JSON fixture (wrong type)."""
    return fixtures_dir / "invalid_wrong_type.json"


@pytest.fixture
def temp_output_file(tmp_path):
    """Return path to a temporary output file."""
    return tmp_path / "output.pb"


@pytest.fixture
def temp_json_file(tmp_path):
    """Return path to a temporary JSON file."""
    return tmp_path / "output.json"

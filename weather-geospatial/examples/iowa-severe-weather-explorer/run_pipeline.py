"""CLI entry point for the Iowa Severe Weather Data Explorer pipeline.

Usage:
    python run_pipeline.py                 # process everything from the config window
    python run_pipeline.py --only radar hrrr
    python run_pipeline.py --config config/derecho-2020.yml
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from iowa_severe_weather.build import main  # noqa: E402

if __name__ == "__main__":
    main()

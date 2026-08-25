"""Helpers to convert between day names (API) and smallint (DB), and time strings.

Storage optimization: `day_of_week` is stored as a SMALLINT (1 = Monday .. 7 = Sunday)
in the database, while the public API keeps using human-readable day names so the
frontend contract stays unchanged. `start_time` is stored as a native `time` column
and exposed as an "HH:MM" string.
"""

from datetime import time as dtime
from typing import Optional

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_TO_INT = {name: idx for idx, name in enumerate(DAY_NAMES, start=1)}
INT_TO_DAY = {idx: name for name, idx in DAY_TO_INT.items()}


def day_to_int(day: Optional["str | int"]) -> Optional[int]:
    """Map a day name ('Monday'..) to its smallint value (1..7), or None.

    Tolerant of the input being an int (or digit string) already, so it works
    whether the DB column is still VARCHAR (names) or already SMALLINT.
    """
    if day is None:
        return None
    if isinstance(day, int):
        return day
    if isinstance(day, str) and day.isdigit():
        return int(day)
    return DAY_TO_INT.get(day)


def int_to_day(value: Optional["str | int"]) -> Optional[str]:
    """Map a smallint value (1..7) back to its day name, or None.

    Tolerant of the value already being a day name (VARCHAR column), so it works
    both before and after the day_of_week column migration.
    """
    if value is None:
        return None
    if isinstance(value, str) and value in DAY_TO_INT:
        return value  # already a name
    if isinstance(value, str) and value.isdigit():
        value = int(value)
    if isinstance(value, int):
        return INT_TO_DAY.get(value)
    return None


def parse_time(value: Optional[str]) -> Optional[dtime]:
    """Parse an 'HH:MM' or 'HH:MM:SS' string into a datetime.time, or None."""
    if not value:
        return None
    if isinstance(value, dtime):
        return value
    parts = str(value).split(":")
    if len(parts) < 2:
        return None
    try:
        hour = int(parts[0])
        minute = int(parts[1])
        second = int(parts[2]) if len(parts) > 2 and parts[2] else 0
        return dtime(hour=hour, minute=minute, second=second)
    except (ValueError, TypeError):
        return None


def format_time(value: Optional["str | dtime"]) -> Optional[str]:
    """Format a datetime.time as an 'HH:MM' string for the API, or None.

    Also accepts strings ('HH:MM' or 'HH:MM:SS') which is what a still-VARCHAR
    start_time column returns before the schema migration runs.
    """
    if value is None:
        return None
    if isinstance(value, str):
        parts = value.split(":")
        if len(parts) >= 2:
            try:
                return f"{int(parts[0]):02d}:{int(parts[1]):02d}"
            except (ValueError, TypeError):
                return value
        return value
    return value.strftime("%H:%M")

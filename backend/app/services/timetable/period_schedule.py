"""Fixed school schedule constants.

The school day is no longer configurable:
  - Start time: 07:10
  - End time:   12:35
  - Period duration: 40 minutes 37.5 seconds (40.625 min)
  - Lunch period: always the 4th period

325 minutes / 40.625 min = 8 teaching periods per day exactly.
"""

from typing import Dict, List

PERIODS_PER_DAY: int = 8
LUNCH_PERIOD: int = 4
START_TIME: str = "07:10"
END_TIME: str = "12:35"
PERIOD_DURATION_MINUTES: float = 40.625

# Each period's start/end derived from START_TIME + n * 40.625 minutes.
# Displayed as HH:MM (seconds/seconds-fraction truncated) per the API contract.
PERIOD_SCHEDULE: List[Dict[str, object]] = [
    {"period": 1, "start_time": "07:10", "end_time": "07:50"},
    {"period": 2, "start_time": "07:50", "end_time": "08:31"},
    {"period": 3, "start_time": "08:31", "end_time": "09:11"},
    {"period": 4, "start_time": "09:11", "end_time": "09:52"},
    {"period": 5, "start_time": "09:52", "end_time": "10:33"},
    {"period": 6, "start_time": "10:33", "end_time": "11:13"},
    {"period": 7, "start_time": "11:13", "end_time": "11:54"},
    {"period": 8, "start_time": "11:54", "end_time": "12:35"},
]

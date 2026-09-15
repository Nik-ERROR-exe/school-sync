import re
from typing import List, Any

def parse_class_key(c: Any):
    """
    Parses a class object, dict, or string to extract numeric class number and division
    for natural ascending sorting.
    Examples:
      'Standard 1 - A' -> (1, 'A', 'Standard 1 - A')
      'Standard 10 - B' -> (10, 'B', 'Standard 10 - B')
      'Class 2 Division C' -> (2, 'C', 'Class 2 Division C')
    """
    if hasattr(c, 'class_name'):
        div = getattr(c, 'division', '') or ''
        name_str = f"{c.class_name} {div}".strip()
    elif isinstance(c, dict):
        class_name = c.get('class_name') or c.get('name') or ''
        div = c.get('division') or ''
        name_str = f"{class_name} {div}".strip()
    else:
        name_str = str(c or '')

    # Extract class number (e.g. 1, 2, 7, 8, 9, 10, 11, 12)
    num_match = re.search(r'\d+', name_str)
    num = int(num_match.group()) if num_match else 0

    # Extract trailing division letter (e.g. A, B, C)
    div_match = re.search(r'(?:-|\b(?:Division|Div|Sec|Section)\b)?\s*([A-Za-z])(?:\b|$)', name_str)
    div = div_match.group(1).upper() if div_match else ''

    return (num, div, name_str)

def sort_classes_natural(classes_list: List[Any]) -> List[Any]:
    """
    Returns a new list sorted naturally by class number ascending (1..10) then division (A..Z).
    """
    if not classes_list:
        return []
    return sorted(classes_list, key=parse_class_key)

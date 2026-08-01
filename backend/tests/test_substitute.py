import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import date
from app.services.substitute_service import find_available_substitutes, assign_substitute
from app.models.timetable import TimetableSlot
from app.models.teacher import Teacher
from app.models.school_class import SchoolClass
from app.core.exceptions import ValidationException

def test_find_available_substitutes_no_active_class():
    """
    Tests that find_available_substitutes returns (None, []) when the absent teacher
    is not scheduled to teach during that specific slot.
    """
    db = MagicMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    db.execute.return_value = mock_res
    
    slot, available = find_available_substitutes(
        db=db,
        absent_date=date(2026, 6, 17),
        period_number=1,
        absent_teacher_id=101
    )
    
    assert slot is None
    assert available == []
    db.execute.assert_called_once()

def test_assign_substitute_conflict():
    """
    Tests that assign_substitute raises a ValidationException when the selected
    substitute is already assigned to cover a class in the same period.
    """
    db = MagicMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = MagicMock()  # Simulates existing assignment
    db.execute.return_value = mock_res
    
    with pytest.raises(ValidationException):
        assign_substitute(
            db=db,
            date=date(2026, 6, 17),
            period_number=1,
            class_id=1,
            subject_id=2,
            original_teacher_id=10,
            substitute_teacher_id=20
        )

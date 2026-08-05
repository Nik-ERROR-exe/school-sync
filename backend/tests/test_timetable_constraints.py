"""Unit tests for the timetable constraint helpers in app/services/timetable/constraints.py."""
import pytest
from app.services.timetable.constraints import (
    check_teacher_back_to_back,
    check_no_consecutive_same_subject,
)


def test_back_to_back_prev_period():
    assignments = {(1, "Monday", 1): (10, 5)}  # teacher 5 at period 1
    # Period 2 is adjacent to period 1 -> reject
    assert check_teacher_back_to_back(5, "Monday", 2, assignments) is False
    # Period 3 is not adjacent -> allow
    assert check_teacher_back_to_back(5, "Monday", 3, assignments) is True


def test_back_to_back_next_period():
    assignments = {(1, "Monday", 3): (10, 5)}  # teacher 5 at period 3
    # Period 2 is adjacent to period 3 -> reject
    assert check_teacher_back_to_back(5, "Monday", 2, assignments) is False


def test_back_to_back_other_teacher_unaffected():
    assignments = {(1, "Monday", 2): (10, 7)}  # teacher 7 at period 2
    assert check_teacher_back_to_back(5, "Monday", 1, assignments) is True
    assert check_teacher_back_to_back(5, "Monday", 3, assignments) is True


def test_back_to_back_free_period():
    assert check_teacher_back_to_back(0, "Monday", 2, {}) is True
    assert check_teacher_back_to_back(5, "Monday", 1, {}) is True  # period 1, no neighbours


def test_back_to_back_other_day_unaffected():
    assignments = {(1, "Monday", 2): (10, 5)}
    assert check_teacher_back_to_back(5, "Tuesday", 1, assignments) is True
    assert check_teacher_back_to_back(5, "Tuesday", 3, assignments) is True


def test_no_consecutive_same_subject_prev():
    assignments = {(1, "Monday", 1): (10, 5)}
    # Same subject at period 1 -> reject period 2
    assert check_no_consecutive_same_subject(1, 10, "Monday", 2, assignments) is False
    # Different subject at period 1 -> allow
    assert check_no_consecutive_same_subject(1, 11, "Monday", 2, assignments) is True


def test_no_consecutive_same_subject_next_order_independent():
    # Slot 2 assigned first; slot 1 placed later must also be rejected
    assignments = {(1, "Monday", 2): (10, 5)}
    assert check_no_consecutive_same_subject(1, 10, "Monday", 1, assignments) is False


def test_no_consecutive_same_subject_different_class():
    # Same subject but in a different class is fine
    assignments = {(2, "Monday", 1): (10, 5)}
    assert check_no_consecutive_same_subject(1, 10, "Monday", 2, assignments) is True


def test_no_consecutive_same_subject_free():
    assert check_no_consecutive_same_subject(1, 0, "Monday", 2, {(1, "Monday", 1): (0, 0)}) is True

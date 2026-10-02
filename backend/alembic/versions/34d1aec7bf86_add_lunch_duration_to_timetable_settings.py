"""Add lunch_duration to timetable_settings.

Lunch may now be a different length than a regular period (e.g. a 45-minute
lunch with 60-minute lectures). Persisting the lunch length lets the
settings endpoint round-trip it alongside the other display fields. The
column is nullable with no server default: existing rows are unaffected and
the code falls back to period_minutes when the stored value is NULL.

Note: the API field is `lunch_minutes`; the column is `lunch_duration`, matching
the naming convention of `period_duration` for the `period_minutes` field.

Revision ID: 34d1aec7bf86
Revises: 16d705c3af8b
Create Date: 2026-10-03
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '34d1aec7bf86'
down_revision: Union[str, None] = '16d705c3af8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timetable_settings_columns():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    return [col['name'] for col in inspector.get_columns('timetable_settings')]


def upgrade() -> None:
    columns = _timetable_settings_columns()
    # Column is `lunch_duration`; the API field is `lunch_minutes`.
    if 'lunch_duration' not in columns:
        op.add_column('timetable_settings', sa.Column('lunch_duration', sa.Integer(), nullable=True))


def downgrade() -> None:
    columns = _timetable_settings_columns()
    if 'lunch_duration' in columns:
        op.drop_column('timetable_settings', 'lunch_duration')
"""Add timetable settings display fields.

Re-adds the configurable school-time columns that
`remove_configurable_school_times` removed, so that the school day can
once again be driven by data rather than module constants. All four columns
are nullable with no server default: existing rows are unaffected, and the
code falls back to the PERIODS_PER_DAY / LUNCH_PERIOD constants when the
stored value is NULL.

Note: the API/schema field is `period_minutes`, but the column is named
`period_duration` to match the previously dropped column and the module
constant PERIOD_DURATION_MINUTES. The settings endpoint maps between the
two names.

Revision ID: 16d705c3af8b
Revises: drop_stage1_columns
Create Date: 2026-10-02
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '16d705c3af8b'
down_revision: Union[str, None] = 'drop_stage1_columns'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timetable_settings_columns():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    return [col['name'] for col in inspector.get_columns('timetable_settings')]


def upgrade() -> None:
    columns = _timetable_settings_columns()
    if 'periods_per_day' not in columns:
        op.add_column('timetable_settings', sa.Column('periods_per_day', sa.Integer(), nullable=True))
    if 'lunch_period' not in columns:
        op.add_column('timetable_settings', sa.Column('lunch_period', sa.Integer(), nullable=True))
    if 'start_time' not in columns:
        op.add_column('timetable_settings', sa.Column('start_time', sa.String(length=5), nullable=True))
    # Column is `period_duration`; the API field is `period_minutes`.
    if 'period_duration' not in columns:
        op.add_column('timetable_settings', sa.Column('period_duration', sa.Integer(), nullable=True))


def downgrade() -> None:
    columns = _timetable_settings_columns()
    if 'period_duration' in columns:
        op.drop_column('timetable_settings', 'period_duration')
    if 'start_time' in columns:
        op.drop_column('timetable_settings', 'start_time')
    if 'lunch_period' in columns:
        op.drop_column('timetable_settings', 'lunch_period')
    if 'periods_per_day' in columns:
        op.drop_column('timetable_settings', 'periods_per_day')
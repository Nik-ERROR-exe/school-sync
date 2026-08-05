"""remove configurable school times from timetable_settings

The school day is now fixed (07:10 start, 8 periods/day, lunch in period 4),
so the configurable period/time columns are dropped.

Revision ID: remove_configurable_school_times
Revises: remove_profile_image_url
Create Date: 2026-08-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'remove_configurable_school_times'
down_revision: Union[str, None] = 'remove_profile_image_url'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timetable_settings_columns():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    return [col['name'] for col in inspector.get_columns('timetable_settings')]


def upgrade() -> None:
    columns = _timetable_settings_columns()
    for col in ('periods_per_day', 'start_time', 'period_duration', 'lunch_period'):
        if col in columns:
            op.drop_column('timetable_settings', col)


def downgrade() -> None:
    columns = _timetable_settings_columns()
    if 'periods_per_day' not in columns:
        op.add_column('timetable_settings', sa.Column('periods_per_day', sa.Integer(), nullable=False, server_default='8'))
    if 'start_time' not in columns:
        op.add_column('timetable_settings', sa.Column('start_time', sa.Time(), nullable=False, server_default='07:10'))
    if 'period_duration' not in columns:
        op.add_column('timetable_settings', sa.Column('period_duration', sa.Integer(), nullable=False, server_default='41'))
    if 'lunch_period' not in columns:
        op.add_column('timetable_settings', sa.Column('lunch_period', sa.Integer(), nullable=True, server_default='4'))

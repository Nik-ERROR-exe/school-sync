"""rename_timetable_columns

Revision ID: d455acd2e4ed
Revises: 51c8defea338
Create Date: 2026-07-02 16:48:02.281451

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd455acd2e4ed'
down_revision: Union[str, None] = '20260630_193723'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('timetable')]
    if 'day' in columns:
        op.alter_column("timetable", "day", new_column_name="day_of_week")
    if 'period' in columns:
        op.alter_column("timetable", "period", new_column_name="period_number")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('timetable')]
    if 'day_of_week' in columns:
        op.alter_column("timetable", "day_of_week", new_column_name="day")
    if 'period_number' in columns:
        op.alter_column("timetable", "period_number", new_column_name="period")

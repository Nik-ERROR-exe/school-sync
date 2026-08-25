"""add timetable settings

Revision ID: ca7d3c0370df
Revises: 91b6d29bd79a
Create Date: 2026-07-18 04:02:39.276401

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ca7d3c0370df'
down_revision: Union[str, None] = '91b6d29bd79a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass


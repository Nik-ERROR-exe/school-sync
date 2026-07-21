"""add_class_subjects_table

Revision ID: 91b6d29bd79a
Revises: d455acd2e4ed
Create Date: 2026-07-04 16:23:11.304509

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '91b6d29bd79a'
down_revision: Union[str, None] = 'd455acd2e4ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "class_subjects",
        sa.Column("class_id", sa.Integer(), sa.ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True)
    )


def downgrade() -> None:
    op.drop_table("class_subjects")

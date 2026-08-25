"""fix roll_no uniqueness per class

Revision ID: 7964f1e7ce50
Revises: ca7d3c0370df
Create Date: 2026-07-22 13:11:58.163491

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7964f1e7ce50'
down_revision: Union[str, None] = 'ca7d3c0370df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("students_roll_no_key", "students", type_="unique")
    op.drop_index("ix_students_roll_no", table_name="students")
    op.create_unique_constraint("uq_class_roll_no", "students", ["class_id", "roll_no"])

    op.drop_constraint("students_class_id_fkey", "students", type_="foreignkey")
    op.create_foreign_key(
        "students_class_id_fkey", "students", "classes",
        ["class_id"], ["id"], ondelete="CASCADE"
    )


def downgrade() -> None:
    op.drop_constraint("students_class_id_fkey", "students", type_="foreignkey")
    op.create_foreign_key(
        "students_class_id_fkey", "students", "classes",
        ["class_id"], ["id"]
    )

    op.drop_constraint("uq_class_roll_no", "students", type_="unique")
    op.create_unique_constraint("students_roll_no_key", "students", ["roll_no"])
    op.create_index("ix_students_roll_no", "students", ["roll_no"])

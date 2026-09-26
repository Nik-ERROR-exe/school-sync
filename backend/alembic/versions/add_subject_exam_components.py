"""Add variable subject/exam components and result components.

Revision ID: add_subject_exam_components
Revises: add_component_marks
Create Date: 2026-08-08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'add_subject_exam_components'
down_revision: Union[str, None] = 'add_component_marks'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # a) exam_types.category
    op.add_column(
        "exam_types",
        sa.Column("category", sa.String(length=10), nullable=False, server_default="UNIT"),
    )

    # b) Seed semester exams
    op.execute(
        "UPDATE exam_types SET category='SEMESTER' "
        "WHERE name IN ('Semester 1', 'Semester 2')"
    )

    # c) subject_exam_components
    op.create_table(
        "subject_exam_components",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("class_name", sa.String(length=50), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("exam_type_id", sa.Integer(), nullable=False),
        sa.Column("component_code", sa.String(length=20), nullable=False),
        sa.Column("display_label", sa.String(length=50), nullable=False),
        sa.Column("max_marks", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("display_order", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["exam_type_id"], ["exam_types.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "class_name", "subject_id", "exam_type_id", "component_code",
            name="uq_subject_exam_component",
        ),
    )

    # d) result_components
    op.create_table(
        "result_components",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("result_id", sa.Integer(), nullable=False),
        sa.Column("component_code", sa.String(length=20), nullable=False),
        sa.Column("marks_obtained", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.ForeignKeyConstraint(["result_id"], ["results.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("result_id", "component_code", name="uq_result_component"),
    )
    op.create_index(op.f("ix_result_components_result_id"), "result_components", ["result_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_result_components_result_id"), table_name="result_components")
    op.drop_table("result_components")
    op.drop_table("subject_exam_components")
    op.drop_column("exam_types", "category")

"""Drop Stage-1 component columns and the subject_max_marks table.

Revision ID: drop_stage1_columns
Revises: add_subject_exam_components
Create Date: 2026-08-08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'drop_stage1_columns'
down_revision: Union[str, None] = 'add_subject_exam_components'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("results", "akarikh_marks")
    op.drop_column("results", "oral_marks")
    op.drop_column("results", "written_marks")
    op.drop_table("subject_max_marks")


def downgrade() -> None:
    op.create_table(
        'subject_max_marks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('class_name', sa.String(length=50), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('exam_type_id', sa.Integer(), nullable=False),
        sa.Column('max_marks', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('akarikh_max', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'),
        sa.Column('oral_max', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'),
        sa.Column('written_max', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['exam_type_id'], ['exam_types.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('class_name', 'subject_id', 'exam_type_id', name='uq_subject_max_marks_class_subj_exam')
    )

    op.add_column("results", sa.Column("akarikh_marks", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"))
    op.add_column("results", sa.Column("oral_marks", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"))
    op.add_column("results", sa.Column("written_marks", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"))

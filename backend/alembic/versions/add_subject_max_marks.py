"""add subject_max_marks table

Revision ID: add_subject_max_marks
Revises: remove_configurable_school_times
Create Date: 2026-08-27
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'add_subject_max_marks'
down_revision: Union[str, None] = 'remove_configurable_school_times'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'subject_max_marks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('class_name', sa.String(length=50), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('exam_type_id', sa.Integer(), nullable=False),
        sa.Column('max_marks', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.ForeignKeyConstraint(['exam_type_id'], ['exam_types.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('class_name', 'subject_id', 'exam_type_id', name='uq_subject_max_marks_class_subj_exam')
    )


def downgrade() -> None:
    op.drop_table('subject_max_marks')

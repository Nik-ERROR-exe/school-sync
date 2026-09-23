"""Add component marks to results and subject_max_marks; wipe test data.

Revision ID: add_component_marks
Revises: remove_configurable_school_times
Create Date: 2026-08-07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'add_component_marks'
down_revision: Union[str, None] = 'add_subject_max_marks'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Wipe disposable test data (confirmed by user)
    op.execute("DELETE FROM results")
    op.execute("DELETE FROM subject_max_marks")

    # Add component columns to results
    op.add_column('results', sa.Column('akarikh_marks', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'))
    op.add_column('results', sa.Column('oral_marks', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'))
    op.add_column('results', sa.Column('written_marks', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'))

    # Add component columns to subject_max_marks
    op.add_column('subject_max_marks', sa.Column('akarikh_max', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'))
    op.add_column('subject_max_marks', sa.Column('oral_max', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'))
    op.add_column('subject_max_marks', sa.Column('written_max', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('results', 'written_marks')
    op.drop_column('results', 'oral_marks')
    op.drop_column('results', 'akarikh_marks')
    op.drop_column('subject_max_marks', 'written_max')
    op.drop_column('subject_max_marks', 'oral_max')
    op.drop_column('subject_max_marks', 'akarikh_max')

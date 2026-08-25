"""add subject_id to substitute_assignments

Revision ID: add_subject_id_to_substitute
Revises: a04de3cb5f51
Create Date: 2026-07-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_subject_id_to_substitute'
down_revision: Union[str, None] = 'a04de3cb5f51'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add subject_id as nullable first (no server_default needed for new column)
    op.add_column('substitute_assignments', sa.Column('subject_id', sa.Integer(), sa.ForeignKey('subjects.id'), nullable=True))
    # Set a default for existing rows (if any exist, point to subject id 1)
    op.execute("UPDATE substitute_assignments SET subject_id = 1 WHERE subject_id IS NULL")
    # Now make it not nullable
    op.alter_column('substitute_assignments', 'subject_id', nullable=False)


def downgrade() -> None:
    op.drop_column('substitute_assignments', 'subject_id')
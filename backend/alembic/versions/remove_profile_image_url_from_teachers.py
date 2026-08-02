"""remove profile_image_url from teachers

Revision ID: remove_profile_image_url
Revises: add_profile_image_url
Create Date: 2026-08-02

Drops the nullable string column that stored the served path of an uploaded
profile photo. The photo-upload feature is being removed entirely; the column
held only a path (never image bytes), but it and the local-disk uploads are no
longer wanted.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'remove_profile_image_url'
down_revision: Union[str, None] = 'add_profile_image_url'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('teachers', 'profile_image_url')


def downgrade() -> None:
    op.add_column('teachers', sa.Column('profile_image_url', sa.String(255), nullable=True))

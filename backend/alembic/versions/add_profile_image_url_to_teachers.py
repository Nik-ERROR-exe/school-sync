"""add profile_image_url to teachers

Revision ID: add_profile_image_url
Revises: optimize_schema_storage
Create Date: 2026-08-02

Adds a nullable string column storing the served path of the uploaded profile photo.
Only a path is stored (never image bytes) to respect the Neon free-tier storage cap.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_profile_image_url'
down_revision: Union[str, None] = 'optimize_schema_storage'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('teachers', sa.Column('profile_image_url', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('teachers', 'profile_image_url')

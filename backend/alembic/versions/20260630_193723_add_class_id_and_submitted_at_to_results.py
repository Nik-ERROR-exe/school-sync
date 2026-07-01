"""add_class_id_and_submitted_at_to_results

Revision ID: 20260630_193723
Revises: 
Create Date: 2024-06-30 19:37:23.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260630_193723'
down_revision = None  # ← Change this if you have previous migrations
branch_labels = None
depends_on = None

def upgrade():
    # Add class_id column
    op.add_column('results', sa.Column('class_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_results_class_id', 'results', 'classes', ['class_id'], ['id'])
    
    # Add submitted_at column
    op.add_column('results', sa.Column('submitted_at', sa.DateTime(), nullable=True))
    
    # Create index
    op.create_index('idx_results_class_id', 'results', ['class_id'])

def downgrade():
    op.drop_index('idx_results_class_id', 'results')
    op.drop_column('results', 'submitted_at')
    op.drop_constraint('fk_results_class_id', 'results', type_='foreignkey')
    op.drop_column('results', 'class_id')
"""optimize schema storage for Neon free-tier

Revision ID: optimize_schema_storage
Revises: add_subject_id_to_substitute
Create Date: 2026-07-31

Drops unbounded/redundant tables, compacts data types and removes redundant indexes.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'optimize_schema_storage'
down_revision: Union[str, None] = 'add_subject_id_to_substitute'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _convert_day_column(table: str) -> None:
    """Map day-name values to smallint (1=Monday..7=Sunday) then change the type."""
    op.execute(f"""
        UPDATE {table} SET day_of_week = CASE day_of_week
            WHEN 'Monday' THEN '1'
            WHEN 'Tuesday' THEN '2'
            WHEN 'Wednesday' THEN '3'
            WHEN 'Thursday' THEN '4'
            WHEN 'Friday' THEN '5'
            WHEN 'Saturday' THEN '6'
            WHEN 'Sunday' THEN '7'
            ELSE NULL
        END
    """)
    op.execute(
        f"ALTER TABLE {table} ALTER COLUMN day_of_week TYPE SMALLINT USING day_of_week::smallint"
    )


def upgrade() -> None:
    # 1. Drop the append-only notifications table (notifications are now email/push only).
    op.execute("DROP TABLE IF EXISTS notifications CASCADE")

    # 2. Drop the redundant teacher_subjects mapping (derived from teacher_class_subjects).
    op.execute("DROP TABLE IF EXISTS teacher_subjects CASCADE")

    # 3. results: compact marks columns + short grade; keep PK and FK indexes only.
    op.alter_column('results', 'marks_obtained', type_=sa.Numeric(5, 2))
    op.alter_column('results', 'total_marks', type_=sa.Numeric(5, 2))
    op.alter_column('results', 'percentage', type_=sa.Numeric(5, 2))
    op.alter_column('results', 'grade', type_=sa.String(4))
    op.execute("DROP INDEX IF EXISTS idx_results_student_subject_exam")
    op.execute("DROP INDEX IF EXISTS idx_results_student_exam")

    # 4. day_of_week varchar -> smallint (1=Monday .. 7=Sunday) on timetable and substitutes.
    _convert_day_column('timetable')
    _convert_day_column('substitute_assignments')

    # 5. timetable_settings.start_time varchar -> native time.
    op.execute(
        "ALTER TABLE timetable_settings ALTER COLUMN start_time TYPE TIME USING start_time::time"
    )


def downgrade() -> None:
    # Recreate the two dropped tables (minimal schema).
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('teachers.id'), nullable=False),
        sa.Column('message', sa.String(500), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_table(
        'teacher_subjects',
        sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('subject_id', sa.Integer(), sa.ForeignKey('subjects.id', ondelete='CASCADE'), primary_key=True),
    )

    # results back to double precision / varchar(10) + composite indexes.
    op.alter_column('results', 'marks_obtained', type_=sa.Float())
    op.alter_column('results', 'total_marks', type_=sa.Float())
    op.alter_column('results', 'percentage', type_=sa.Float())
    op.alter_column('results', 'grade', type_=sa.String(10))
    op.create_index('idx_results_student_subject_exam', 'results', ['student_id', 'subject_id', 'exam_type_id'])
    op.create_index('idx_results_student_exam', 'results', ['student_id', 'exam_type_id'])

    # day_of_week smallint -> varchar(20).
    for table in ('timetable', 'substitute_assignments'):
        op.execute(f"""
            UPDATE {table} SET day_of_week = CASE day_of_week
                WHEN '1' THEN 'Monday'
                WHEN '2' THEN 'Tuesday'
                WHEN '3' THEN 'Wednesday'
                WHEN '4' THEN 'Thursday'
                WHEN '5' THEN 'Friday'
                WHEN '6' THEN 'Saturday'
                WHEN '7' THEN 'Sunday'
                ELSE NULL
            END
        """)
        op.execute(f"ALTER TABLE {table} ALTER COLUMN day_of_week TYPE VARCHAR(20)")

    # start_time time -> varchar(10).
    op.execute("ALTER TABLE timetable_settings ALTER COLUMN start_time TYPE VARCHAR(10)")

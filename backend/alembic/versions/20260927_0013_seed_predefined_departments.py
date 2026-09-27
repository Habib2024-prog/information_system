"""Initialize the fixed department catalogue without replacing existing data.

Revision ID: 20260927_0013
Revises: 20260927_0012
"""

from alembic import op

revision = "20260927_0013"
down_revision = "20260927_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Freeze the approved codes here rather than importing mutable app mappings.
    # Identity/timestamp defaults generate new values only for missing codes.
    # Existing IDs, timestamps, deletion state, and references are never updated.
    op.execute("""
        INSERT INTO departments (code) VALUES
            ('education_training'),
            ('dari_language_literature'),
            ('pashto_language_literature'),
            ('arabic_language'),
            ('science'),
            ('mathematics'),
            ('english_language_literature'),
            ('social_sciences'),
            ('religious_sciences'),
            ('computer')
        ON CONFLICT (code) DO NOTHING
    """)


def downgrade() -> None:
    # Retain catalogue data: deleting it could break employee/member references,
    # and we cannot distinguish migrated rows from previously existing rows.
    pass

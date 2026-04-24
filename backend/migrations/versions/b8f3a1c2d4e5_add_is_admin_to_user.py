"""add is_admin to user

Revision ID: b8f3a1c2d4e5
Revises: a660955623be
Create Date: 2026-04-24 04:57:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b8f3a1c2d4e5'
down_revision = 'a660955623be'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('users', 'is_admin')

"""Add canonical username lookup keys.

Revision ID: 20260929_0015
Revises: 20260929_0014
"""

import sqlalchemy as sa
from alembic import op

from app.common.username_normalization import normalize_username


revision = "20260929_0015"
down_revision = "20260929_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    rows = list(bind.execute(sa.text("SELECT id, username FROM users ORDER BY id")).mappings())
    normalized_by_user_id: dict[int, str] = {}
    user_ids_by_normalized: dict[str, list[int]] = {}

    for row in rows:
        user_id = int(row["id"])
        normalized = normalize_username(str(row["username"]))
        if not normalized:
            raise RuntimeError(
                f"Cannot migrate users: username for user ID {user_id} normalizes to an empty value. Resolve it manually."
            )
        normalized_by_user_id[user_id] = normalized
        user_ids_by_normalized.setdefault(normalized, []).append(user_id)

    collisions = [ids for ids in user_ids_by_normalized.values() if len(ids) > 1]
    if collisions:
        collision_ids = "; ".join(",".join(str(user_id) for user_id in ids) for ids in collisions)
        raise RuntimeError(
            "Cannot migrate users: normalized username collisions for user IDs "
            f"{collision_ids}. Resolve these accounts manually before retrying."
        )

    op.add_column("users", sa.Column("username_normalized", sa.Text(), nullable=True))
    for user_id, normalized in normalized_by_user_id.items():
        bind.execute(
            sa.text("UPDATE users SET username_normalized = :normalized WHERE id = :user_id"),
            {"normalized": normalized, "user_id": user_id},
        )
    op.alter_column("users", "username_normalized", nullable=False)
    op.create_unique_constraint("uq_users_username_normalized", "users", ["username_normalized"])


def downgrade() -> None:
    op.drop_constraint("uq_users_username_normalized", "users", type_="unique")
    op.drop_column("users", "username_normalized")

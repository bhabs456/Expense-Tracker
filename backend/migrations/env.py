from alembic import context
from app.db import engine
from app.models import Base


def online():
    with engine.connect() as conn:
        context.configure(connection=conn, target_metadata=Base.metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    from app.db import DATABASE_URL

    context.configure(
        url=DATABASE_URL, target_metadata=Base.metadata, literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    online()

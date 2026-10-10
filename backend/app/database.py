from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

# Enable SQLite foreign keys, WAL mode, and busy timeout for reliability
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def migrate_schema(bind_engine):
    """
    Lightweight backward-compatible schema migration for SQLite.
    Safely adds missing columns without data loss or dropping tables.
    """
    with bind_engine.connect() as conn:
        def add_column_if_missing(table: str, column: str, col_type: str):
            try:
                result = conn.execute(text(f"PRAGMA table_info({table});")).fetchall()
                existing_cols = [row[1] for row in result]
                if existing_cols and column not in existing_cols:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type};"))
                    conn.commit()
            except Exception:
                pass

        add_column_if_missing("sites", "is_active", "BOOLEAN DEFAULT 1 NOT NULL")
        add_column_if_missing("assets", "created_by", "INTEGER")
        add_column_if_missing("hydrotest_records", "recorded_by", "INTEGER")
        add_column_if_missing("audit_logs", "user_id", "INTEGER")
        add_column_if_missing("audit_logs", "target_type", "VARCHAR(50)")
        add_column_if_missing("audit_logs", "target_id", "VARCHAR(100)")
        add_column_if_missing("audit_logs", "outcome", "VARCHAR(50)")
        add_column_if_missing("audit_logs", "ip_address", "VARCHAR(50)")
        add_column_if_missing("audit_logs", "details", "TEXT")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

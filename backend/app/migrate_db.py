"""Database auto-migration helper to dynamically ensure all SQLite tables have all model columns."""
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def migrate_database(db_path: Path):
    if not db_path.exists():
        return

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        from app.database import Base
        import app.models  # Register all models

        for table_name, table in Base.metadata.tables.items():
            cursor.execute(f"PRAGMA table_info({table_name})")
            existing_cols = {row[1]: row for row in cursor.fetchall()}
            if not existing_cols:
                continue

            for col in table.columns:
                if col.name not in existing_cols:
                    col_type = "VARCHAR"
                    type_str = str(col.type).upper()
                    if "INT" in type_str:
                        col_type = "INTEGER"
                    elif "FLOAT" in type_str or "REAL" in type_str or "NUMERIC" in type_str:
                        col_type = "FLOAT"
                    elif "BOOL" in type_str:
                        col_type = "BOOLEAN DEFAULT 0"
                    elif "TEXT" in type_str:
                        col_type = "TEXT"
                    elif "TIME" in type_str or "DATE" in type_str:
                        col_type = "TIMESTAMP"

                    try:
                        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}")
                        print(f"Added column {col.name} to {table_name}")
                    except Exception as e:
                        print(f"Migration notice on {table_name}.{col.name}: {e}")

        conn.commit()
    finally:
        conn.close()

if __name__ == "__main__":
    db_file = Path(__file__).resolve().parent.parent / "storage" / "granitemeasure.db"
    migrate_database(db_file)
    print("Auto-migration complete for", db_file)

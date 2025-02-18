# DB Package wit DrizzleORM

# PGVector Setup:

To enable vector search, you need to enable the vector extension on your Postgres database.

```bash
CREATE EXTENSION vector;
```

To do it automatically on database creation:

```bash
pnpm drizzle-kit generate --custom --name=pgvector_extension
```

Add the following to the 0000_pgvector_extension.sql file:

```sql
CREATE EXTENSION vector;
```

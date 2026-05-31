# DATABASE_STANDARDS.md

## Database Mission

Choose the database that fits the application's data model, scale, consistency, query patterns, team skill, operational maturity, and cost.

Do not choose a database because it is trendy.

## Default Recommendation

For most enterprise and hobby applications:

1. Start with PostgreSQL.
2. Use SQLite for local-first, embedded, mobile, desktop, prototypes, and small apps.
3. Use MySQL when the team/platform already standardizes on it.
4. Add Redis for cache/session/rate-limit/ephemeral state.
5. Add search, analytics, graph, or distributed databases only when the requirement proves it.

## Database Selection Matrix

### PostgreSQL

Use for:

- Most serious relational applications.
- Strong consistency.
- Complex queries.
- JSONB plus relational modeling.
- Full-text search before adopting a search engine.
- Extensions.
- Enterprise and hobby projects.

Avoid when:

- Global multi-region writes are the core requirement and team cannot manage conflict/latency tradeoffs.

### MySQL

Use for:

- Conventional CRUD.
- Existing MySQL infrastructure.
- Teams with strong MySQL operations.
- Enterprise apps requiring Oracle ecosystem support.

Avoid when:

- You need advanced PostgreSQL-style constraints, extensions, or complex analytical SQL.

### SQLite

Use for:

- Local-first apps.
- Desktop/mobile.
- Embedded systems.
- Small hobby apps.
- Tests.
- Edge deployments.
- Single-node apps with simple concurrency needs.

Avoid when:

- Many concurrent writers or distributed access are required.

### Redis

Use for:

- Cache.
- Rate limiting.
- Sessions.
- Distributed ephemeral state.
- Pub/sub where durability is not critical.
- Lightweight queues only with mature queue libraries.

Avoid when:

- You need durable primary relational data.
- You cannot define TTL/invalidation.

### MongoDB

Use for:

- Document-oriented data.
- Flexible evolving schemas.
- JSON-like aggregate storage.
- High write throughput document workloads.

Avoid when:

- Strong relational integrity is central.
- Complex joins are core.
- Transactions across many aggregates are frequent.

### CockroachDB

Use for:

- Distributed SQL.
- Global scale.
- Strong consistency.
- Resilience across regions.
- PostgreSQL-like SQL with distributed behavior.

Avoid when:

- Single-region PostgreSQL is enough.
- Team is not ready for distributed SQL tradeoffs.

### YugabyteDB

Use for:

- PostgreSQL-compatible distributed SQL.
- Cloud-native multi-region workloads.
- Horizontal scale with relational semantics.
- Kubernetes-oriented deployments.

Avoid when:

- Operational complexity is not justified.

### ClickHouse

Use for:

- Analytics.
- Event data.
- Logs/metrics style workloads.
- Fast OLAP queries.
- Append-heavy data.

Avoid when:

- OLTP transactions are the core workload.

### Elasticsearch / OpenSearch

Use for:

- Full-text search.
- Relevance ranking.
- Log search.
- Search suggestions.
- Complex search UX.

Avoid when:

- It is being used as the primary source of truth for transactional data.

### DuckDB

Use for:

- Local analytics.
- Data science workflows.
- Embedded analytical queries.
- File-based analytics over Parquet/CSV.

Avoid when:

- Multi-user OLTP is required.

### Cassandra / ScyllaDB

Use for:

- Massive write scale.
- Wide-column workloads.
- Predictable query patterns.
- High availability across regions.

Avoid when:

- Flexible relational querying is required.

### Neo4j / Graph Databases

Use for:

- Relationship-heavy traversal.
- Fraud graphs.
- Recommendation graphs.
- Network analysis.

Avoid when:

- Simple relational joins are enough.

### Time-series Databases

Use TimescaleDB, InfluxDB, or similar when:

- Time-series query patterns dominate.
- Retention/downsampling matters.
- Metrics, IoT, financial ticks, or monitoring data are core.

## Database Design Rules

- Model the domain clearly.
- Use constraints.
- Use foreign keys where integrity matters.
- Use indexes intentionally.
- Avoid premature denormalization.
- Avoid N+1 queries.
- Avoid unbounded reads.
- Use migrations.
- Plan destructive migrations.
- Use transactions for multi-step consistency.
- Store timestamps in UTC.
- Define timezone strategy.
- Add audit tables/events for sensitive domains.
- Use least-privilege DB users.
- Use connection pooling.
- Monitor slow queries.
- Use EXPLAIN/ANALYZE for critical queries.

## Schema Migration Rules

- Expand and contract for zero-downtime migrations.
- Add nullable column first.
- Backfill safely.
- Deploy app compatibility.
- Enforce not-null/constraints after backfill.
- Remove old column only after all app versions stop using it.
- Never run unsafe large locks in production without plan.

## Hobby Project Guidance

For hobby projects:

- PostgreSQL if backend is serious.
- SQLite if local/single-user/simple.
- Supabase/Postgres if you want managed speed.
- Redis only when cache/rate-limit/session needs exist.
- Avoid Kubernetes/distributed DB unless learning intentionally.

## Enterprise Guidance

For enterprise:

- PostgreSQL/MySQL for standard OLTP.
- Redis for caching.
- Search engine for search.
- ClickHouse for analytics.
- Distributed SQL only for proven multi-region/scale/resilience needs.
- Data warehouse/lakehouse for BI, not primary transactions.

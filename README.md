# Kyra

A full-stack application with database schema management, migrations, and seeding capabilities.

## Docker Setup

### Quick Start

1. Copy the example Docker Compose configuration:
   ```bash
   cp docker-compose.example.yml docker-compose.yml
   ```

2. Create the required directories:
   ```bash
   mkdir -p schema migrations seeds
   ```

3. Start the application:
   ```bash
   docker-compose up -d
   ```

The application will be available at:
- **Web Interface**: http://localhost:3000
- **GraphQL API**: http://localhost:4000

### Services

- **kyra**: Main application container running both backend and frontend
- **postgres**: PostgreSQL 17.4 database with health checks

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:postgres@postgres:5432/postgres`)

## Database Management

Kyra uses three key directories for database management:

### 📁 `schema/`
Contains SQL schema definition files that define your database structure.

- **Purpose**: Define tables, indexes, constraints, and other database objects
- **Format**: `.sql` files with DDL statements
- **Usage**: The CLI applies these files to create the target database schema
- **Example**: `schema/001_users.sql`, `schema/002_posts.sql`

### 📁 `migrations/`
Contains database migration files for schema changes over time.

- **Purpose**: Track and apply incremental database changes
- **Format**: Timestamped `.sql` files with migration commands
- **Generation**: Use `kyra migrate` command to generate migrations automatically
- **Example**: `migrations/2024-07-01_120000_add_user_email.sql`

### 📁 `seeds/`
Contains SQL files to populate the database with initial or test data.

- **Purpose**: Insert default data, test fixtures, or reference data
- **Format**: `.sql` files with INSERT statements
- **Usage**: Applied after schema and migrations during database reset
- **Example**: `seeds/001_default_users.sql`, `seeds/002_sample_data.sql`

## CLI Commands

The Kyra CLI provides several database management commands:

- `kyra migrate [--name <name>] [--dry-run]`: Generate migrations from schema changes
- `kyra apply`: Apply pending migrations to the database
- `kyra reset`: Reset database with fresh schema, migrations, and seeds
- `kyra serve`: Start the application services
- `kyra logs`: View application logs
- `kyra start|stop|restart`: Control application lifecycle

## Development

### Project Structure

- `src/web/`: Nuxt.js frontend application
- `src/server/`: Node.js GraphQL backend
- `src/cli/`: Command-line interface for database management
- `src/types/`: Shared TypeScript types and GraphQL codegen

### Local Development

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start development servers:
   ```bash
   yarn web dev    # Frontend (port 3000)
   yarn server dev # Backend (port 4000)
   ```

## Dependencies

- **migra**: PostgreSQL schema diffing tool (auto-installed in Docker)
- **Node.js 22**: Runtime environment
- **PostgreSQL 17.4**: Database server
- **Nuxt.js**: Frontend framework
- **GraphQL**: API layer
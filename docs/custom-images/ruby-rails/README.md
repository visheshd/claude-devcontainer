# Ruby on Rails Development Environment

A comprehensive Ruby on Rails development environment with Ruby 3.2, Rails 7, and all the essential tools for full-stack web development.

## What's Included

### Ruby Stack
- **Ruby 3.2.6**: Latest stable Ruby via rbenv
- **Rails 7.1+**: Modern Rails framework with Hotwire
- **Bundler 2.5+**: Dependency management
- **RuboCop**: Code linting and formatting with Rails cops

### Database Support
- **PostgreSQL**: Client tools (`psql`) and development headers
- **Redis**: Client tools for caching and background jobs
- **SQLite3**: Lightweight development database

### Frontend Tools
- **Node.js 20**: JavaScript runtime for asset pipeline
- **Yarn**: Package manager for JavaScript dependencies
- **esbuild**: Fast JavaScript bundler
- **Tailwind CSS**: Utility-first CSS framework

### Development Tools
- **RSpec**: Testing framework with factory_bot
- **Sidekiq**: Background job processing
- **ImageMagick + libvips**: Image processing for Active Storage

## Building the Image

```bash
# Build the Rails environment
docker build -f docs/custom-images/ruby-rails/Dockerfile -t claude-rails:latest .

# Test the build
docker run --rm claude-rails:latest rails-start
```

## Using with DevContainer

1. **Initialize DevContainer**:
   ```bash
   claude-devcontainer init -s custom
   ```

2. **Edit `.devcontainer/devcontainer.json`**:
   ```json
   {
     "name": "Ruby on Rails Development",
     "image": "claude-rails:latest",
     "mounts": [
       "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
     ],
     "features": {
       "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
         "servers": "serena,context7"
       }
     },
     "forwardPorts": [3000, 6379, 5432],
     "customizations": {
       "vscode": {
         "extensions": [
           "anthropic.claude-code",
           "Shopify.ruby-lsp",
           "bradlc.vscode-tailwindcss",
           "ms-vscode.vscode-json",
           "rebornix.Ruby"
         ]
       }
     },
     "postCreateCommand": "gem install ruby-lsp && bundle config set --local path vendor/bundle"
   }
   ```

3. **Open in VS Code**:
   - Use "Dev Containers: Reopen in Container"
   - Rails development server will be available on port 3000

## Quick Start Guide

### Create New Rails Application

```bash
# Create a new Rails app with PostgreSQL
rails new myapp --database=postgresql --css=tailwind

# Navigate to the project
cd myapp

# Install dependencies
bin/setup

# Start the development server
bin/rails server
```

### Database Setup

```bash
# Create and configure databases
bin/rails db:create
bin/rails db:migrate

# Generate and run a migration
bin/rails generate migration CreateUsers name:string email:string
bin/rails db:migrate

# Seed the database
bin/rails db:seed

# Access PostgreSQL directly
psql postgresql://postgres:password@localhost:5432/myapp_development
```

### Development Workflow

```bash
# Generate a new resource
bin/rails generate resource Post title:string content:text user:references

# Generate a controller
bin/rails generate controller Posts index show new create

# Generate a model with validations
bin/rails generate model User name:string email:string:uniq

# Run the Rails console
bin/rails console

# Check routes
bin/rails routes

# Run specific tests
rspec spec/models/user_spec.rb

# Format code
rubocop --auto-correct
```

### Background Jobs with Sidekiq

```bash
# Add to Gemfile
echo "gem 'sidekiq'" >> Gemfile
bundle install

# Generate a job
bin/rails generate job EmailNotification

# Start Sidekiq (in separate terminal)
bundle exec sidekiq

# Monitor jobs at http://localhost:4567/sidekiq
```

## Docker Compose Integration

Create `docker-compose.yml` for services:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp_development
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## Testing Setup

### RSpec Configuration

```bash
# Add to Gemfile (development/test group)
group :development, :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails'
  gem 'faker'
end

bundle install

# Initialize RSpec
bin/rails generate rspec:install

# Run tests
rspec
rspec spec/models/
rspec spec/controllers/posts_controller_spec.rb
```

### Factory Bot Example

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name { Faker::Name.full_name }
    email { Faker::Internet.email }
  end
end

# Usage in tests
let(:user) { create(:user) }
```

## Code Quality

### RuboCop Configuration

```yaml
# .rubocop.yml
require:
  - rubocop-rails
  - rubocop-performance

AllCops:
  TargetRubyVersion: 3.2
  NewCops: enable

Style/Documentation:
  Enabled: false

Metrics/BlockLength:
  Exclude:
    - 'spec/**/*'
    - 'config/routes.rb'
```

## Asset Pipeline with esbuild

### Modern JavaScript Setup

```bash
# Install esbuild for Rails
bin/rails javascript:install:esbuild

# Install Tailwind CSS
bin/rails css:install:tailwind

# Build assets (watch mode)
bin/dev
```

## Production Considerations

### Deployment Preparation

```bash
# Precompile assets
RAILS_ENV=production bin/rails assets:precompile

# Database migration (zero-downtime)
bin/rails db:migrate

# Security audit
bundle audit

# Performance testing
bin/rails test:system
```

### Environment Variables

Common Rails environment variables:

```bash
export RAILS_ENV=production
export SECRET_KEY_BASE=your-secret-key
export DATABASE_URL=postgresql://user:pass@host:5432/database
export REDIS_URL=redis://localhost:6379
export RAILS_SERVE_STATIC_FILES=true
export RAILS_LOG_LEVEL=info
```

## VS Code Integration

### Recommended Extensions
- **Shopify Ruby LSP**: Advanced Ruby language support
- **Ruby**: Basic Ruby syntax highlighting
- **Tailwind CSS IntelliSense**: CSS utility suggestions
- **Thunder Client**: API testing directly in VS Code

### Debug Configuration

```json
{
  "type": "rdbg",
  "name": "Debug Rails",
  "request": "launch",
  "command": "bin/rails",
  "script": "server",
  "args": ["-p", "3000"]
}
```

## Performance Tips

### Database Optimization
- Use database indexes for frequently queried columns
- Implement database connection pooling
- Use `includes` to avoid N+1 queries
- Monitor query performance with `bullet` gem

### Caching Strategies
- Fragment caching for expensive view renders
- Redis for session storage and caching
- Action caching for controller actions
- Russian doll caching for nested objects

## Size Information

- **Base**: ~781MB (claude-base)
- **Ruby + Rails stack**: ~400MB
- **Total**: ~1.18GB

Optimized for full-featured Rails development with comprehensive tooling.
# Laravel Development Environment

A comprehensive Laravel development environment with PHP 8.2, Laravel 10+, and all the essential tools for modern PHP web development.

## What's Included

### PHP Stack
- **PHP 8.2**: Latest stable PHP with all essential extensions
- **Composer**: Dependency management and package installation
- **Laravel Installer**: Quick project scaffolding
- **Xdebug**: Debugging and profiling support

### PHP Extensions
- **Database**: mysql, pgsql, sqlite3, redis
- **Web**: xml, curl, gd, mbstring, zip
- **Development**: bcmath, intl, soap, xdebug
- **Performance**: opcache enabled

### Database Support
- **MySQL**: Client tools (`mysql`) and PDO support
- **PostgreSQL**: Client tools (`psql`) and PDO support  
- **SQLite**: Lightweight development database
- **Redis**: Caching and session storage

### Development Tools
- **Laravel Pint**: Code formatting (PHP-CS-Fixer for Laravel)
- **PHPStan**: Static analysis and type checking
- **PHPUnit**: Unit and feature testing framework
- **Node.js + Vite**: Modern asset compilation

## Building the Image

```bash
# Build the Laravel environment
docker build -f docs/custom-images/laravel/Dockerfile -t claude-laravel:latest .

# Test the build
docker run --rm claude-laravel:latest laravel-start
```

## Using with DevContainer

1. **Initialize DevContainer**:
   ```bash
   claude-devcontainer init -s custom
   ```

2. **Edit `.devcontainer/devcontainer.json`**:
   ```json
   {
     "name": "Laravel Development",
     "image": "claude-laravel:latest",
     "mounts": [
       "source=${localEnv:HOME}/.claude,target=/home/claude-user/.claude,type=bind"
     ],
     "features": {
       "ghcr.io/visheshd/claude-devcontainer/claude-mcp:1": {
         "servers": "serena,context7"
       }
     },
     "forwardPorts": [8000, 3306, 5432, 6379, 5173],
     "customizations": {
       "vscode": {
         "extensions": [
           "anthropic.claude-code",
           "bmewburn.vscode-intelephense-client",
           "bradlc.vscode-tailwindcss", 
           "ms-vscode.vscode-json",
           "xdebug.php-debug"
         ]
       }
     },
     "postCreateCommand": "composer global update && npm install -g @vueuse/core"
   }
   ```

3. **Open in VS Code**:
   - Use "Dev Containers: Reopen in Container"
   - Laravel development server will be available on port 8000

## Quick Start Guide

### Create New Laravel Application

```bash
# Create a new Laravel app
laravel new myapp

# Or use Composer
composer create-project laravel/laravel myapp

# Navigate to the project
cd myapp

# Install dependencies
composer install
npm install

# Setup environment
cp .env.example .env
php artisan key:generate

# Start the development server
php artisan serve --host=0.0.0.0 --port=8000
```

### Database Setup

```bash
# Configure database in .env file
echo "DB_CONNECTION=mysql" >> .env
echo "DB_HOST=mysql" >> .env
echo "DB_DATABASE=laravel" >> .env
echo "DB_USERNAME=root" >> .env
echo "DB_PASSWORD=password" >> .env

# Run migrations
php artisan migrate

# Create a new migration
php artisan make:migration create_posts_table

# Rollback migrations
php artisan migrate:rollback

# Seed the database
php artisan db:seed

# Access Tinker REPL
php artisan tinker
```

### Development Workflow

```bash
# Generate resources (Model + Migration + Controller + Resource)
php artisan make:model Post -mcr

# Generate individual components
php artisan make:controller PostController
php artisan make:model User
php artisan make:migration create_users_table
php artisan make:seeder UserSeeder

# Generate API resources
php artisan make:resource PostResource
php artisan make:request StorePostRequest

# Generate jobs and queues
php artisan make:job ProcessEmailJob
php artisan queue:work

# Clear various caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Asset Compilation with Vite

```bash
# Install Laravel frontend dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# Install additional packages
npm install vue @vitejs/plugin-vue
npm install alpinejs
npm install @tailwindcss/forms @tailwindcss/typography
```

## Docker Compose Integration

Create `docker-compose.yml` for services:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: laravel
      MYSQL_USER: laravel
      MYSQL_PASSWORD: password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: laravel
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

  mailpit:
    image: axllent/mailpit
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  mysql_data:
  postgres_data:
```

## Testing Framework

### PHPUnit Configuration

```bash
# Run all tests
php artisan test

# Run specific test file
php artisan test tests/Feature/PostTest.php

# Run tests with coverage
php artisan test --coverage

# Create new tests
php artisan make:test PostTest
php artisan make:test PostTest --unit
```

### Feature Test Example

```php
// tests/Feature/PostTest.php
<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Tests\TestCase;

class PostTest extends TestCase
{
    public function test_user_can_create_post(): void
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->post('/posts', [
            'title' => 'Test Post',
            'content' => 'This is a test post.',
        ]);
        
        $response->assertStatus(302);
        $this->assertDatabaseHas('posts', [
            'title' => 'Test Post',
        ]);
    }
}
```

## Code Quality Tools

### Laravel Pint (Code Formatting)

```bash
# Format all PHP files
./vendor/bin/pint

# Check formatting without fixing
./vendor/bin/pint --test

# Format specific directory
./vendor/bin/pint app/Models
```

### PHPStan (Static Analysis)

```bash
# Analyze codebase
./vendor/bin/phpstan analyse

# Run with specific level (0-10)
./vendor/bin/phpstan analyse --level=8

# Generate baseline for existing issues
./vendor/bin/phpstan analyse --generate-baseline
```

### Configuration Files

Create `pint.json`:
```json
{
    "preset": "laravel",
    "rules": {
        "no_unused_imports": true,
        "ordered_imports": true
    }
}
```

Create `phpstan.neon`:
```neon
parameters:
    level: 8
    paths:
        - app
    ignoreErrors:
        - '#Unsafe usage of new static#'
```

## API Development

### Laravel Sanctum for API Authentication

```bash
# Install Sanctum
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate

# Generate API tokens
$user = User::find(1);
$token = $user->createToken('api-token');
```

### API Resource Example

```php
// app/Http/Resources/PostResource.php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'created_at' => $this->created_at,
            'author' => new UserResource($this->whenLoaded('user')),
        ];
    }
}
```

## Background Jobs and Queues

### Queue Configuration

```bash
# Configure queue driver in .env
QUEUE_CONNECTION=redis

# Generate job class
php artisan make:job SendEmailJob

# Process jobs
php artisan queue:work

# Monitor failed jobs
php artisan queue:failed
php artisan queue:retry all
```

### Job Example

```php
// app/Jobs/SendEmailJob.php
<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        // Send email logic here
    }
}
```

## Debugging with Xdebug

### VS Code Configuration

Create `.vscode/launch.json`:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Listen for Xdebug",
            "type": "php",
            "request": "launch",
            "port": 9003,
            "pathMappings": {
                "/workspace": "${workspaceFolder}"
            }
        }
    ]
}
```

### Usage
1. Set breakpoints in VS Code
2. Start debugging session (F5)
3. Add `XDEBUG_SESSION_START=1` to URL or use browser extension
4. Execute code to hit breakpoints

## Performance Optimization

### Caching Strategies

```bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Application cache
Cache::put('key', 'value', 3600);
Cache::remember('users', 3600, fn () => User::all());
```

### Database Optimization

```bash
# Database query optimization
php artisan db:monitor

# Implement database indexes in migrations
Schema::table('posts', function (Blueprint $table) {
    $table->index(['user_id', 'created_at']);
});
```

## Environment Variables

Common Laravel environment variables:

```bash
export APP_ENV=production
export APP_DEBUG=false
export APP_KEY=base64:generated-key
export DB_CONNECTION=mysql
export DB_HOST=localhost
export DB_DATABASE=laravel
export CACHE_DRIVER=redis
export SESSION_DRIVER=redis
export QUEUE_CONNECTION=redis
```

## Size Information

- **Base**: ~781MB (claude-base)
- **PHP + Laravel stack**: ~350MB
- **Total**: ~1.13GB

Optimized for full-featured Laravel development with comprehensive tooling.
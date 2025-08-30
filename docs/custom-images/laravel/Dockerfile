# Laravel Development Environment  
# Full-stack PHP development with Laravel 10, Composer, and modern tooling
FROM claude-base:latest

# Switch to root for system package installation
USER root

# Install PHP 8.2 and extensions
RUN apt-get update && apt-get install -y \
    # PHP and extensions
    php8.2 \
    php8.2-cli \
    php8.2-fpm \
    php8.2-mysql \
    php8.2-pgsql \
    php8.2-sqlite3 \
    php8.2-redis \
    php8.2-xml \
    php8.2-curl \
    php8.2-gd \
    php8.2-mbstring \
    php8.2-zip \
    php8.2-bcmath \
    php8.2-intl \
    php8.2-soap \
    php8.2-xdebug \
    # Database clients
    mysql-client \
    postgresql-client \
    sqlite3 \
    redis-tools \
    # Additional tools
    nginx \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Switch back to claude-user
USER claude-user

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/home/claude-user/.local/bin --filename=composer \
    && composer --version

# Install Node.js 20 for asset compilation (if not already installed)
USER root
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
USER claude-user

# Install Laravel installer and global tools
RUN composer global require laravel/installer \
    && composer global require laravel/pint \
    && composer global require phpunit/phpunit \
    && composer global require friendsofphp/php-cs-fixer \
    && composer global require phpstan/phpstan

# Add Composer global bin to PATH
ENV PATH="/home/claude-user/.config/composer/vendor/bin:$PATH"

# Install Vite and Laravel Mix tools
RUN npm install -g vite @vitejs/plugin-vue npm-run-all

# Configure PHP for development
USER root
RUN echo "memory_limit = 512M" >> /etc/php/8.2/cli/php.ini \
    && echo "max_execution_time = 300" >> /etc/php/8.2/cli/php.ini \
    && echo "post_max_size = 100M" >> /etc/php/8.2/cli/php.ini \
    && echo "upload_max_filesize = 100M" >> /etc/php/8.2/cli/php.ini \
    && echo "opcache.enable_cli = 1" >> /etc/php/8.2/cli/php.ini

# Configure Xdebug for development
RUN echo "xdebug.mode=develop,debug,coverage" >> /etc/php/8.2/mods-available/xdebug.ini \
    && echo "xdebug.client_host=host.docker.internal" >> /etc/php/8.2/mods-available/xdebug.ini \
    && echo "xdebug.client_port=9003" >> /etc/php/8.2/mods-available/xdebug.ini \
    && echo "xdebug.start_with_request=trigger" >> /etc/php/8.2/mods-available/xdebug.ini

USER claude-user

# Create Laravel project directories
RUN mkdir -p /workspace/laravel-projects

# Create Laravel startup script
RUN echo '#!/bin/bash\n\
echo "🚀 Laravel Development Environment Ready"\n\
echo "PHP: $(php --version | head -1)"\n\
echo "Composer: $(composer --version --no-ansi)"\n\
echo "Laravel: $(laravel --version 2>/dev/null || echo \"Laravel Installer ready\")"\n\
echo "Node.js: $(node --version)"\n\
echo ""\n\
echo "💡 Quick start:"\n\
echo "  laravel new myapp                       # Create new Laravel app"\n\
echo "  cd myapp && php artisan serve           # Start development server"\n\
echo "  php artisan migrate                     # Run migrations"\n\
echo ""\n\
echo "🗄️  Database commands:"\n\
echo "  php artisan migrate                     # Run migrations"\n\
echo "  php artisan migrate:rollback            # Rollback migrations"\n\
echo "  php artisan db:seed                     # Seed database"\n\
echo "  php artisan tinker                      # Interactive REPL"\n\
echo ""\n\
echo "🧪 Development:"\n\
echo "  php artisan make:model Post -mcr        # Create model with migration, controller, resource"\n\
echo "  php artisan queue:work                  # Process background jobs"\n\
echo "  npm run dev                             # Build assets (watch mode)"\n\
echo ""\n\
echo "🔧 Code Quality:"\n\
echo "  ./vendor/bin/pint                       # Format code with Laravel Pint"\n\
echo "  ./vendor/bin/phpstan analyse            # Static analysis"\n\
echo "  php artisan test                        # Run PHPUnit tests"\n\
echo ""\n\
exec startup.sh' > ~/.local/bin/laravel-start \
    && chmod +x ~/.local/bin/laravel-start

# Configure Laravel development environment
ENV APP_ENV=local
ENV APP_DEBUG=true
ENV LOG_CHANNEL=stdout

# Default working directory
WORKDIR /workspace

# Entry point for Laravel development
CMD ["laravel-start"]
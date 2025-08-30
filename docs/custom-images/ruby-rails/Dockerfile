# Ruby on Rails Development Environment
# Full-stack Ruby development with Rails 7, PostgreSQL, Redis, and modern tooling
FROM claude-base:latest

# Switch to root for system package installation
USER root

# Install Ruby dependencies and database clients
RUN apt-get update && apt-get install -y \
    # Ruby runtime dependencies
    libyaml-dev \
    libffi-dev \
    libreadline-dev \
    zlib1g-dev \
    libssl-dev \
    # Database clients
    postgresql-client \
    libpq-dev \
    redis-tools \
    sqlite3 \
    libsqlite3-dev \
    # Image processing (for Active Storage)
    imagemagick \
    libvips-dev \
    # JavaScript runtime for asset pipeline
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Switch back to claude-user
USER claude-user

# Install Ruby using rbenv for version management
RUN git clone https://github.com/rbenv/rbenv.git ~/.rbenv \
    && echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc \
    && echo 'eval "$(rbenv init -)"' >> ~/.bashrc \
    && git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build

# Install Ruby 3.2.6 (latest stable)
ENV PATH="/home/claude-user/.rbenv/bin:$PATH"
RUN ~/.rbenv/bin/rbenv install 3.2.6 \
    && ~/.rbenv/bin/rbenv global 3.2.6 \
    && ~/.rbenv/bin/rbenv rehash

# Update PATH to include rbenv
ENV PATH="/home/claude-user/.rbenv/shims:$PATH"

# Install essential Ruby gems
RUN gem update --system \
    && gem install bundler -v '~> 2.5' \
    && gem install rails -v '~> 7.1' \
    && gem install rubocop rubocop-rails rubocop-performance \
    && gem install rspec-rails factory_bot_rails \
    && gem install redis sidekiq \
    && gem install image_processing

# Install modern JavaScript tools for Rails asset pipeline
RUN npm install -g yarn esbuild tailwindcss

# Create Rails project directories
RUN mkdir -p /workspace/rails-projects

# Create Rails startup script
RUN echo '#!/bin/bash\n\
echo "🚀 Ruby on Rails Development Environment Ready"\n\
echo "Ruby: $(ruby --version)"\n\
echo "Rails: $(rails --version)"\n\
echo "Bundler: $(bundle --version)"\n\
echo "Node.js: $(node --version)"\n\
echo ""\n\
echo "💡 Quick start:"\n\
echo "  rails new myapp --database=postgresql  # Create new Rails app"\n\
echo "  cd myapp && bin/setup                  # Install dependencies"\n\
echo "  bin/rails server                       # Start development server"\n\
echo ""\n\
echo "🗄️  Database commands:"\n\
echo "  bin/rails db:create                    # Create databases"\n\
echo "  bin/rails db:migrate                   # Run migrations"\n\
echo "  bin/rails db:seed                      # Seed database"\n\
echo ""\n\
echo "🧪 Testing:"\n\
echo "  rspec                                   # Run tests"\n\
echo "  rubocop                                 # Check code style"\n\
echo ""\n\
exec startup.sh' > ~/.local/bin/rails-start \
    && chmod +x ~/.local/bin/rails-start

# Configure Rails development environment
ENV RAILS_ENV=development
ENV RAILS_LOG_TO_STDOUT=true

# Default working directory
WORKDIR /workspace

# Entry point for Rails development
CMD ["rails-start"]
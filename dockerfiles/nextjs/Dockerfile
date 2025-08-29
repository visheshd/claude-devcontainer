# Claude Next.js Stack Image
# Optimized for modern web development with Next.js, React, and TypeScript

ARG BASE_IMAGE=claude-base:latest
FROM ${BASE_IMAGE}

# Switch to root for system package installation
USER root

# Install additional system dependencies for web development
RUN apt-get update && apt-get install -y \
    # Image optimization dependencies
    libjpeg-dev \
    libpng-dev \
    libwebp-dev \
    # Sharp dependencies for Next.js image optimization
    libvips-dev \
    # Python for native module builds
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Switch back to claude-user
USER claude-user

# Install Bun (modern JavaScript runtime and package manager)
RUN curl -fsSL https://bun.sh/install | bash

# Switch back to root to install global packages
USER root

# Install pnpm (alternative package manager)
RUN npm install -g pnpm

# Install global development tools
RUN npm install -g \
    typescript \
    @types/node \
    eslint \
    prettier \
    @next/codemod \
    create-next-app \
    vercel \
    serve

# Switch back to claude-user
USER claude-user

# Add Bun to PATH
ENV PATH="/home/claude-user/.bun/bin:${PATH}"

# Note: Additional tools can be installed as needed
# RUN bun install -g wrangler @cloudflare/next-on-pages

# Create workspace directories
RUN mkdir -p \
    /workspace/src \
    /workspace/pages \
    /workspace/app \
    /workspace/components \
    /workspace/lib \
    /workspace/styles \
    /workspace/public \
    /workspace/docs

# Create common configuration files
RUN echo '{\n\
  "extends": ["next", "next/core-web-vitals"],\n\
  "rules": {\n\
    "@next/next/no-html-link-for-pages": "off"\n\
  }\n\
}' > /workspace/.eslintrc.json

RUN echo '{\n\
  "semi": false,\n\
  "trailingComma": "es5",\n\
  "singleQuote": true,\n\
  "tabWidth": 2,\n\
  "useTabs": false\n\
}' > /workspace/.prettierrc

RUN echo 'node_modules/\n\
.next/\n\
out/\n\
.vercel/\n\
*.log\n\
.env*.local\n\
.DS_Store\n\
*.tsbuildinfo\n\
next-env.d.ts' > /workspace/.gitignore

# Create a sample TypeScript configuration
RUN echo '{\n\
  "compilerOptions": {\n\
    "lib": ["dom", "dom.iterable", "es6"],\n\
    "allowJs": true,\n\
    "skipLibCheck": true,\n\
    "strict": true,\n\
    "noEmit": true,\n\
    "esModuleInterop": true,\n\
    "module": "esnext",\n\
    "moduleResolution": "bundler",\n\
    "resolveJsonModule": true,\n\
    "isolatedModules": true,\n\
    "jsx": "preserve",\n\
    "incremental": true,\n\
    "plugins": [\n\
      {\n\
        "name": "next"\n\
      }\n\
    ],\n\
    "baseUrl": ".",\n\
    "paths": {\n\
      "@/*": ["./src/*"],\n\
      "@/components/*": ["./src/components/*"],\n\
      "@/lib/*": ["./src/lib/*"]\n\
    }\n\
  },\n\
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],\n\
  "exclude": ["node_modules"]\n\
}' > /workspace/tsconfig.json

# Create a README with quick start instructions
RUN echo '# Next.js Development Environment\n\
\n\
## Quick Start\n\
\n\
Create a new Next.js project:\n\
```bash\n\
npx create-next-app@latest my-app --typescript --tailwind --eslint --app\n\
# or with Bun\n\
bunx create-next-app@latest my-app --typescript --tailwind --eslint --app\n\
```\n\
\n\
## Development Commands\n\
\n\
- `npm run dev` / `bun dev` - Start development server\n\
- `npm run build` / `bun run build` - Build production app\n\
- `npm run start` / `bun start` - Start production server\n\
- `npm run lint` / `bun lint` - Run ESLint\n\
\n\
## Package Managers Available\n\
\n\
- **npm** - Default Node.js package manager\n\
- **pnpm** - Fast, disk space efficient package manager\n\
- **Bun** - Ultra-fast JavaScript runtime and package manager\n\
\n\
## Tools Available\n\
\n\
- Next.js with App Router support\n\
- TypeScript configuration\n\
- ESLint and Prettier\n\
- Vercel CLI for deployment\n\
- Cloudflare Workers support\n\
' > /workspace/README.md

# Create startup script for Next.js environment
RUN echo '#!/bin/bash\n\
echo "⚡ Next.js Development Environment Ready"\n\
echo "Node.js: $(node --version)"\n\
echo "npm: $(npm --version)"\n\
echo "pnpm: $(pnpm --version)"\n\
echo "Bun: $(bun --version)"\n\
echo "TypeScript: $(tsc --version)"\n\
echo ""\n\
echo "💡 Quick start:"\n\
echo "  npx create-next-app@latest my-app    # Create new Next.js app"\n\
echo "  cd my-app && npm run dev             # Start development"\n\
echo "  or use: bun create next my-app       # With Bun"\n\
echo ""\n\
exec "$@"' > ~/.local/bin/nextjs-start && \
    chmod +x ~/.local/bin/nextjs-start

# Configure development environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development

# Default working directory
WORKDIR /workspace

# Entry point optimized for Next.js development
CMD ["nextjs-start", "claude-code"]
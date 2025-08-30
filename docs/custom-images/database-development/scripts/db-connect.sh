#!/bin/bash
# Database Connection Helper
# Usage: db-connect <environment>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$HOME/.config/db-env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: db-connect <environment>"
    echo ""
    echo "Environments are defined in ~/.config/db-env/connections.yml"
    echo ""
    echo "Examples:"
    echo "  db-connect local-postgres"
    echo "  db-connect staging-mysql" 
    echo "  db-connect dev-sqlite"
    echo ""
    echo "Or use direct connection strings:"
    echo "  db-connect postgres://user:pass@host:5432/dbname"
    echo "  db-connect mysql://user:pass@host:3306/dbname"
    exit 1
}

# Check if environment/URL is provided
if [ $# -eq 0 ]; then
    usage
fi

ENV_OR_URL="$1"

# Check if it's a URL (contains ://)
if [[ "$ENV_OR_URL" == *"://"* ]]; then
    CONNECTION_URL="$ENV_OR_URL"
    
    # Extract database type from URL
    if [[ "$CONNECTION_URL" == postgres* ]]; then
        DB_TYPE="postgres"
    elif [[ "$CONNECTION_URL" == mysql* ]]; then
        DB_TYPE="mysql"
    elif [[ "$CONNECTION_URL" == sqlite* ]]; then
        DB_TYPE="sqlite"
    elif [[ "$CONNECTION_URL" == redis* ]]; then
        DB_TYPE="redis"
    elif [[ "$CONNECTION_URL" == mongodb* ]]; then
        DB_TYPE="mongodb"
    else
        echo -e "${RED}Error: Unknown database type in URL${NC}"
        exit 1
    fi
else
    # Look up environment in config file
    ENV_NAME="$ENV_OR_URL"
    CONFIG_FILE="$CONFIG_DIR/connections.yml"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}Error: Configuration file not found: $CONFIG_FILE${NC}"
        echo -e "${YELLOW}Create it from the example template${NC}"
        exit 1
    fi
    
    # Extract connection details from YAML (simple parsing)
    CONNECTION_URL=$(yq e ".environments.$ENV_NAME.url" "$CONFIG_FILE")
    DB_TYPE=$(yq e ".environments.$ENV_NAME.type" "$CONFIG_FILE")
    
    if [ "$CONNECTION_URL" = "null" ] || [ "$DB_TYPE" = "null" ]; then
        echo -e "${RED}Error: Environment '$ENV_NAME' not found in configuration${NC}"
        echo ""
        echo "Available environments:"
        yq e '.environments | keys | .[]' "$CONFIG_FILE" | sed 's/^/  - /'
        exit 1
    fi
fi

echo -e "${BLUE}Connecting to $DB_TYPE database...${NC}"

# Connect based on database type
case "$DB_TYPE" in
    postgres)
        echo -e "${GREEN}Using pgcli for PostgreSQL connection${NC}"
        exec pgcli "$CONNECTION_URL"
        ;;
    mysql)
        echo -e "${GREEN}Using mycli for MySQL connection${NC}"
        exec mycli "$CONNECTION_URL"
        ;;
    sqlite)
        # Extract file path from sqlite URL
        DB_FILE=$(echo "$CONNECTION_URL" | sed 's|sqlite:///||' | sed 's|sqlite://||')
        echo -e "${GREEN}Using litecli for SQLite connection${NC}"
        exec litecli "$DB_FILE"
        ;;
    redis)
        # Parse redis URL for redis-cli
        REDIS_HOST=$(echo "$CONNECTION_URL" | sed -n 's|redis://\([^:]*\):.*|\1|p')
        REDIS_PORT=$(echo "$CONNECTION_URL" | sed -n 's|redis://[^:]*:\([^/]*\).*|\1|p')
        echo -e "${GREEN}Using redis-cli${NC}"
        exec redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT"
        ;;
    mongodb)
        echo -e "${GREEN}Using mongosh for MongoDB connection${NC}"
        exec mongosh "$CONNECTION_URL"
        ;;
    *)
        echo -e "${RED}Error: Unsupported database type: $DB_TYPE${NC}"
        echo "Supported types: postgres, mysql, sqlite, redis, mongodb"
        exit 1
        ;;
esac
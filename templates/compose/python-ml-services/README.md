# Python ML Services Stack Template

This template provides a complete machine learning development environment with:

- **Python ML Development Container** - Claude Code enabled with ML/AI tools
- **Vector Database (PostgreSQL + pgvector)** - For embeddings and vector search
- **Redis Stack** - Caching, session storage, and Redis Insights GUI
- **Optional Model Server** - Separate service for model deployment

## Services

### App Service (Primary)
- **Image**: `claude-python-ml:latest`
- **Purpose**: Main development environment where VS Code connects
- **Features**: Claude Code, Python 3.11+, Jupyter Lab, LangChain, PyTorch, scikit-learn
- **Ports**: 8888 (Jupyter), 8000 (API), 6006 (TensorBoard)

### Vector Database Service
- **Image**: `pgvector/pgvector:pg15`
- **Purpose**: PostgreSQL with pgvector extension for embeddings
- **Database**: `mldb`
- **Port**: 5432
- **Credentials**: `postgres/postgres` (development only)

### Redis Stack Service
- **Image**: `redis/redis-stack:latest`
- **Purpose**: Caching, session storage, and data structures
- **Ports**: 6379 (Redis), 8001 (Redis Insights GUI)
- **Features**: Redis + RedisSearch + RedisJSON + Redis Insights

### Model Server Service (Optional)
- **Image**: `claude-python-ml:latest`
- **Purpose**: Dedicated model serving and inference
- **Port**: 8002
- **Profile**: Enable with `docker-compose --profile full up`

## Environment Variables

The following environment variables are automatically configured:

```bash
DATABASE_URL=postgresql://postgres:postgres@vectordb:5432/mldb
REDIS_URL=redis://redis:6379
JUPYTER_ENABLE_LAB=yes
PYTHONPATH=/workspace
```

**API Keys** (add to `.env` file):
```bash
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Usage

1. **Initialize Project**:
   ```bash
   claude-devcontainer init --stack python-ml-services
   ```

2. **Open in VS Code**:
   ```bash
   code .
   # Use "Dev Containers: Reopen in Container"
   ```

3. **Access Services**:
   - **Jupyter Lab**: `http://localhost:8888`
   - **Redis Insights**: `http://localhost:8001`
   - **TensorBoard**: `http://localhost:6006`

## Database Management

### Vector Database Operations
```python
import psycopg2
from pgvector.psycopg2 import register_vector

conn = psycopg2.connect("postgresql://postgres:postgres@vectordb:5432/mldb")
register_vector(conn)

# Create vector table
cur = conn.cursor()
cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
cur.execute("CREATE TABLE embeddings (id SERIAL PRIMARY KEY, vector vector(1536))")
```

### Redis Operations
```python
import redis
r = redis.Redis(host='redis', port=6379, decode_responses=True)
r.set('key', 'value')
```

## ML Workflow Examples

### Vector Search Setup
```python
# Store embeddings
import openai
from pgvector.psycopg2 import register_vector

# Generate embedding
embedding = openai.Embedding.create(input="text", model="text-embedding-ada-002")
vector = embedding['data'][0]['embedding']

# Store in database
cur.execute("INSERT INTO embeddings (vector) VALUES (%s)", (vector,))

# Search similar vectors
cur.execute("SELECT * FROM embeddings ORDER BY vector <-> %s LIMIT 5", (query_vector,))
```

### Jupyter Lab Integration
- Pre-configured with ML libraries
- Auto-connects to vector database and Redis
- TensorBoard integration for experiment tracking

## Customization

- **Python Dependencies**: Add to `requirements.txt` or use `uv` with `pyproject.toml`
- **Environment Variables**: Create `.env` file in project root
- **Model Storage**: Use `/models` volume for persistent model storage
- **Additional Services**: Extend `docker-compose.yml` (e.g., MongoDB, Elasticsearch)

## Performance Considerations

- **Memory**: 8GB+ recommended for large ML workloads
- **Storage**: Vector databases can be storage-intensive
- **CPU**: 4+ cores recommended for model training

## Optional Services

Enable additional services with profiles:
```bash
docker-compose --profile full up  # Include model server
```
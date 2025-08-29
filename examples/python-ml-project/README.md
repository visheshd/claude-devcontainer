# Python ML Project with Claude DevContainer

This example demonstrates a Python Machine Learning project configured with Claude DevContainer support.

## Features

- **Python 3.11** with uv package manager
- **Machine Learning Libraries**: NumPy, Pandas, scikit-learn, PyTorch
- **LangChain Ecosystem**: LangChain, LangGraph, LangSmith
- **Jupyter Lab**: Available on port 8888
- **Vector Databases**: ChromaDB, FAISS
- **Claude Integration**: Full MCP server ecosystem

## Quick Start

1. **Open in DevContainer**:
   ```bash
   code .
   # Command Palette: "Dev Containers: Reopen in Container"
   ```

2. **Start Jupyter Lab**:
   ```bash
   jupyter lab --ip=0.0.0.0 --port=8888 --no-browser
   ```

3. **Access Jupyter**: http://localhost:8888

## Project Structure

```
python-ml-project/
├── .devcontainer/
│   └── devcontainer.json     # DevContainer configuration
├── notebooks/                # Jupyter notebooks
├── src/                     # Source code
├── data/                    # Data files
├── models/                  # Trained models
├── requirements.txt         # Python dependencies
├── pyproject.toml          # Project configuration
└── README.md               # This file
```

## Available MCP Servers

- **serena**: Semantic code analysis and refactoring
- **context7**: Up-to-date documentation and examples  
- **langchain-tools**: LangChain development utilities
- **vector-db**: Vector search and embeddings support
- **anthropic-api**: Direct Anthropic API integration

## Environment Variables

Create a `.env` file for configuration:

```env
# Anthropic API
ANTHROPIC_API_KEY=your_api_key

# LangChain/LangSmith
LANGCHAIN_API_KEY=your_langchain_key
LANGCHAIN_PROJECT=your_project_name

# Vector Database Configuration  
CHROMA_PERSIST_DIRECTORY=./data/chroma
```

## Common Tasks

### Install Dependencies
```bash
uv sync
```

### Run Tests
```bash
python -m pytest tests/
```

### Start Development Server
```bash
python src/main.py
```

### Train a Model
```bash
python scripts/train_model.py --data data/training.csv --output models/
```

### Start Jupyter Lab
```bash
jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root
```

## Development Workflow

1. **Code in VS Code**: Full IntelliSense and debugging support
2. **Experiment in Jupyter**: Interactive data analysis and visualization  
3. **Use Claude**: AI assistance with serena MCP for advanced code analysis
4. **Version Control**: Git integration with semantic commit messages
5. **Test Continuously**: Automated testing with pytest

## Example: LangChain RAG Application

```python
from langchain.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI

# Load and process documents
loader = TextLoader('data/documents.txt')
documents = loader.load()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)
texts = text_splitter.split_documents(documents)

# Create vector store
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(
    texts, 
    embeddings,
    persist_directory="./data/chroma"
)

# Create QA chain
qa = RetrievalQA.from_chain_type(
    llm=OpenAI(),
    chain_type="stuff",
    retriever=vectorstore.as_retriever()
)

# Ask questions
result = qa.run("What is the main topic of the document?")
print(result)
```

## Customization

### Add More ML Libraries
Update `requirements.txt` or use uv:
```bash
uv add tensorflow transformers datasets
```

### Configure Different Python Version
Update `.devcontainer/devcontainer.json`:
```json
{
  "build": {
    "args": {
      "PYTHON_VERSION": "3.12"
    }
  }
}
```

### Add Custom MCP Servers
```json
{
  "features": {
    "ghcr.io/your-org/devcontainer-features/claude-mcp:1": {
      "servers": "serena,context7,langchain-tools,custom-ml-server"
    }
  }
}
```

## Troubleshooting

### Jupyter Not Starting
```bash
# Check if port is available
lsof -i :8888

# Start with different port
jupyter lab --port=8889
```

### Package Installation Issues
```bash
# Update uv
uv self update

# Clear cache
uv cache clean

# Reinstall environment
rm -rf .venv
uv sync
```

### CUDA/GPU Support
For GPU support, update the base image:
```json
{
  "image": "ghcr.io/your-org/claude-python-ml:gpu"
}
```
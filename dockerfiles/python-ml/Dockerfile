# Claude Python ML Stack Image
# Optimized for Python ML development with LangChain/LangGraph, PyTorch, and data science libraries

ARG BASE_IMAGE=claude-base:latest
FROM ${BASE_IMAGE}

# Switch to root for system package installation
USER root

# Install Python ML system dependencies (optimized - removed TeX Live)
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3.11-venv \
    python3-pip \
    # Data science and ML dependencies
    libhdf5-dev \
    libnetcdf-dev \
    libopenblas-dev \
    liblapack-dev \
    libblas-dev \
    gfortran \
    # Image and media processing
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    # Scientific computing
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Switch back to claude-user
USER claude-user

# Ensure Python 3.11 is the default python3
RUN sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Upgrade uv to latest version and configure for Python 3.11
RUN ~/.local/bin/uv python install 3.11 && \
    ~/.local/bin/uv python pin 3.11

# Note: Removed duplicate tool installs - will install in venv instead

# Create a virtual environment for ML development
RUN ~/.local/bin/uv venv ~/.venvs/ml --python 3.11

# Install core ML packages (without PyTorch first)
RUN ~/.local/bin/uv pip install \
    --python ~/.venvs/ml/bin/python \
    numpy \
    pandas \
    scikit-learn \
    matplotlib \
    seaborn \
    plotly \
    jupyterlab \
    ipython \
    ipywidgets \
    # LangChain ecosystem  
    langchain \
    langchain-community \
    langchain-experimental \
    langgraph \
    langsmith \
    # Vector databases and retrieval
    chromadb \
    faiss-cpu \
    # OpenAI and Anthropic clients
    openai \
    anthropic \
    # Development tools
    black \
    isort \
    mypy \
    pytest \
    pytest-cov

# Install PyTorch separately with CPU index URL
RUN ~/.local/bin/uv pip install \
    --python ~/.venvs/ml/bin/python \
    --index-url https://download.pytorch.org/whl/cpu \
    torch torchvision torchaudio

# Add ML virtual environment to PATH
ENV PATH="/home/claude-user/.venvs/ml/bin:$PATH"

# Configure Jupyter
RUN mkdir -p ~/.jupyter && \
    echo "c.ServerApp.ip = '0.0.0.0'" >> ~/.jupyter/jupyter_lab_config.py && \
    echo "c.ServerApp.open_browser = False" >> ~/.jupyter/jupyter_lab_config.py && \
    echo "c.ServerApp.port = 8888" >> ~/.jupyter/jupyter_lab_config.py && \
    echo "c.ServerApp.allow_root = False" >> ~/.jupyter/jupyter_lab_config.py

# Create workspace directories
RUN mkdir -p /workspace/notebooks /workspace/data /workspace/models /workspace/scripts

# Set PYTHONPATH to include workspace
ENV PYTHONPATH="/workspace:${PYTHONPATH}"

# Create startup script for Python ML environment (optimized)
RUN echo '#!/bin/bash\n\
echo "🐍 Python ML Environment Ready"\n\
echo "Python: $(python3 --version)"\n\
echo "Virtual env: ~/.venvs/ml"\n\
echo "Jupyter Lab: jupyter lab --ip=0.0.0.0 --port=8888"\n\
echo ""\n\
echo "💡 Quick start:"\n\
echo "  jupyter lab                          # Start Jupyter"\n\
echo "  python -c \"import torch; print(torch.__version__)\" # Test PyTorch"\n\
echo ""\n\
exec startup.sh' > ~/.local/bin/ml-start && \
    chmod +x ~/.local/bin/ml-start

# Default working directory
WORKDIR /workspace

# Entry point optimized for ML development
CMD ["ml-start", "claude-code"]
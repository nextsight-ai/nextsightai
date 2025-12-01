# Contributing to NexOps

Thank you for your interest in contributing to NexOps! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](../../issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Docker version, K8s version)

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with the `enhancement` label
3. Describe the feature and its use case

### Pull Requests

1. Fork the repository
2. Create a feature branch from `develop`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following our coding standards
4. Write/update tests if applicable
5. Update documentation if needed
6. Commit with clear, descriptive messages
7. Push and create a Pull Request to `develop`

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- kubectl configured with a cluster

### Local Development

```bash
# Clone the repository
git clone https://github.com/gauravtayade11/nexops.git
cd NexOps

# Using Docker Compose (recommended)
make dev

# Or manually:
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Coding Standards

### Python (Backend)

- Follow PEP 8 style guide
- Use type hints
- Write docstrings for public functions
- Keep functions focused and small

### TypeScript (Frontend)

- Use TypeScript strict mode
- Follow ESLint configuration
- Use functional components with hooks
- Keep components focused and reusable

### Git Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor" not "Moves cursor")
- Keep first line under 72 characters
- Reference issues when applicable

## Project Structure

```
NexOps/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── core/      # Configuration
│   │   ├── schemas/   # Pydantic models
│   │   └── services/  # Business logic
│   └── tests/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── types/
│   └── tests/
└── k8s/              # Kubernetes manifests
```

## Questions?

Feel free to open an issue for any questions about contributing.

Thank you for contributing!

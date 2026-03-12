# Contributing Guide

Thank you for considering contributing to the Unified Sign-In Platform!

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Use the bug report template
3. Include:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, browser, versions)
   - Screenshots if applicable

### Suggesting Features

1. Check if the feature has been suggested
2. Use the feature request template
3. Explain:
   - Use case
   - Proposed solution
   - Alternative solutions considered
   - Impact on existing functionality

### Pull Requests

#### Before Starting

1. Fork the repository
2. Create a feature branch from `main`
3. Discuss major changes in an issue first

#### Development Process

1. Clone your fork:
   ```bash
   git clone https://github.com/your-username/unified-signin-platform.git
   cd unified-signin-platform
   ```

2. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes following our coding standards

4. Test your changes:
   ```bash
   make test
   ```

5. Commit with clear messages:
   ```bash
   git commit -m "Add feature: description"
   ```

6. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

7. Open a Pull Request

#### PR Guidelines

- Keep PRs focused on a single feature/fix
- Update documentation if needed
- Add tests for new functionality
- Ensure all tests pass
- Follow the PR template
- Link related issues

#### PR Review Process

1. Automated checks must pass
2. At least one maintainer approval required
3. Address review feedback
4. Squash commits if requested
5. Maintainer will merge when ready

## Coding Standards

### Python (Backend)

```python
# Use type hints
def authenticate_user(email: str, password: str) -> Optional[User]:
    pass

# Docstrings for functions
def create_token(user_id: str) -> str:
    """
    Generate JWT token for user.

    Args:
        user_id: Unique user identifier

    Returns:
        JWT token string
    """
    pass

# Follow PEP 8
# Max line length: 100 characters
# Use meaningful variable names
```

### JavaScript/React (Frontend)

```javascript
// Use functional components
const LoginForm = () => {
  const [email, setEmail] = useState('');

  return <form>...</form>;
};

// Prop types or TypeScript
LoginForm.propTypes = {
  onSubmit: PropTypes.func.isRequired
};

// Meaningful component names
// Use hooks appropriately
// Keep components small and focused
```

### Git Commit Messages

```
Format: <type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

Examples:
feat(auth): add Google OAuth integration
fix(login): resolve token refresh issue
docs(api): update authentication endpoints
```

## Testing Requirements

### Backend Tests

```python
# Unit tests for all new functions
def test_create_user():
    user = create_user("test@example.com", "password")
    assert user.email == "test@example.com"

# Integration tests for API endpoints
def test_login_endpoint(client):
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "password"
    })
    assert response.status_code == 200
```

### Frontend Tests

```javascript
// Component tests
test('renders login form', () => {
  render(<LoginForm />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});

// Integration tests
test('submits login form', async () => {
  render(<LoginForm />);
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'test@example.com' }
  });
  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  await waitFor(() => expect(mockLogin).toHaveBeenCalled());
});
```

## Documentation

- Update README.md for user-facing changes
- Update API.md for API changes
- Update ARCHITECTURE.md for architectural changes
- Add inline comments for complex logic
- Update CHANGELOG.md

## Project Structure

```
unified-signin-platform/
├── backend/
│   ├── auth/           # Add auth-related code here
│   ├── middleware/     # Add middleware here
│   ├── tests/          # Add backend tests here
│   └── main.py         # Main application entry
├── frontend/
│   ├── src/
│   │   ├── components/ # Add React components here
│   │   ├── pages/      # Add page components here
│   │   └── utils/      # Add utility functions here
│   └── tests/          # Add frontend tests here
├── docs/               # Add documentation here
└── scripts/            # Add utility scripts here
```

## Development Environment

### Required Tools
- Docker Desktop
- Git
- Node.js 18+
- Python 3.11+
- Code editor (VS Code recommended)

### Recommended VS Code Extensions
- Python
- ESLint
- Prettier
- Docker
- GitLens

## Getting Help

- Check existing documentation
- Search closed issues
- Ask in GitHub Discussions
- Contact maintainers

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in commit history

## License

By contributing, you agree that your contributions will be licensed under the project's license.

Thank you for contributing!

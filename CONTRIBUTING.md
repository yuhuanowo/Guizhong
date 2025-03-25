# Contributing to Guizhong

Thank you for your interest in contributing to Guizhong! Contributing to Guizhong means helping maintain a free, open-source Discord bot that allows users to access essential features without paywalls. Even if you can't contribute code directly, you can participate by submitting issue reports or feature requests.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Contributing Through Issues](#contributing-through-issues)
  - [Contributing Through Code](#contributing-through-code)
- [Pull Request Process](#pull-request-process)
- [Local Development Environment](#local-development-environment)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Contributions](#documentation-contributions)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). We expect all participants to adhere to this code. Please read the full document to understand what behaviors are acceptable and unacceptable.

## How to Contribute

### Contributing Through Issues

If you've found a bug or want to request a new feature, please follow these steps:

1. Check [existing issues](https://github.com/yuhuanowo/Guizhong/issues) to ensure your issue hasn't already been reported
2. Create a new issue using the appropriate template (Bug Report or Feature Request)
3. Provide as much detail as possible:
   - For bug reports: Steps to reproduce, expected behavior, actual behavior, environment details
   - For feature requests: A detailed description of the feature and its use cases

### Contributing Through Code

To contribute code directly, please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write your code and add your improvements
4. Ensure your code adheres to our [Code Style Guidelines](#code-style-guidelines)
5. Run tests to ensure they all pass
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Create a new Pull Request

## Pull Request Process

1. Ensure your fork is synced with the main repository
2. Your pull request should include:
   - A clear title describing your changes
   - A detailed explanation of the purpose and implementation
   - Reference to any related issues (e.g., "Fixes #123")
3. All automated tests must pass
4. Code must be reviewed and approved
5. Follow our [Code Style Guidelines](#code-style-guidelines)

## Local Development Environment

Setting up a local development environment is straightforward:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Guizhong.git
   cd Guizhong
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the configuration file:
   ```bash
   cp config.example.yml config.yml
   ```

4. Edit the `config.yml` file with your necessary API keys and configurations

5. Start development mode:
   ```bash
   npm run start
   ```

## Code Style Guidelines

We use ESLint and Prettier to enforce code style. Please ensure your code follows these rules:

1. Use 4 spaces for indentation
2. Use semicolons to end statements
3. Use single quotes instead of double quotes (unless special cases)
4. Follow modular design principles
5. Write clear comments explaining the purpose of the code

You can check code formatting with:
```bash
npm run lint
```

Automatically fix formatting issues with:
```bash
npm run lint:fix
```

Format code with Prettier:
```bash
npm run format
```

## Testing Guidelines

Before submitting code, please ensure:

1. You've written appropriate unit tests (if applicable)
2. All existing tests pass
3. You've manually tested your feature to ensure it works as expected

Run tests with:
```bash
npm test
```

## Documentation Contributions

Documentation is as important as code. If you find documentation that needs improvement:

1. For simple changes, submit a pull request directly
2. For larger changes, create an issue for discussion first

---

Thank you for contributing to Guizhong! Your support helps this project continue to provide value to Discord users. ❤️

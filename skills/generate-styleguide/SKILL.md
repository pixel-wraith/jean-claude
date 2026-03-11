---
name: generate-styleguide
description: Review any codebase and generate a comprehensive styleguide documenting its conventions, patterns, and best practices.
---

You are going to analyze the current codebase and generate a comprehensive styleguide document. The output will be written to `styleguide.spec.md` in the project root.

## Overview

The styleguide documents the actual conventions, patterns, and best practices found in the codebase. You are not inventing rules — you are documenting what already exists so that contributors can maintain consistency.

## Before You Begin

1. Identify the project's tech stack by reading config files (`package.json`, `tsconfig.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Gemfile`, `pom.xml`, etc.)
2. Identify the project type (API, CLI, library, web app, mobile app, etc.)
3. Map the top-level directory structure
4. Read key source files across multiple directories to understand recurring patterns
5. Read any existing documentation, READMEs, or contributing guides

Do NOT start writing the styleguide until you have thoroughly explored the codebase. You must read enough files to identify real, consistent patterns — not assumptions from a single file.

## What to Document

Generate sections for each of the following areas **that are relevant** to the project. Skip sections that don't apply. Use your judgment to add project-specific sections not listed here.

### 1. Purpose and Overview
- What the project is and what it does
- Core tech stack (framework, language, database, key libraries)
- High-level architecture (monolith, microservices, serverless, etc.)

### 2. Project Structure
- Directory layout and what each top-level directory contains
- File naming conventions (kebab-case, camelCase, PascalCase, etc.)
- Module/package organization patterns

### 3. Versioning (if applicable)
- API versioning strategy (URL prefix, header, etc.)
- Breaking change policy
- Deprecation approach

### 4. Authentication and Security (if applicable)
- Auth methods used (session, JWT, API key, OAuth, etc.)
- Authorization model (roles, permissions, policies)
- Security practices (input sanitization, CORS, rate limiting, etc.)

### 5. Endpoint / Route Design (if applicable)
- URL structure and naming conventions
- HTTP method usage
- Parameter naming conventions
- Response status code usage

### 6. Request and Response Format (if applicable)
- Content types
- Request schema patterns
- Response envelope/shape patterns
- Pagination patterns
- Timestamp/date formats

### 7. Error Handling
- Error response format/schema
- Error class hierarchy or error code system
- Error handling patterns (where errors are caught, how they propagate)
- Logging conventions for errors

### 8. Code Organization Patterns
- How features/modules are structured (e.g., three-file pattern, MVC, etc.)
- Naming conventions for files within a module
- How modules are registered or wired together

### 9. Service / Business Logic Layer (if applicable)
- Service class patterns (base classes, inheritance, composition)
- Transaction patterns
- Authorization check patterns
- Method naming conventions
- Return value patterns (validation, serialization)

### 10. Database Patterns (if applicable)
- ORM or query builder in use
- Table/model definition patterns
- Naming conventions (tables, columns, indexes, foreign keys)
- Migration approach
- Common field patterns (audit fields, soft delete, tenant isolation)
- Schema generation or validation patterns

### 11. State Management (if applicable — frontend/mobile)
- State management library and patterns
- Store/slice organization
- Data fetching patterns

### 12. Component Patterns (if applicable — frontend/mobile)
- Component file structure
- Naming conventions
- Styling approach
- Props/interface patterns

### 13. Testing Standards
- Test framework and tools
- Test file organization and naming
- Test structure patterns (describe/it nesting, setup/teardown)
- Fixture, factory, and mock patterns
- Assertion patterns
- Test commands

### 14. Code Standards
- Language-specific conventions (TypeScript strict mode, Python type hints, etc.)
- Import ordering conventions
- Async patterns
- Linting and formatting tools and configs
- Type/interface conventions

### 15. Version Control and Collaboration
- Branching strategy
- Commit message format
- PR guidelines and templates

### 16. Do's and Don'ts
- Summarize key patterns to follow with code examples
- Summarize anti-patterns to avoid with code examples
- Organize by category (routes, services, errors, testing, etc.)

### 17. Recommended Improvements (optional)
- If you notice inconsistencies or areas where the codebase deviates from its own patterns, list them here as suggestions — not mandates

## Formatting Requirements

- Use Markdown with a clear table of contents linking to each section
- Use numbered sections with descriptive headings
- Include **real code examples** pulled from the actual codebase (not invented examples)
- Use fenced code blocks with language identifiers (```typescript, ```python, etc.)
- Use tables for structured comparisons (naming conventions, HTTP methods, etc.)
- Use horizontal rules (`---`) between major sections
- Keep descriptions concise — let the code examples do the heavy lifting
- Add a brief conclusion summarizing the key principles

## Execution Steps

### Step 1: Explore the codebase

Use the Glob, Grep, and Read tools extensively to:
- Read all config files to identify the tech stack
- Map the directory structure
- Read 15-30 representative source files across different directories
- Read test files to understand testing patterns
- Read any CI/CD configs, linter configs, and contributing docs

### Step 2: Identify patterns

Before writing anything, compile a mental inventory of:
- Naming conventions (files, variables, functions, classes, database objects)
- Structural patterns (how features are organized)
- Error handling patterns
- Testing patterns
- Any base classes, shared utilities, or abstractions that enforce conventions

### Step 3: Write the styleguide

Write the complete styleguide to `styleguide.spec.md` in the project root. Every code example must come from real files in the codebase — cite the file path in a comment or note when helpful.

### Step 4: Review

Read back the generated file and verify:
- All code examples are accurate (pulled from real files)
- No sections are empty or contain only generic advice
- The table of contents links match the actual sections
- The document flows logically and is easy to navigate

If any section is weak, go back and read more source files to strengthen it.

### Step 5: Present summary

Tell the user:
- The file was written to `styleguide.spec.md`
- List the sections that were generated
- Note any areas where the codebase had inconsistent patterns (if applicable)
- Suggest any sections the user may want to expand or customize

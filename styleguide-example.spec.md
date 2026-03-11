# GAPI Style Guide

This style guide documents the conventions, patterns, and best practices used in the Greenplaces API codebase. All contributors should follow these guidelines to maintain consistency across the project.

---

## Table of Contents

1. [Purpose and Overview](#1-purpose-and-overview)
2. [Versioning](#2-versioning)
3. [Authentication and Security](#3-authentication-and-security)
4. [Endpoint Design](#4-endpoint-design)
5. [Request and Response Format](#5-request-and-response-format)
6. [Error Handling](#6-error-handling)
7. [Rate Limiting](#7-rate-limiting)
8. [Route Organization](#8-route-organization)
9. [Service Layer Patterns](#9-service-layer-patterns)
10. [Database Patterns](#10-database-patterns)
11. [Testing Standards](#11-testing-standards)
12. [Code Standards](#12-code-standards)
13. [Version Control and Collaboration](#13-version-control-and-collaboration)
14. [Do's and Don'ts](#14-dos-and-donts)
15. [Recommended Improvements](#15-recommended-improvements)

---

## 1. Purpose and Overview

The Greenplaces API is a multi-tenant REST API built with:

- **Framework**: Hono with OpenAPI support via `@hono/zod-openapi`
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better-Auth with session management
- **Validation**: Zod schemas for runtime validation and type generation
- **Background Jobs**: BullMQ with Redis
- **Testing**: Vitest with MSW for API mocking

The API provides endpoints for managing accounts, companies, locations, projects, tasks, and users with multi-tenant isolation enforced at the database level via Row-Level Security (RLS).

---

## 2. Versioning

### URL Versioning Strategy

All API endpoints are prefixed with a version number:

```
/v1/accounts
/v1/companies
/v1/auth/sign-in
```

### Version Prefix Rules

- All routes are mounted under `/v1` in `src/app.ts`
- New major versions create new route directories (e.g., `src/routes/v2/`)
- Deprecated endpoints remain available until explicit removal

### Breaking Change Policy

- Breaking changes require a new API version
- Non-breaking additions (new optional fields, new endpoints) can be added to existing versions
- Deprecation notices should be communicated before removal

---

## 3. Authentication and Security

### Authentication Methods

**Session-Based Authentication** via Better-Auth:
```typescript
// Middleware chain for authenticated routes
middleware: [
	...endpointLevelMiddleware,
	authenticated,
	rateLimitMiddleware({...}),
],
```

**Service-to-Service Authentication** via API keys:
```typescript
request: {
	headers: z.object({
		'x-service-key': z.string(),
	}),
},
```

### Authorization Model

Four-tier role hierarchy:
1. `SUPER_ADMIN` - Full system access
2. `ACCOUNT_MANAGER` - Account-scoped access
3. `COMPANY_LEAD` - Company-scoped access
4. `ASSIGNEE` - Task-level access
### Multi-Layer Authorization Enforcement

```typescript
// Layer 1: Middleware level
middleware: [authenticated, ...],

// Layer 2: Service level
const canCreate = await accessControl.userCan('create', companies);
	if (!canCreate) {
	throw new ForbiddenError('You are not authorized to create a company.');
}

// Layer 3: Database level (RLS policies)
// Automatically enforced by PostgreSQL
```

### Security Practices

- All connections use HTTPS
- Passwords handled by Better-Auth (never stored in plain text)
- Session tokens stored in HTTP-only cookies
- Rate limiting on all endpoints
- RLS policies prevent cross-tenant data access

---

## 4. Endpoint Design

### URL Structure Convention

**Resource-Based Naming with Plural Nouns:**
```
GET /v1/accounts # List accounts
POST /v1/accounts # Create account
GET /v1/accounts/:accountId # Get specific account
DELETE /v1/accounts/:accountId # Delete account
```

**Nested Resources:**
```
/v1/accounts/:accountId/companies/:companyEntityId/projects/:projectId/tasks/:taskId
```

### Parameter Naming

- Use `camelCase` for parameter names in TypeScript
- Parameter names match the resource type: `accountId`, `companyEntityId`, `projectId`
- Use `entityId` for versionable resources (companies, locations)

### HTTP Methods

| Method   | Purpose              | Response Code        |
| -------- | -------------------- | -------------------- |
| `GET`    | Retrieve resource(s) | 200 OK               |
| `POST`   | Create new resource  | 201 Created          |
| `PATCH`  | Partial update       | 200 OK               |
| `PUT`    | Full replacement     | 200 OK               |
| `DELETE` | Remove resource      | 200 OK (soft delete) |

### Response Codes

| Code | Usage                              |     |
| ---- | ---------------------------------- | --- |
| 200  | Successful GET, PATCH, PUT, DELETE |     |
| 201  | Successful POST (resource created) |     |
| 204  | Success with no content            |     |
| 400  | Invalid request syntax             |     |
| 401  | Authentication required            |     |
| 403  | Insufficient permissions           |     |
| 404  | Resource not found                 |     |
| 409  | Conflict (duplicate resource)      |     |
| 422  | Validation error                   |     |
| 423  | Locked error                       |     |
| 429  | Rate limit exceeded                |     |
| 500  | Internal server error              |     |

---

## 5. Request and Response Format

### Content-Type

- Request: `application/json`
- Response: `application/json`
### Request Schema Definition

```typescript
export const createAccount = createRoute({
	method: 'post',
	path: '/accounts',
	request: {
		body: jsonContentRequired(
			z.object({
				name: z.string().min(1).max(255),
			}),
			'The create account request body',
		),
	},
	responses: {
		[HttpStatusCodes.CREATED]: jsonContent(
			selectAccountSchema,
			'The created account',
		),
		[HttpStatusCodes.CONFLICT]: jsonApiErrorContent('Account already exists'),
	},
});
```

### Response Schema Patterns

**Success Response:**
```json
{
	"id": "uuid",
	"name": "Account Name",
	"slug": "account-name",
	"createdAt": 1704067200,
	"updatedAt": 1704067200,
	"deletedAt": null
}
```

**Collection Response:**
```json
{
	"data": [...],
	"pagination": {
		"page": 1,
		"limit": 20,
		"total": 100
	}
}
```

### Timestamp Format

The codebase uses two distinct timestamp formats:

**1. Audit Timestamps (Unix integers)**

The `createdAt`, `updatedAt`, and `deletedAt` fields are automatically added by the `softDeleteDbTable()` helper and stored as Unix timestamps (integer seconds since epoch):

```typescript
// From src/db/helpers/db-table.ts
createdAt: integer('created_at')
	.notNull()
	.$defaultFn(() => getUnixTime(new Date())),
updatedAt: integer('updated_at')
	.notNull()
	.$defaultFn(() => getUnixTime(new Date()))
	.$onUpdate(() => getUnixTime(new Date())),
deletedAt: integer('deleted_at'), // nullable for soft delete
```

**2. Domain Timestamps (PostgreSQL timestamp)**

All other timestamp fields use PostgreSQL's native `timestamp` type and are coerced to JavaScript `Date` objects in Zod schemas:

```typescript
// Column definition
statusLastUpdatedAt: timestamp('status_last_updated_at').notNull(),

// Zod schema - coerce to Date object
export const selectTaskSchema = createSelectSchema(tasks, {...})
	.extend({
		statusLastUpdatedAt: z.coerce.date(),
	});
```

**Summary:**

| Field Type                                                    | Drizzle Type | Storage                  | Zod Validation    |
| ------------------------------------------------------------- | ------------ | ------------------------ | ----------------- |
| Audit fields (`createdAt`, `updatedAt`, `deletedAt`)          | `integer`    | Unix timestamp (seconds) | `z.number()`      |
| Domain timestamps (`statusLastUpdatedAt`, `assignedAt`, etc.) | `timestamp`  | PostgreSQL timestamp     | `z.coerce.date()` |

---

## 6. Error Handling

### Error Response Format

All errors follow this schema:

```typescript
{
	statusCode: number,
	statusPhrase: string,
	message: string,
	errors: Record<string, string[]>
}
```

**Example Error Response:**
```json
{
	"statusCode": 422,
	"statusPhrase": "Unprocessable Entity",
	"message": "Validation error",
	"errors": {
		"name": ["String must contain at least 1 character"],
		"email": ["Invalid email format"]
	}
}
```

### Custom Error Classes

Use the appropriate error class for each situation:

```typescript
// 400 Bad Request
throw new BadRequestError('Invalid account id.');

// 401 Unauthorized
throw new UnauthorizedError('Authentication required');

// 403 Forbidden
throw new ForbiddenError('You are not authorized to create an account.');

// 404 Not Found
throw new NotFoundError('Account not found');

// 409 Conflict
throw new ConflictError(`An account with the name '${name}' already exists.`);

// 422 Unprocessable Entity
throw new UnprocessableError('Account id is required.');

// 500 Internal Server Error
throw new ServerError('Database connection failed');

// Additional error classes:
// 423 Locked
throw new LockedError('Resource is locked');

// 501 Not Implemented
throw new NotImplementedError('Feature not implemented');

// 503 Service Unavailable
throw new ServiceUnavailableError('Service temporarily unavailable');

// For background jobs (prevents retry)
throw new UnrecoverableError('Job cannot be retried');
```

### Error Handling Pattern in Handlers

```typescript
export const createAccount: AppRouteHandler<CreateAccountRoute> = async (c) => {
	try {
		const { name } = c.req.valid('json');
		const accountService = new AccountService({ context: c });
		const account = await accountService.create(name);
		return c.json(account, HttpStatusCodes.CREATED);
	}
	catch (error) {
		const apiError = ApiError.parse(error);
		apiError.log();
		  
		switch (apiError.statusCode) {
			case HttpStatusCodes.UNAUTHORIZED:
			case HttpStatusCodes.FORBIDDEN:
			case HttpStatusCodes.CONFLICT:
			case HttpStatusCodes.UNPROCESSABLE_ENTITY:
				return c.json(apiError.toResponseError(), apiError.statusCode);
			default:
				return c.json(apiError.toResponseError(), HttpStatusCodes.INTERNAL_SERVER_ERROR);
		}
	}
};
```

### Error Handling Pattern in Services

```typescript
public async create(name: string) {
	try {
		// Business logic here
	}
	catch (error) {
		const apiError = ApiError.parse(error);
		
		apiError.metadata = {
			event: 'account_create',
			requestId: scope?.requestId,
			userId: scope?.authenticatedUser?.id,
			timestamp: new Date().toISOString(),
			payload: { name },
			outcome: 'failure',
		};
		
		apiError.log();
		throw apiError;
	}
}
```

---

## 7. Rate Limiting

### Configuration Pattern

```typescript
middleware: [
	rateLimitMiddleware({
		windowMs: 60 * 1000, // 1 minute window
		max: 60, // 60 requests per window
		keyPrefix: 'ratelimit:accounts:createAccount',
	}),
],
```

### Key Prefix Naming Convention

Pattern: `ratelimit:<resource>:<action>`

Examples:
- `ratelimit:auth:signIn`
- `ratelimit:accounts:createAccount`
- `ratelimit:companies:updateCompany`
### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704067260
```

### Rate Limit Error Response

```json
{
	"statusCode": 429,
	"statusPhrase": "Too Many Requests",
	"message": "Rate limit exceeded. Please try again later.",
	"errors": {}
}
```

---

## 8. Route Organization

### Three-File Pattern

Every resource follows this structure:

```
resource/
├── resource.routes.ts # OpenAPI schema definitions
├── resource.handlers.ts # Request/response handling
└── resource.index.ts # Router registration
```

### Route Definition (*.routes.ts)

```typescript
import { createRoute } from '@hono/zod-openapi';
import { jsonContent, jsonContentRequired, jsonApiErrorContent } from '@/lib/openapi';

const baseTags = ['v1-accounts'];

export const getAccounts = createRoute({
	middleware: [...endpointLevelMiddleware, authenticated],
	tags: baseTags,
	method: 'get',
	path: '/accounts',
	request: {
		query: z.object({
			page: z.coerce.number().optional(),
			limit: z.coerce.number().optional(),
		}),
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			z.array(selectAccountSchema),
			'List of accounts',
		),
	},
});

// Export type for handler typing
export type GetAccountsRoute = typeof getAccounts;
```

### Handler Definition (*.handlers.ts)

```typescript
import { AppRouteHandler } from '@/types';
import type { GetAccountsRoute } from './accounts.routes';

export const getAccounts: AppRouteHandler<GetAccountsRoute> = async (c) => {
	const { page, limit } = c.req.valid('query');
	const accountService = new AccountService({ context: c });
	const accounts = await accountService.getAll({ page, limit });
	return c.json(accounts, HttpStatusCodes.OK);
};
```

### Router Registration (*.index.ts)

```typescript
import { createRouter } from '@/lib/create-app';
import * as routes from './accounts.routes';
import * as handlers from './accounts.handlers';

export const accountsRouter = createRouter()
	.openapi(routes.getAccounts, handlers.getAccounts)
	.openapi(routes.createAccount, handlers.createAccount)
	.openapi(routes.getAccountById, handlers.getAccountById)
	.openapi(routes.deleteAccount, handlers.deleteAccount)
	.route('/accounts/:accountId/companies', companiesRouter);
```

### Naming Conventions
  
**Route Functions:**
- Action-based: `getAccounts`, `createAccount`, `updateAccount`, `deleteAccount`
- Descriptive for complex operations: `getGroupedTasksByProject`
- Verb-noun pattern in camelCase

**Tag Naming:**
- Format: `v1-<resource>`
- Examples: `v1-accounts`, `v1-auth`, `v1-companies`

---

## 9. Service Layer Patterns

### Service Class Hierarchy

Services extend one of two base classes depending on whether the resource supports versioning:

**1. Standard Services** - Extend `Service` for non-versioned resources:
```typescript
// For resources like accounts, users, tasks
export class AccountService extends Service {
	constructor(opts?: ServiceOptions) {
		super(opts);
	}
}
```

**2. Versionable Services** - Extend `VersionableService<T>` for versioned resources:
```typescript
// For resources like companies, locations that track history
export class CompanyService extends VersionableService<z.infer<typeof selectCompanySchema>> {
	protected idColumn = 'entityId';
	protected versionableColumns = ['name'];
	protected updatableColumns = ['description', 'accountManagerId', 'website', 'logo', 'legacyId'];
	protected versionableTable = companies;
	
	constructor(opts?: ServiceOptions) {
		super(opts);
	}
} 

export class LocationService extends VersionableService<z.infer<typeof selectLocationSchema>> {
	protected idColumn = 'entityId';
	protected versionableColumns = [
		'nickname', 'source', 'line1', 'line2', 'city',
		'state', 'postalCode', 'country', 'closed', 'startAt', 'endAt', 'companyEntityId',
	];
	
	protected updatableColumns = ['latitude', 'longitude'];
	protected versionableTable = locations;
	  
	constructor(opts?: ServiceOptions) {
		super(opts);
	}
}
```

### Versionable Service Pattern

Versionable resources maintain a complete history of changes. Each resource has:

- **Entity ID** (`entityId`): A stable identifier shared across all versions
- **Row ID** (`id`): A unique identifier for each version row
- **Versionable Columns**: Changes create a new version row
- **Updatable Columns**: Changes modify existing rows in-place (no new version)

**Required Abstract Properties:**

| Property             | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `idColumn`           | Column name for the shared identifier (typically `'entityId'`)   |
| `versionableColumns` | Array of column names that trigger new versions when changed     |
| `versionableTable`   | The Drizzle table reference                                      |
| `updatableColumns`   | (Optional) Columns that can be updated without creating versions |

**Key Methods Provided by VersionableService:**
```typescript
// Create a new version (used for both create and update)
protected async createVersion(id: string, data: Record<string, unknown>, schema: z.ZodSchema)

// Get the most recent version of a resource
protected async getCurrent(id: string): Promise<T | null>

// Get all versions of a resource (for audit history)
protected async getVersionsById(id: string): Promise<T[]>

// Batch fetch current versions of multiple resources
protected async getBatchCurrent(ids: string[], schema?: z.ZodSchema): Promise<T[]>

// Determine what changed between current and new data
protected getChangedData(current, data, currentSchema, dataSchema)

// Soft delete all versions of a resource
protected async deleteResource(id: string)
```

**Update Flow for Versionable Resources:**
```typescript
public async update(entityId: string, data: Partial<UpdateData>) {
	return this.tenantTransaction(async (tx) => {
		let current = await this.getCurrent(entityId);
		if (!current) throw new NotFoundError('Resource not found');
	
		const changedData = this.getChangedData(current, data, selectSchema, updateSchema);
	
		// Skip if nothing changed
		if (!changedData.updatableChangesFound && !changedData.versionableChangesFound) {
			return current;
		}
	
		// Versionable changes create a new row
		if (changedData.versionableChangesFound) {
			const parsedInsertData = insertSchema.parse({
				...current,
				...changedData.versionableData,
			});
			
			delete (parsedInsertData as any).id;
			
			current = await this.createVersion(entityId, parsedInsertData, insertSchema);
		}
	
		// Updatable changes modify existing rows in-place
		if (changedData.updatableChangesFound) {
			await tx.update(table)
				.set(changedData.updatableData)
				.where(eq(table.entityId, entityId));
			
			current = await this.getCurrent(entityId);
		}
		
		return current;
	});
}
```

**Delta Tracking:**
When versionable columns change, the system automatically records deltas in the `deltas` table:

```typescript
// Automatically called by createVersion()
{
	resourceType: 'companies',
	resourceId: entityId,
	column: 'name',
	oldValue: 'Old Company Name',
	newValue: 'New Company Name',
	updatedBy: 'user-id',
}
```

### Tenant Transaction Pattern

Always use `tenantTransaction()` for database operations:

```typescript
public async getById(id: string) {
	return this.tenantTransaction(async (tx) => {
		const account = await tx.query.accounts.findFirst({
			where: eq(accounts.id, id),
		});
		
		if (!account) {
			throw new NotFoundError('Account not found');
		}
		
		return selectAccountSchema.parse(account);
	});
}
```

### Authorization Checks

> **Note:** `AccessControl` (in `src/lib/access-control/`) is the active authorization engine. `UserCan` (in `src/lib/user-can/`) is deprecated and being migrated.

```typescript
public async create(data: CreateCompanyInput) {
	// Use this.accessControl for authorization (available via base Service class)
	this.accessControl.can('create', 'companies');

	return this.tenantTransaction(async (tx) => {
		// Create logic here
	});
}
```

### Method Naming Conventions

| Pattern           | Usage                           |
| ----------------- | ------------------------------- |
| `create()`        | Create new resource             |
| `getById()`       | Fetch single by ID              |
| `getByLegacyId()` | Fetch by legacy system ID       |
| `getAll()`        | Fetch collection                |
| `update()`        | Modify existing                 |
| `delete()`        | Soft delete                     |
| `_forceDelete()`  | Hard delete (prefixed with `_`) |

### Return Value Patterns

Always parse return values through Zod schemas:

```typescript
const [newAccount] = await tx.insert(accounts)
	.values(data)
	.returning();

return selectAccountSchema.parse(newAccount);
```

---
## 10. Database Patterns

### Table Definition

Use `softDeleteDbTable()` helper for tables with soft delete:

```typescript
export const accounts = softDeleteDbTable(
	'accounts',
	{
		id: uuid('id').primaryKey().defaultRandom().unique(),
		name: varchar({ length: 255 }).notNull().unique(),
		slug: varchar({ length: 255 }).notNull().unique(),
		legacyId: text('legacy_id'),
	},
	undefined,
	(table) => ({
		slugIdx: index('accounts_slug_idx').on(table.slug),
		...createTenantPolicies('accounts', 'id'),
	}),
);
```

### Naming Conventions

| Type                  | Convention             | Example                   |
| --------------------- | ---------------------- | ------------------------- |
| Table names           | snake_case             | `task_assignments`        |
| Column names          | snake_case             | `company_entity_id`       |
| TypeScript properties | camelCase              | `companyEntityId`         |
| Primary keys          | `id`                   | `uuid('id').primaryKey()` |
| Foreign keys          | `<resource>Id`         | `accountId`, `userId`     |
| Index names           | `<table>_<column>_idx` | `accounts_slug_idx`       |

### Common Field Patterns

**Audit Fields (automatic via helper):**
```typescript
createdAt: integer('created_at'),
updatedAt: integer('updated_at'),
deletedAt: integer('deleted_at'), // nullable for soft delete
```

**Tenant Field:**
```typescript
accountId: uuid('account_id').references(() => accounts.id).notNull(),
```

**Entity/Version Field:**
```typescript
entityId: uuid('entity_id').references(() => entities.id).notNull(),
```

**Status Fields:**
```typescript
status: text('status', { enum: taskStatuses }).notNull(),
statusLastUpdatedBy: text('status_last_updated_by').references(() => user.id),
statusLastUpdatedAt: timestamp('status_last_updated_at'),
```

### Zod Schema Generation

**Select Schema (for reading):**
```typescript
export const selectAccountSchema = createSelectSchema(accounts, {
	id: guidColumn,
	accountId: guidColumn,
});
```

**Insert Schema (for creating):**
```typescript
export const insertAccountSchema = createInsertSchema(accounts, {
	id: () => guidColumn().optional(),
});
```


**Create Schema (API input):**
```typescript
export const createAccountSchema = insertAccountSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});
```

### RLS Policy Pattern  

```typescript
(table) => ({
	...createTenantPolicies('accounts'),
})
  
// Which expands to:
read: createTenantReadPolicy('accounts'),
insert: createTenantInsertPolicy('accounts'),
update: createTenantUpdatePolicy('accounts'),
delete: createTenantDeletePolicy('accounts'),
```  

---

## 11. Testing Standards

### Test File Organization

```
test/
├── factories/          # Data factories
├── fixtures/           # Test environment setup
├── helpers/            # Utility functions
├── assertions/         # Custom assertions
├── setup.test.ts       # Test configuration
├── test-setup.ts       # Global test setup
└── test-setup-files.ts # Per-file test setup
```

### Test Structure

```typescript
describe('accounts', () => {
	let testSetup: TestSetup;
	
	beforeEach(() => {
		testSetup = new TestSetup(testApp);
	});
	
	describe('create /accounts', () => {
		beforeAll(() => {
			legacyAuthServer.listen({ onUnhandledRequest: 'error' });
		});
		
		beforeEach(async () => {
			await testSetup.initSuperAdminUser();
		});
		
		afterEach(() => {
			legacyAuthServer.resetHandlers();
		});
		
		afterAll(() => {
			legacyAuthServer.close();
		});
		
		it('should return 201 if it successfully creates an account', async () => {
			// Test implementation
		});
		
		it('should return 401 if the user is not authenticated', async () => {
			// Test implementation
		});
	});
});
```

- Endpoint tests should be listed in order of their status codes. (example: tests asserting that an endpoint returns a 200 should be listed before tests that assert 403 errors status.)

### Fixture Pattern

```typescript
const accountsFixture = new AccountsFixture(testApp);
const response = await accountsFixture.createAccount(
	'Test Account',
	'test-account',
	testSetup.superAdmin!.cookieHeader,
);
  
expect(response.status).toBe(HttpStatusCodes.CREATED);
```

### Factory Pattern

```typescript
const accountFactory = new AccountFactory();
const [account] = await accountFactory.create({ name: 'Test' });
  
// Cleanup handled automatically
await accountFactory.deleteAllFromDB();
```

### MSW Mocking

```typescript
const legacyAuthServer = setupServer(
	LegacyMocksFixture.auth(),
	LegacyMocksFixture.createAccount(),
);
  
beforeAll(() => legacyAuthServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => legacyAuthServer.resetHandlers());
afterAll(() => legacyAuthServer.close());
```

### Assertion Patterns

```typescript
// Schema validation
expect(selectAccountSchema.parse(await response.json())).toEqual({
	createdAt: expect.any(Number),
	deletedAt: null,
	id: expect.any(String),
	name: 'Test Account',
	slug: 'test-account',
	updatedAt: expect.any(Number),
});
  
// Error validation
validateErrorResponse(body, HttpStatusCodes.FORBIDDEN, 'You are not authorized');
```

### Test Commands

```bash
npm run test # Run all tests
npm run test:single <path> # Run single test file
npm run test:ci # CI test run
```

---

## 12. Code Standards

### TypeScript Conventions

**Imports:**
```typescript
// External packages first
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
  
// Internal absolute imports (using @/ alias)
import { ApiError, NotFoundError } from '@/lib/errors';
import { accounts } from '@/db/schema';
import { AccountService } from '@/services/account-service';

// Relative imports last
import type { CreateAccountRoute } from './accounts.routes';
```

**Type Exports:**
```typescript
// Export types alongside route definitions
export type GetAccountsRoute = typeof getAccounts;

// Use inferred types from schemas
type Account = z.infer<typeof selectAccountSchema>;
```

### Async/Await Pattern

`async`/`await` are preferred, but raw Promises are allowed in select cases.

```typescript
// Correct
const account = await accountService.getById(id);

// Incorrect
accountService.getById(id).then(account => {...});
```

### Error Handling

Always wrap async operations in try/catch:

```typescript
try {
	const result = await someAsyncOperation();
	return c.json(result, HttpStatusCodes.OK);
}
catch (error) {
	const apiError = ApiError.parse(error);
	apiError.log();
	return c.json(apiError.toResponseError(), apiError.statusCode);
}
```

### Linting


```bash
npm run lint # Check for issues
npm run lint:fix # Auto-fix issues
```

---

## 13. Version Control and Collaboration

### Branching Strategy

- `main` - Production-ready code
- `eng-<ticket-id>-<description>` - Feature branches

### Commit Message Format

```
<type>: ENG-<ticket-id> <description>

[optional body]

[optional footer]
```


**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples:**
```
feat: ENG-1234 add account deletion endpoint
fix: ENG-4567 resolve session timeout issue
docs: ENG-8901 update installation instructions
```

### Pull Request Guidelines

1. Use template found in `.github/pull_request_template.md`
2. Reference related tickets in PR description
3. Include test coverage for new features
4. Ensure all tests pass before requesting review
5. Keep PRs focused on a single change when possible

---

## 14. Do's and Don'ts

### Do's

**Route Definition:**
```typescript
// DO: Use typed route handlers
export const getAccount: AppRouteHandler<GetAccountRoute> = async (c) => {...}

// DO: Define comprehensive response schemas
responses: {
	[HttpStatusCodes.OK]: jsonContent(schema, 'Description'),
	[HttpStatusCodes.NOT_FOUND]: jsonApiErrorContent('Not found'),
}
```

**Service Layer:**
```typescript
// DO: Use tenantTransaction for all DB operations
return this.tenantTransaction(async (tx) => {...});

// DO: Check authorization before returning data for any operations
this.accessControl.can('create', 'resources');

// DO: Parse return values through Zod
return selectAccountSchema.parse(account);
```

**Error Handling:**
```typescript
// DO: Use appropriate error classes
throw new NotFoundError('Account not found');
throw new ForbiddenError('Not authorized');

// DO: Include metadata for logging
apiError.metadata = { event: 'account_create', userId: user.id };
```

**Testing:**
```typescript
// DO: Use fixtures for test setup
const testSetup = new TestSetup(testApp);
await testSetup.initSuperAdminUser();

// DO: Clean up test data
afterEach(async () => {
	await testSetup.cleanup();
});
```

### Don'ts

**Route Definition:**
```typescript
// DON'T: Skip validation schemas
request: {
	body: z.any(), // Bad - no validation
}

// DON'T: Use generic error responses
responses: {
	500: { description: 'Error' }, // Bad - not specific
}
```

**Service Layer:**
```typescript
// DON'T: Access database directly without tenant context
const account = await db.select().from(accounts); // Bad - bypasses RLS

// DON'T: Skip authorization checks
public async delete(id: string) {
	// Missing authorization check - Bad
	return this.tenantTransaction(async (tx) => {...});
}

// DON'T: Return raw database results
return account; // Bad - not validated
```

**Error Handling:**
```typescript
// DON'T: Use generic Error class
throw new Error('Something went wrong'); // Bad

// DON'T: Swallow errors silently unless a comment is added to explicitely allow this
catch (error) {
	console.log(error); // Bad - error lost
}
```

**Testing:**
```typescript
// DON'T: Leave test data behind
it('creates account', async () => {
	await createAccount(...); // Bad - no cleanup
});

// DON'T: Skip MSW setup/teardown
beforeAll(() => server.listen()); // Missing afterAll/close
```


---

## Conclusion

This style guide documents the patterns and conventions used in the Greenplaces API. Following these guidelines ensures:
- **Consistency** across the codebase
- **Security** through multi-layer authorization
- **Type safety** via Zod validation
- **Maintainability** through standardized patterns
- **Testability** with comprehensive testing infrastructure

For questions or suggestions, please open an issue or discuss with the team.
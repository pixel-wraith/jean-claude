---
name: create-endpoint
description: Create a new API endpoint in the greenplaces-api repo.
allowed-tools: Read, Write, Grep, Bash(gh *), Bash(git *), Bash(npm run test *), Bash(npm run test:single), Bash(npx eslint *), Bash(npm intall --legacy-peer-deps *)
---

We are going to create a new API endpoint.

When we do this, we are going to breaks it up into a minimum of 3 phases:
- boilerplate
- auth validation
- data validation (if applicable)
- action implementation

If no url for a Jira issue has been provided by the user, prompt them to provide it.
- retrieve the issue key from this url (the issue key begins with `ENG-` and is then followed by 4 digits).
- include this URL in the GitHub pull request description for each Phase

If no Method and URL for the new endpoint is provided, prompt the user to enter it.
- use the url to determine where in the directory structure to place the new endpoint.

If the user does not provide a description of what the endpoint is meant to do, prompt them to explain these details.
- ask clarifying questions where relevant to ensure you fully understand the task.

## Phase 1 - Boilerplate

we are going to add a new endpoint to this api

Before you begin making changes, you must create another branch off that one, following this naming convention:
- `partial/{{JIRA_ISSUE_KEY}}-{{BRIEF-DESCRIPTION-OF-CHANGES}}`

the route will be: {{METHOD & ROUTE}} 

I would like you to implement the boilerplate for this new endpoint. this will ONLY include:

- adding a new route configuration with the following criteria:
	- if the routes file doesn't already exist, you will need to create it as `{{FULL_PATH_TO_RESOURCE}}.routes.ts`.
	- this new configuration should be added in alphabetical order of the others.
	- the success response for this route should only include the following json object
```typescript
{
	message: z.string(),
}
```

use the following route configuration as a template:

```typescript
import { createRoute, z } from '@hono/zod-openapi';

import * as HttpStatusCodes from '@/https-status-codes';
import { jsonApiErrorContent } from '@/lib/openapi/helpers/json-api-error-content';
import { jsonContent } from '@/lib/openapi/helpers/json-content';
import { authenticated } from '@/middlewares/authenticated';
import { endpointLevelMiddleware } from '@/middlewares/helpers/endpoint-level-middleware';

const baseTags = ['{{TAGS}}'];

export const {{DESCRIPTIVE_ENDPOINT_VARIABLE_NAME}} = createRoute({
	middleware: [
		...endpointLevelMiddleware,
		authenticated,
		rateLimitMiddleware({
			windowMs: 60 * 1000,
			max: 60,
			keyPrefix: 'ratelimit:{{UNIQUE_KEY_PREFIX}}',
		}),
	],
	tags: baseTags,
	method: '{{METHOD}}',
	path: '{{PATH}}',
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			createMessageObjectSchema('success'),
			'The success placeholder message...this will be replaced in a later ticket.',
		),
		[HttpStatusCodes.UNAUTHORIZED]: jsonApiErrorContent(
			'The unauthorized response',
		),
		[HttpStatusCodes.NOT_FOUND]: jsonApiErrorContent(
			'Resource not found response',
		),
		[HttpStatusCodes.TOO_MANY_REQUESTS]: jsonApiErrorContent(
			'The too many requests response',
		),
		[HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonApiErrorContent(
			'The internal server error response',
		),
	},
});

export type {{DESCRIPTIVE_ENDPOINT_TYPE_NAME}} = typeof {{DESCRIPTIVE_ENDPOINT_VARIABLE_NAME}};
```

- adding a new handler that will include the endpoint functionality
	-  if the handlers file doesn't already exist, you will need to create it as `{{FULL_PATH_TO_RESOURCE}}.handlers.ts`.
	- this new function should be added in alphabetical order of others.
	- for this ticket, you will only include the following code within this handler:
```typescript
try {
	return c.json({ message: 'success' }, HttpStatusCodes.OK);
}
catch (error) {
	const apiError = ApiError.parse(error);
	apiError.log();

	switch (apiError.statusCode) {
		case HttpStatusCodes.UNAUTHORIZED:
		case HttpStatusCodes.NOT_FOUND:
		case HttpStatusCodes.TOO_MANY_REQUESTS
			return c.json(apiError.toResponseError(), apiError.statusCode);
		default:
			return c.json(apiError.toResponseError(), HttpStatusCodes.INTERNAL_SERVER_ERROR);
	}
}
``` 

- adding the route and handler to the router (`{{FULL_PATH_TO_RESOURCE}}.index.ts`)
	- this new config should be added in alphabetical order of other configurations.

- adding tests that verify:
	- the endpoint functions and returns a 200 when a request is made to it
	- if the user is unauthenticated, the endpoint should return a 401 error
	- if the account or company are not found, endpoint should return a 404 error
	- if more than 60 requests are made to this endpoint in less than a minute, the endpoint should return a 429 error
	- if any other error (like a database error) occurs, the endpoint should return a 500 error
		- this will require mocking. we already have a pattern for mocking like this. make sure to review how this is done in other existing tests before adding.
	- the tests should be added to `{{FULL_PATH_TO_RESOURCE}}.test.ts}}`.
	- for the test, you will need to add the request to the `{{FULL_PATH_TO_RESOURCE}}.fixture.ts`
		- if this file doesn't exist, you will need to create it.

After you've made changes for this phase, before you are allowed to mark the phase as complete, you must confirm all of the following are true:
- all tests are passing
	- to run tests, use command `npm run test`
- no linter errors exist in the changed files
- no typescript errors exist in the changed files

The last step, before marking the phase as complete, is to commit and push the changes to this phase's branch, and then create a new PR in GitHub for this branch that is to be merged into the `stagin` branch. Make sure you stick to our PR template structure outlined in `.github/pull_request_template.md`.

in the PR summary, provide a concise summary of the changes that were made.                

make sure to include clear, step by step instructions for other developers to follow so they can manually test these changes.

## Phase 2 - Auth Validation

Before you begin making changes, you must create a new branch following this naming convention:
- `partial/{{JIRA_ISSUE_KEY}}-{{BRIEF-DESCRIPTION-OF-CHANGES}}`

create a new service method in the appropriate service file that accepts:
- accountId - the id of the account found in the 
- companyEntityId
- options - 

Additional requirements
- use `AccessControl` class for auth checks.
- do not use `UserCan` class for auth checks.
- *make sure to follow existing patterns*

If the user does not have permission to perform the specified action, the service method should throw a 403 error.

Update the new endpoint's handler to call the new service method + handle the new auth errors.

Update the new endpoint's route config to support the new 403 error response.

Add tests for this endpoint to assert the new 403 use case.

After you've made changes for this phase, before you are allowed to mark the phase as complete, you must confirm all of the following are true:
- all tests are passing
	- to run tests, use command `npm run test`
- no linter errors exist in the changed files
- no typescript errors exist in the changed files

The last step, before marking the phase as complete, is to commit and push the changes to this phase's branch, and then create a new PR in GitHub for this branch that is to be merged into the previous phase's PR. Make sure you stick to our PR template structure outlined in `.github/pull_request_template.md`.

in the PR summary, provide a concise summary of the changes that were made.                

make sure to include clear, step by step instructions for other developers to follow so they can manually test these changes.

## Phase 3 - Data Validation

Before you begin making changes, you must create a new branch following this naming convention:
- `partial/{{JIRA_ISSUE_KEY}}-{{BRIEF-DESCRIPTION-OF-CHANGES}}`

If this endpoint is receiving any data (ie. query parameters, request body data, etc.) then we need to validate that data.

If the user did not specify these requirements in their initial description, you must prompt them to provide details on how to validate the received data.

Data validation should occur within the service method that was created in Phase 2.

You should use Zod for all data validation.

If validation fails, the user must provide details on what error should be thrown. If they have not provided those details, you must prompt them to provide this information.

You must add or update tests to assert any new use cases that are implemented with these validations (ie. assert specific errors are thrown when vaidation fails)

After you've made changes for this phase, before you are allowed to mark the phase as complete, you must confirm all of the following are true:
- all tests are passing
	- to run tests, use command `npm run test`
- no linter errors exist in the changed files
- no typescript errors exist in the changed files

The last step, before marking the phase as complete, is to commit and push the changes to this phase's branch, and then create a new PR in GitHub for this branch that is to be merged into the previous phase's PR. Make sure you stick to our PR template structure outlined in `.github/pull_request_template.md`.

in the PR summary, provide a concise summary of the changes that were made.                

make sure to include clear, step by step instructions for other developers to follow so they can manually test these changes.

## Phase 4 - Action Implementation

Before you begin making changes, you must create a new branch following this naming convention:
- `partial/{{JIRA_ISSUE_KEY}}-{{BRIEF-DESCRIPTION-OF-CHANGES}}`

In this phase, we are going to implement the purpose of the endpoint (ie. create a resources, update a resource, get some data from the database, etc.)

If the user has not provided clear details on what the primary function of this endpoint is, you must ask them to provide this information.
- Make sure you ask any clarifying questions you have to ensure you fully understand the task before making any changes.

Once you have a clear understanding of the task, you should update the service method created in Phase 2 with the implementation of those details.

Make sure you adhere to existing code patterns.

Once you have completed the implementation, you should add or update tests to confirm the implementation is functioning correctly.

After you've made changes for this phase, before you are allowed to mark the phase as complete, you must confirm all of the following are true:
- all tests are passing
	- to run tests, use command `npm run test`
- no linter errors exist in the changed files
- no typescript errors exist in the changed files

The last step, before marking the phase as complete, is to commit and push the changes to this phase's branch, and then create a new PR in GitHub for this branch that is to be merged into the previous phase's PR. Make sure you stick to our PR template structure outlined in `.github/pull_request_template.md`.

in the PR summary, provide a concise summary of the changes that were made.                

make sure to include clear, step by step instructions for other developers to follow so they can manually test these changes.

---

Before you make any changes, you must do the following:

- analyze all phases outlined in this document
- make sure you read the existing code to ensure you are familiar with our coding patterns.
- make sure you read the docs to ensure you know how to work in our tech stack.
- ask any clarifying questions you may have to ensure you fully understand this task
- once you have a clear understanding of the task, create a step by step plan for yourself outlining all the steps you will take to complete all phases. append your plan to the bottom of this document and use it as your source of truth as you progress through all changes for all phases.

use Context7

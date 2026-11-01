# CommitProof

### Conversations move fast. Commitments shouldn’t get lost.

CommitProof is an AI-assisted conversation review application built around a practical question:

> After a conversation ends, how do we make it easier to understand what was actually agreed?

The project explores the gap between capturing a discussion and helping someone follow through on it, with a focus on reviewing commitments rather than simply producing more text.

Built end to end with a React frontend, a Node.js and TypeScript backend, AI integrations, and cloud deployment on Render.

[Live Demo](https://commitproof.onrender.com) · [Source Code](https://github.com/ankita-suresh/commitproof)

---

## Why CommitProof?

A conversation can contain useful context, tentative ideas, decisions, and promises—all mixed together.

A summary helps someone understand the discussion. A commitment-focused workflow asks a narrower question:

**What did someone actually agree to do?**

CommitProof explores how AI can make that question easier to answer and review.

The intended benefit is straightforward: less time reconstructing conversations, clearer expectations, and a more useful bridge between discussion and follow-through.

## Product Focus

CommitProof is a focused prototype, not a replacement for a full meeting platform.

Its product direction centers on:

- Making commitments easier to identify and review.
- Presenting AI-assisted results through an accessible interface.
- Keeping the user involved in interpreting the output.
- Connecting frontend experience, backend behavior, and AI services into one deployed application.

> AI-generated output should be reviewed against the original conversation before it is treated as an authoritative record.

## Try the Demo

Visit:

https://commitproof.onrender.com

The demo is protected by an access code. Contact the project owner for access.

The application runs on Render’s free instance tier, so the first request after a period of inactivity may take longer to respond.

### Suggested Demo Walkthrough

<!-- Replace this section with the exact steps supported by your application. -->

1. Open the application and enter the demo access code.
2. Provide a supported conversation input.
3. Run the analysis.
4. Review the resulting output alongside the original input.

Use synthetic or non-sensitive material when exploring the demo.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js, TypeScript |
| Server execution | tsx |
| AI provider configuration | Groq API |
| Deployment | Render Web Service |
| Source control | Git and GitHub |

### Configured AI Models

The deployment configuration includes separate model settings for text processing and transcription:

| Configuration | Model |
|---|---|
| `TEXT_MODEL` | `openai/gpt-oss-20b` |
| `TRANSCRIBE_MODEL` | `whisper-large-v3-turbo` |

Model availability depends on the configured provider and account.

## Architecture

The application combines a browser-based interface with a server-side application and external AI services.

```text
┌───────────────────────────┐
│       React client        │
│   User input and review   │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Node.js / TypeScript API │
│   Server-side processing  │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│       AI services         │
│  Configured model calls   │
└───────────────────────────┘
```

Render hosts the deployed service, with the application configured through environment variables.

<!-- Confirm that this diagram matches your implementation before publishing. -->

## Running Locally

### Prerequisites

- A compatible Node.js installation and npm.
- A Groq API key.
- Git.

Check the repository’s `package.json` for any specific Node.js version requirements.

### 1. Clone the Repository

```bash
git clone [https://github.com/ankita-suresh/commitproof.git](https://github.com/ankita-suresh/commitproof.git)
cd commitproof
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Your Environment

Create a local `.env` file using the variables documented below.

If the repository includes `.env.example`, copy it:

```bash
cp .env.example .env
```

Do not commit your populated `.env` file.

### 4. Start Development

<!-- Confirm this script exists in package.json before publishing. -->

```bash
npm run dev
```

Open the local URL printed in the terminal.

## Environment Variables

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Credentials for the configured AI provider |
| `TEXT_MODEL` | Model used for text-processing requests |
| `TRANSCRIBE_MODEL` | Model used for transcription requests |
| `SESSION_SECRET` | Private server-side session configuration |
| `DEMO_ACCESS_CODE` | Access code for the protected demo |
| `PUBLIC_ORIGIN` | Public application origin |
| `NODE_ENV` | Application environment |
| `FREE_TIER_ONLY` | Application-specific free-tier setting |
| `MAX_PROVIDER_ATTEMPTS_PER_HOUR` | Application-specific provider-attempt limit |

The exact behavior of application-specific settings is defined in the source code.

### Production Configuration

The server validates these requirements when `NODE_ENV=production`:

- `SESSION_SECRET` must contain at least 32 characters.
- `DEMO_ACCESS_CODE` must contain at least 12 characters.
- `PUBLIC_ORIGIN` must begin with `https://`.

Example configuration:

```dotenv
NODE_ENV=production

GROQ_API_KEY=replace-with-your-provider-key
TEXT_MODEL=openai/gpt-oss-20b
TRANSCRIBE_MODEL=whisper-large-v3-turbo

SESSION_SECRET=replace-with-a-generated-secret-at-least-32-characters
DEMO_ACCESS_CODE=replace-with-a-private-code-at-least-12-characters
PUBLIC_ORIGIN=[https://your-service.onrender.com](https://your-service.onrender.com)

FREE_TIER_ONLY=true
MAX_PROVIDER_ATTEMPTS_PER_HOUR=20
```

The values above are placeholders, not credentials for the live demo.

### Generate a Session Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated output into `SESSION_SECRET`.

For Render’s environment-variable fields, enter raw values without surrounding quotes or square brackets.

## Deployment

The current application is deployed as a Render Web Service connected to this GitHub repository.

### Deployment Outline

1. Create a Render Web Service connected to the repository.
2. Configure the build command required by the project.
3. Set the start command:

   ```bash
   npm run start
   ```

4. Add the required environment variables.
5. Set `PUBLIC_ORIGIN` to the service’s assigned HTTPS address.
6. Save the configuration and deploy.
7. Review the deployment logs to confirm that the application starts successfully.

### Common Startup Error

```text
Deployment requires SESSION_SECRET (32+ characters),
DEMO_ACCESS_CODE (12+ characters), and an HTTPS PUBLIC_ORIGIN.
```

This means at least one required production value is missing or invalid.

Check:

- Exact environment-variable names.
- Minimum secret and access-code lengths.
- Whether `PUBLIC_ORIGIN` starts directly with `https://`.
- Whether the updated configuration was saved and applied to a new deployment.

Correct:

```dotenv
PUBLIC_ORIGIN=[https://commitproof.onrender.com](https://commitproof.onrender.com)
```

Incorrect:

```dotenv
PUBLIC_ORIGIN=[https://commitproof.onrender.com]
```

## Engineering Scope

This project brings several layers of application development together:

- Frontend implementation with React.
- Backend implementation with Node.js and TypeScript.
- External AI-service configuration.
- Production environment validation.
- Access-controlled demo configuration.
- GitHub-connected cloud deployment.
- Diagnosis of deployment failures through server logs.

The goal is not just to call a model API, but to connect the model-facing functionality to a usable, deployed product.

## Limitations

CommitProof should be evaluated as a prototype.

- AI output can be incomplete or incorrect.
- A conversation’s intent may depend on context that is not present in the input.
- Model availability and external API limits can affect behavior.
- The demo access code is not a substitute for a complete production authentication system.
- Free-tier hosting can introduce startup delays.
- This README does not make guarantees about data retention or provider privacy settings.

Review the implementation and relevant provider policies before using sensitive material.

## Future Directions

The following are potential extensions, not claims about currently implemented features:

- Link extracted commitments to supporting source passages.
- Distinguish firm commitments from suggestions or tentative language.
- Flag missing owners and deadlines without inventing them.
- Let users correct or confirm AI-generated interpretations.
- Evaluate extraction quality against a labeled conversation dataset.
- Add export or task-management integrations.
- Introduce stronger authentication and explicit data-retention controls.

## Author

Ankita Suresh

[GitHub](https://github.com/ankita-suresh)

Built to explore how AI can help turn conversations into clearer follow-through.

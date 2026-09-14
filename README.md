Welcome to your new TanStack Start app!

## Authentication and PostgreSQL

Requires Node.js 22.18+ (or Node.js 24+) and PostgreSQL. Authentication uses
PostgreSQL through `pg`; there is no in-memory user store or default admin login.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and replace `SESSION_SECRET` with the output of
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
3. Start the local database with `docker compose up -d --wait` (requires Docker).
   The example `DATABASE_URL` matches this database. Alternatively, set it to an
   existing local or hosted PostgreSQL database connection URL, including your
   provider's required SSL settings. The Compose credentials are for local development only.
4. Run `npm run db:migrate`. Migrations run transactionally and are tracked, so
   rerunning this command is safe. Run it before starting a new deployment too.
5. Run `npm run dev` and open `/register`.

Registration collects full name, email, and an 8–128 character password, then signs
the user in. Emails are trimmed, lowercased, and uniquely constrained in PostgreSQL.
Passwords use salted scrypt hashes. New users always receive the `user` role.
The home page shows the signed-in user and a logout button; `/login` authenticates
against the same database. `ADMIN_EMAIL` and `ADMIN_PASSWORD` are no longer used.

The encrypted, HTTP-only session cookie stores only the user ID and expires after
seven days. Current-user queries and auth middleware read the latest database record.
Login and registration share a database-backed limit of 20 attempts per email per
15 minutes. TanStack's CSRF middleware protects server-function requests.
For a public deployment, add infrastructure-level per-IP throttling as well.

Docker stores records in the `postgres_data` volume, including across app and
container restarts. `docker compose down` retains data; adding `--volumes` deletes it.
Production requires HTTPS for secure cookies, `DATABASE_URL`, and the same strong
`SESSION_SECRET` on every instance. Environment variables must be provided to the
production server by the host (or Node's `--env-file` option).

Run `npm test` for password and validation checks. Set `TEST_DATABASE_URL` to a
PostgreSQL database to also run the integration test; it creates and removes its
own isolated schema and requires schema creation permission. Without that variable,
the database test is explicitly skipped.

# Getting Started

To run this application:

```bash
npm install
npm run dev
```

# Building For Production

To build this application for production:

```bash
npm run build
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Remove `@tailwindcss/vite` and `tailwindcss` from `package.json`

## Linting & Formatting

This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
npm run lint
npm run format
npm run check
```

## Deploy with Nitro

This project uses Nitro as a generic server adapter, so it can run on any Node-compatible host.

```bash
npm run build
node .output/server/index.mjs
```

The build output is a self-contained Node server. To deploy, push the `.output/` directory to your host (Render, Fly.io, your own VPS, etc.) and run the server command above.

For host-specific presets (Vercel, Netlify, Cloudflare, AWS Lambda, etc.) and tuning, see https://v3.nitro.build/deploy.

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router'
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')

  useEffect(() => {
    getServerTime().then(setTime)
  }, [])

  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).

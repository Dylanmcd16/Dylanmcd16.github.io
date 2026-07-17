# Dylan McDermott Portfolio

A simple one-page React and TypeScript portfolio designed for GitHub Pages.

## Run locally

```powershell
npm install
npm run dev
```

Open the local address shown by Vite, usually `http://localhost:5173`.

## Customize the content

Most visible text is stored in one file:

```text
src/data/portfolio.ts
```

Edit that file to change your biography, links, projects, experience, research, and skills.

The main layout is in:

```text
src/App.tsx
```

The visual design is in:

```text
src/index.css
```

## Add your résumé

Place your PDF here:

```text
public/resume.pdf
```

The Résumé link will then work automatically.

## Deploy from the existing McDermott_Portfolio repository

The included `vite.config.ts` is already configured for:

```text
https://dylanmcd16.github.io/McDermott_Portfolio/
```

Push the files to the `main` branch, then on GitHub:

1. Open **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and confirm the deployment succeeds.

Every later push to `main` will redeploy the site.

## Use the shorter dylanmcd16.github.io address

Rename the GitHub repository to:

```text
Dylanmcd16.github.io
```

Then change this line in `vite.config.ts`:

```ts
base: '/McDermott_Portfolio/',
```

to:

```ts
base: '/',
```

The site will then be available at:

```text
https://dylanmcd16.github.io/
```

## Production check

```powershell
npm run build
npm run preview
```

The production files are generated in `dist/`. Do not commit `dist`; GitHub Actions builds it automatically.

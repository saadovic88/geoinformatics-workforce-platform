<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2519d64e-7ecb-4e59-a396-02397a29b803

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

Import the GitHub repository in Vercel. Vercel detects Vite automatically; the included `vercel.json` also makes client-side routes work on refresh.

In **Vercel → Project → Settings → Environment Variables**, add:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Use the publishable Supabase key only. Do not add `SUPABASE_SERVICE_ROLE_KEY` or any `sb_secret_*` key to Vercel's browser build variables.

## Resetting company passwords safely

The local-only command below resets the password for every **active** workforce account. It is deliberately protected so it cannot run by accident. Keep the service-role key and `INITIAL_PASSWORD` in the local `.env` file only; never add them to Vercel or Git.

Choose a memorable temporary password of at least 12 characters, place it in `INITIAL_PASSWORD`, then run this in PowerShell only when the reset has been approved:

```powershell
$env:RESET_ALL_PASSWORDS='CONFIRM_COMPANY_PASSWORD_RESET'; npm run reset:passwords
```

Afterward, create the local handover list if needed with `npm run export:credentials`, keep that file private, and ask employees to choose their own password at first sign-in.

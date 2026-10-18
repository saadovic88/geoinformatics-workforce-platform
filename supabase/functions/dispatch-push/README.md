# Device notifications deployment

This function sends a company notification to the employee's registered web
devices. It never exposes the VAPID private key to the browser.

1. Run `0015_web_push_subscriptions.sql` in the Supabase SQL Editor.
2. Generate one company VAPID key pair on an administrator machine:
   `npx web-push generate-vapid-keys`
3. Store the keys in Supabase Edge Function secrets (never Git or Vercel
   browser variables):
   `supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:it@geoinformatics.com"`
4. Deploy the authenticated function:
   `supabase functions deploy dispatch-push`
5. Add only `VITE_VAPID_PUBLIC_KEY` to Vercel Production/Preview environment
   variables, redeploy, then open the app and click the bell → device-notification
   button once on each device.

Android, Windows, macOS, and modern Chromium browsers support installed-PWA
push. On iPhone/iPad, use Safari 16.4+ and install the platform to the Home
Screen before enabling notifications. The app inbox remains the durable fallback
for every device and for users who decline browser permission.

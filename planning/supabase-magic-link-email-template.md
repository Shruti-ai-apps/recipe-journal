# Supabase Magic Link Email Template

These are **Supabase Auth settings**, not something the app can fully control in code.

Where to configure:
- Supabase Dashboard → **Authentication** → **Email Templates**
- Make sure you edit the template used for **Magic Link** / **Email** sign-in (naming varies by dashboard version).

## From

Display name: `Recipe Journal`  
Email: `no-reply@yourdomain.com`

Note: The "From" address is controlled by your **SMTP settings** (Supabase Dashboard → Auth → SMTP). If you’re using the default Supabase mailer, you may not be able to set a custom from-domain.

If you still see emails from `Supabase Auth <noreply@mail.app.supabase.io>`, that means custom SMTP is not configured yet (expected).

## Subject

`Your sign-in link for Recipe Journal 🍲`

## Body

Use this copy (keep the template's required variables / link placeholder where Supabase expects it):

Heres your secure, one-time sign-in link for Recipe Journal.
Click the link below to continue and access your saved recipes, scaling tools, and favorites.
This link is valid for a short time and can be used only once.
If you didnt request this email, you can safely ignore it.

Happy cooking,
The Recipe Journal Team

### Tip: avoid opening a new window/tab

If your template includes an HTML link, **do not** add `target="_blank"` to the anchor tag. Some email clients still open links in a new tab/window regardless, but removing `target` helps.

## Common local dev failure: `error_code=otp_expired`

If clicking the email link sends you to `/auth/callback?error=access_denied&error_code=otp_expired...` very quickly:
- Make sure you click the **most recent** email (new requests can invalidate prior links).
- Increase the **OTP expiry** in Supabase Auth settings (Dashboard → Authentication → Settings).
- Ensure your project’s **Site URL** and **Redirect URLs** include `http://localhost:3000/auth/callback` (and your production URL).

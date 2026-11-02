# Gym Log — setup guide

This takes about 20 minutes, once. You need a Google account and a free GitHub account.
No coding is required: you'll copy, paste and click.

There are three parts:

- **Google Sheet + Apps Script**: where your sessions end up (steps 1–4).
- **GitHub Pages**: hosts the app so your phone can open it (step 5).
- **Your phone**: install the app and connect it to the Sheet (steps 6–7).

---

## 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **Blank spreadsheet**.
2. Name it, for example **Gym Log**.

You don't need to add any tabs or headers. The script creates the **Sessions** and **Sets** tabs the first time it runs.

## 2. Add the script

1. In the Sheet, open **Extensions → Apps Script**. A new tab opens with a file called `Code.gs`.
2. Delete everything in that file.
3. Open [`apps-script/Code.gs`](apps-script/Code.gs) from this project, copy **all** of it, and paste it in.
4. Click the **Save** icon (💾), or press Ctrl+S.
5. Optionally, rename the project at the top left (e.g. "Gym Log backend").

## 3. Create the secret token

The token is a long password that only your phone and the script know. Without it, the script refuses every request.

**The easy way (recommended):**

1. In the Apps Script toolbar, pick **`createSecretToken`** in the function dropdown, which is next to **Run** and **Debug**.
2. Click **Run**.
3. The first time, Google asks for permission:
   1. Click **Review permissions** and choose your Google account.
   2. You'll see **"Google hasn't verified this app"**. That's expected, because it's your own script. Click **Advanced → Go to Gym Log backend (unsafe)**.
   3. Click **Allow**.
4. The **Execution log** at the bottom shows `Your secret token … : 3f9c…`. Copy the long string after the colon and keep it somewhere safe, such as your password manager. You'll paste it into the app in step 7.

**The manual way:** open **Project Settings** (the ⚙️ on the left) → **Script Properties** → **Add script property**. Set **Property** to `SECRET_TOKEN` and **Value** to a long random string of 40 or more characters, then click **Save script properties**.

**Optional check:** pick **`selfTest`** in the dropdown and click **Run**. It saves a test session twice, checks that only one copy landed in the Sheet, then deletes it. The log should end with **"Self test PASSED."**

## 4. Deploy the script as a web app

1. Click **Deploy → New deployment** (top right).
2. Click the ⚙️ next to **Select type** and choose **Web app**.
3. Fill in:
   - **Description**: `Gym Log v1`
   - **Execute as**: **Me** (your email)
   - **Who has access**: **Anyone**

   "Anyone" lets your phone reach the script without signing in to Google. The secret token is what keeps everyone else out.
4. Click **Deploy**. If asked to authorise again, repeat the permission steps from step 3.
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy…/exec`. You'll paste it into the app in step 7.

To check it works, open that URL in a browser. You should see *"Gym Log endpoint is running."*

### Changing the script later (keeps the same URL)

If you edit `Code.gs`:

1. Save the file.
2. Click **Deploy → Manage deployments**.
3. Select your deployment and click the ✏️ **Edit** (pencil) icon.
4. Under **Version**, choose **New version**.
5. Click **Deploy**.

The URL stays the same, so you don't need to change anything on your phone.

⚠️ Don't use **Deploy → New deployment** for updates. That creates a **new URL**, and the app would keep sending to the old one.

## 5. Publish the app on GitHub Pages

1. Sign in at [github.com](https://github.com) (create a free account if needed).
2. Click **+ → New repository**:
   - **Repository name**: `gym-log`
   - Visibility: **Public**. GitHub Pages is free for public repos. Nothing secret is in these files: the token and URL only ever live on your phone.
   - Click **Create repository**.
3. On the new repo's page, click **uploading an existing file**, or use **Add file → Upload files**.
4. Open this project folder on your computer. Select **everything inside it** (`index.html`, `styles.css`, `sw.js`, `manifest.webmanifest`, and the folders `js`, `data`, `icons`, `apps-script`, `tests`, plus the `.md` files), then drag it all onto the upload page. Make sure the folders keep their structure.
5. Click **Commit changes**.
6. Go to **Settings → Pages** (in the left menu):
   - **Source**: **Deploy from a branch**
   - **Branch**: `main`, folder `/ (root)`
   - Click **Save**.
7. Wait a minute or two, then refresh that page. It shows **"Your site is live at `https://<your-username>.github.io/gym-log/`"**. That's your app's address.

### Releasing a change to the app

1. Edit the files.
2. Open `sw.js` and bump the version on the line `const CACHE_VERSION = 'gym-log-v1';`, e.g. to `'gym-log-v2'`.
3. Upload the changed files to GitHub again (same **Add file → Upload files**; it replaces files with the same name).
4. After a few minutes, open the app on your phone. You'll see **"Update available — Reload"**. Tap **Reload**.

If you forget step 2, your phone keeps running the old version.

## 6. Install on your Android phone

1. Open **Chrome** on the phone and go to `https://<your-username>.github.io/gym-log/`.
2. Tap the **⋮** menu → **Add to Home screen** → **Install**. On some phones the option is called **Install app**.
3. **Gym Log** now has an icon on your home screen. It opens full-screen, like a normal app.

Open it once while you have signal. After that it works with no signal at all.

## 7. Connect the app to your Sheet

1. In the app, tap the ⚙️ (top right of the home screen) to open **Settings**.
2. Paste the **Apps Script web app URL** from step 4.
3. Paste the **secret token** from step 3.
4. Tap **Test connection**. You should see **✓ Connected to "Gym Log" (0 sessions so far)**.

Done. Log a session, tap **Complete**, and it appears in the Sheet's **Sessions** and **Sets** tabs.

---

## How syncing works

- Everything is saved on the phone first, as you type. If the app is closed or the phone locks mid-session, reopening it takes you straight back to the session.
- When you complete a session, the app sends it to the Sheet straight away. If there's no signal, it stays queued and shows **Saved on phone**. The app retries when it next opens or comes back online.
- **Failed · retry** means a send was tried and didn't work. Tap it to retry. On the session's page you can read the reason, such as a wrong token or a wrong URL.
- Sending the same session twice never creates duplicate rows. The script recognises the session ID.

## The Sheet

| Tab | One row per | Columns |
|---|---|---|
| **Sessions** | session | `session_id, started_at, ended_at, duration_min, exercise_count, set_count, notes, synced_at` |
| **Sets** | set | `set_id, session_id, session_date, exercise_order, exercise_name, muscle_group, pattern, tier, load_type, weight_kg, reps, rir, set_number, exercise_notes` |

- **Times and dates** are real date-time values in UK time (the script sets the Sheet's time zone to Europe/London). They're displayed as `2026-11-02T18:05:00`, so pivots and Power BI treat them as dates.
- **`tier`** is a number from 1 to 5 (M1–M5).
- **`weight_kg`** depends on `load_type`:
  - **Weighted**: the load.
  - **Bodyweight**: added load (0 = plain bodyweight).
  - **Assisted**: the kg of assistance, as a positive number.
- Join the two tabs on `session_id`. Volume isn't stored; calculate it in the Sheet, e.g. `weight_kg * reps`.

## Troubleshooting

| Message | Fix |
|---|---|
| **Wrong or missing token.** | The token in the app doesn't match `SECRET_TOKEN`. Copy it again, with no spaces. |
| **SECRET_TOKEN is not set…** | Do step 3. |
| **Script didn't reply with JSON…** | The URL is wrong, or access isn't **Anyone**. Use the URL ending in `/exec`, and check step 4. |
| **Network error** | No signal, or the URL has a typo. |
| Changes to `Code.gs` aren't taking effect | Redeploy with **Manage deployments → Edit → New version** (see step 4). |
| The phone still shows the old app | Bump `CACHE_VERSION` in `sw.js` and upload again. |

**Backup:** **Settings → Export all data as CSV** downloads every session stored on the phone, one row per set.

# Quote requests: setup (free, about 10 minutes)

Quote requests from `contact.html` go into a Google Sheet. The team gets an email for each one, and a Telegram message if you set that up. All you need is a Google account. You don't need a card or a paid plan.

Until you finish these steps, the form still works: it opens WhatsApp with the request filled in.

---

## 1. Create the sheet

1. Go to **sheets.google.com** and sign in with the account that should own the requests (ideally a company Gmail).
2. Create a blank spreadsheet and name it **Optimus Medical – Quote requests**.

## 2. Add the script

1. In the sheet, open **Extensions → Apps Script**.
2. Delete everything in the editor and paste the whole of `backend/Code.gs`.
3. In the **CONFIG** block at the top, set:
   - `ALERT_EMAILS`: the address that should receive alerts. For several, separate them with commas: `"sales@x.com, owner@x.com"`.
   - Leave the Telegram lines empty for now (see step 6).
4. Click **Save** (the disk icon) and name the project **Quote requests**.

## 3. Create the sheet layout

1. In the function menu at the top (next to **Debug**), choose **setup** and click **Run**.
2. Google asks for permission. Click **Review permissions**, pick your account, then **Advanced → Go to Quote requests (unsafe) → Allow**.
   "Unsafe" only means you wrote the script yourself and Google hasn't reviewed it.
3. Go back to the sheet. A **Requests** tab now exists with headers and a Status dropdown.

## 4. Test the email

1. Choose **testAlert** in the function menu and click **Run**.
2. Within a minute you should get an email titled *Quote request OM-TEST-0000 from Test Customer, Test Hospital*. If it doesn't arrive, check Spam.

## 5. Put it online

1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.
5. Open `contact.html` in a text editor (Notepad is fine) and find this line near the bottom:
   ```js
   var SHEET_URL = "";
   ```
   Paste the URL between the quotes:
   ```js
   var SHEET_URL = "https://script.google.com/macros/s/AKfy.../exec";
   ```
6. Save the file, then send a test request from the page. You should see "Request received", a new row in the sheet, and an email.

> **If you change Code.gs later:** use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. This keeps the same URL. "New deployment" would create a new URL, and you'd have to paste it into contact.html again.

## 6. Optional: Telegram alert (free, instant on your phone)

1. In Telegram, message **@BotFather**, send `/newbot`, and follow the prompts. It gives you a **token** like `123456:ABC…`.
2. Send any message to your new bot, or add it to the team group and post a message there.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and copy the `"chat":{"id": …}` number. Group ids start with `-`.
4. Put both values into CONFIG (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`), save, run **testAlert**, then redeploy as a new version (see the note at the end of step 5).

---

## Spam and abuse limits (already built in)

Google Apps Script can't see a visitor's IP address, so the limits work per phone number and against bots:

| Check | Setting | What happens |
|---|---|---|
| Same phone number | 3 requests per day | The 4th is refused, and the visitor is told to call or WhatsApp instead |
| Exact repeat (double-click, resend) | within 10 minutes | Not saved again; the visitor gets the same reference |
| Hidden "website" field filled in | — | Treated as a bot: shows success, but nothing is saved or emailed |
| Form sent in under 4 seconds | — | Treated as a bot (same as above) |
| Alert emails | 80 per day | Requests are still saved after that, just not emailed (Gmail's free limit is 100) |
| Same browser | 5 per day | Checked on the page before anything is sent |
| Very long text / huge lists | trimmed | Message 2000 characters, 60 items, quantity 99 max |

Change any of these in the `LIMITS` block of Code.gs, then redeploy as a new version.

## Using the sheet

- New requests appear at the bottom with **Status = New**. Change the status from the dropdown as you work: Contacted → Quoted → Won / Lost, or Spam.
- The **WhatsApp** column is a link that opens a chat with the customer.
- **Reply** to the alert email and it goes straight to the customer, if they gave an email address.
- Write anything internal in **Staff notes**.
- Share the sheet with colleagues through Google's **Share** button. Don't share the script project.

## Troubleshooting

| Symptom | Fix |
|---|---|
| The page says "We couldn't send this" | Check that `SHEET_URL` ends in `/exec` and the deployment has **Who has access: Anyone** |
| A row appears but no email arrives | Check Spam, then the `ALERT_EMAILS` spelling. Also check **Executions** in Apps Script for errors |
| Changes to Code.gs have no effect | You must redeploy as a **new version** (see the note at the end of step 5) |
| Permission errors | Run **setup** again from the editor and accept the permissions |

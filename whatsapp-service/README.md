# WhatsApp Web API Service

This service wraps the `whatsapp-web.js` library into an Express API so it can be easily used by the React/Vite frontend or Supabase Edge Functions for web automation.

## Why is this a separate service?
`whatsapp-web.js` relies on Puppeteer, which launches a full Chromium browser instance in the background to handle the WhatsApp Web protocol. This requires Node.js and the underlying native browser dependencies, making it incompatible with browser environments (React) or lightweight edge functions (Deno/V8 isolates like Supabase Edge Functions).

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```

## Deployment (Render)

Because Render uses ephemeral file systems, you must provide your Supabase Database credentials so the session can be saved and restored across deployments.

1. Add your GitHub repo to Render as a **Web Service**.
2. **Important:** Render will read `render.yaml` and configure it as a **Docker** runtime automatically. Do not use the Node runtime.
3. Add the following **Environment Variables** in Render:
   - `PORT=3001`
   - `SUPABASE_URL=https://your-project.supabase.co`
   - `SUPABASE_SERVICE_KEY=eyJhb...` (Use the **Service Role Key**, not the anon key, as it bypasses RLS)

### Database Setup
Before deploying, make sure you've run the SQL script located in `setup-database.sql` in your Supabase SQL editor. This creates the `whatsapp_sessions` table which stores the connection.

3. **Scan the QR Code**: The terminal will display a QR code. Open the WhatsApp app on your phone, go to Linked Devices, and scan the QR code to link your session. The authentication session is saved locally, so you don't have to scan it a second time unless you log out.

## API Endpoints

### 1. Get Status & QR Code
**GET** `http://localhost:3001/api/status`

Returns the current status (whether the client is ready) and the QR code data if it's currently awaiting a scan.

```json
{
  "ready": true,
  "qr": null
}
```

### 2. Send Message
**POST** `http://localhost:3001/api/send-message`

Sends a text message to a specified number. Number formatting handles `+`, spaces, and dashes automatically.

**Request Body:**
```json
{
  "number": "1234567890",
  "message": "Hello from the Lead Engine automation!"
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    ...
  }
}
```

## Integrating with the Frontend
You can call this API directly from your React application in `src/` whenever you want to automate outreach!

```javascript
const sendWhatsAppMessage = async (phone, text) => {
  const response = await fetch('http://localhost:3001/api/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: phone, message: text })
  });
  return response.json();
};
```

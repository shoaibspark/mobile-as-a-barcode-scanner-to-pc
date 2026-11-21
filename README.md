# Barcode-to-PC (Free)

Turn any phone into a barcode scanner that types barcodes directly onto your PC keyboard.

- Phone camera scans barcodes (native `BarcodeDetector` with `@zxing/browser` fallback).
- Scans are sent over a WebSocket to a tiny Node.js server on your PC.
- The server types the barcode into whatever window is focused (plus Enter), using **ydotool** (Wayland) or **xdotool** (X11).
- Duplicate scans are suppressed for 1.4s.

## How it works

1. `server.js` runs an HTTP server (port `3333`) serving `public/index.html` and a `ws` WebSocket server.
2. Open the phone URL on your phone, tap **Start Camera**, point at a barcode.
3. The barcode is decoded on-device and sent to the PC.
4. `typeBarcodeOnPc()` injects it into the active input field via `ydotool` or `xdotool`.

## Requirements

- Node.js
- A Linux desktop with either:
  - `ydotool` + `ydotoold` running (Wayland), or
  - `xdotool` (X11)

## Install & run

```bash
cd mobile-as-a-barcode-scanner-to-pc
npm install
npm start
```

The server prints the phone URL:

```
Barcode bridge running:
  Phone URL: http://192.168.1.x:3333
```

Open `http://<your-pc-ip>:3333` on your phone (same Wi-Fi).

## ngrok — HTTPS for phone camera access

Modern mobile browsers (Chrome on Android, Safari on iOS) **require a secure context (HTTPS)** to access the camera (`getUserMedia` / `BarcodeDetector`). Plain HTTP over LAN is blocked for camera permissions.

To expose your local server over HTTPS so you can scan from your phone outside localhost:

1. Install [ngrok](https://ngrok.com/download).
2. Start your local server (`npm start`).
3. In another terminal:

```bash
ngrok http 3333
```

4. ngrok gives you a public `https://...ngrok-free.app` URL. Open that on your phone and tap **Start Camera**.
5. Scans still type onto your PC because the WebSocket tunnels back through ngrok to `server.js`.

> Free ngrok URLs change on each restart unless you have a paid/static domain. The page auto-detects `wss:` vs `ws:` based on `location.protocol`, so HTTPS just works.

## Notes

- The PC and phone must be on the same network (or connected via ngrok).
- Camera is accessed from the phone only; no video leaves your LAN except through ngrok if you use it.
- `xdotool` sends `Return` after typing; `ydotool` types characters only.

## Project structure

```
server.js       Node + ws server, HTTP file serve, barcode typing
public/
  index.html    Phone UI: camera + barcode scanning + WebSocket client
package.json    npm start script, ws dependency
.gitignore      ignores node_modules
```

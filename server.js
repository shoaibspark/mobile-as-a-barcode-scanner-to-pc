const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {WebSocketServer} = require("ws");
const {execFile, execFileSync} = require("child_process");
const PORT = 3333;
const COOLDOWN_MS = 1400;
const lastScannedAt = new Map();

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

function typeBarcodeOnPc(code) {
  const clean = String(code)
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  if (!clean) return;

  try {
    // Type the barcode characters first
    execFileSync("ydotool", ["type", "--key-delay", "15", clean], {
      stdio: "ignore",
    });
    return;
  } catch (_) {
    execFile(
      "xdotool",
      ["type", "--clearmodifiers", "--delay", "15", clean],
      (err) => {
        if (err) {
          console.error("[xdotool error]", err.message);
          return;
        }
        execFile("xdotool", ["key", "--clearmodifiers", "Return"], (err2) => {
          if (err2) console.error("[xdotool Return error]", err2.message);
        });
      },
    );
  }
}
const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url.startsWith("/?")) {
    res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
    fs.createReadStream(path.join(__dirname, "public", "index.html")).pipe(res);
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

const wss = new WebSocketServer({server});

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    try {
      const payload = JSON.parse(raw.toString());
      const code = String(payload.code || "").trim();
      if (!code) return;

      const now = Date.now();
      const prev = lastScannedAt.get(code) || 0;
      if (now - prev < COOLDOWN_MS) {
        ws.send(JSON.stringify({ok: false, reason: "duplicate", code}));
        return;
      }
      lastScannedAt.set(code, now);

      console.log(`[SCAN] ${payload.format || "UNKNOWN"} -> ${code}`);
      typeBarcodeOnPc(code);

      ws.send(
        JSON.stringify({ok: true, code, format: payload.format || "UNKNOWN"}),
      );
    } catch (e) {
      ws.send(JSON.stringify({ok: false, reason: "invalid_payload"}));
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const ip = getLanIp();
  console.log(`Barcode bridge running:`);
  console.log(`  Phone URL: http://${ip}:${PORT}`);
});

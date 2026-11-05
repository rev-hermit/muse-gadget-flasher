// Muse Gadget flasher: the page's logic.
//
// The gadget's console takes lines starting with ">":
//   >sdk_token=mgst_...          the maker's token (never in the image)
//   >wifi.add=SSID,PASSWORD      save a network
//   >wifi.join                   join the saved networks now
//   >wifi.scan                   list the access points in range
//   >wifi                        list what it remembers
//   >wifi.forget                 forget them all
// Answers come back as "@wifi ..." / "@sdk_token ..." lines.

const BAUD = 115200;
const STICKS3 = { usbVendorId: 0x303a, usbProductId: 0x1001 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let currentLang = "ja";
export function setLanguage(lang) {
  currentLang = lang === "en" ? "en" : "ja";
}

const msg = (ja, en) => (currentLang === "en" ? en : ja);

export const isSsid = (s) =>
  typeof s === "string" && s.length > 0 && s.length <= 32 && !s.includes(",") && !/[\r\n\0]/.test(s);
export const isPassphrase = (p) =>
  typeof p === "string" && p.length <= 64 && !/[\r\n\0]/.test(p);
export const isToken = (t) =>
  typeof t === "string" && /^mgst_[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(t.trim());

async function openPicker(filter) {
  const options = filter ? { filters: [filter] } : {};
  try {
    return await navigator.serial.requestPort(options);
  } catch (e) {
    if (e && e.name === "NotFoundError") return null;
    throw e;
  }
}

// Sends one command and collects its answers until done(answer).
async function talk(port, tag, command, { done, timeoutMs = 60000, retryMs = 3000 } = {}) {
  for (let i = 0; i < 40 && (port.readable || port.writable); i++) await sleep(100);
  if (!port.readable && !port.writable) {
    try {
      await port.open({ baudRate: BAUD });
    } catch (e) {
      throw new Error(
        msg(
          `シリアルポートを開けませんでした（${e.message}）。書き込みダイアログが開いている場合は閉じてから再試行してください。`,
          `Could not open serial port (${e.message}). If the installer dialog is open, please close it and retry.`
        )
      );
    }
  }
  await port.setSignals({ dataTerminalReady: false, requestToSend: false }).catch(() => {});

  const reader = port.readable.getReader();
  const answers = [];
  let last = null;
  const reading = (async () => {
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
      const { value, done: ended } = await reader.read();
      if (ended) return;
      text += decoder.decode(value, { stream: true });
      const marker = `@${tag}`;
      for (;;) {
        const at = text.indexOf(marker);
        if (at < 0) {
          text = text.slice(-16);
          break;
        }
        const end = text.indexOf("\n", at);
        if (end < 0) {
          text = text.slice(at);
          break;
        }
        const answer = text.slice(at + marker.length, end).replace(/\r$/, "").trim();
        text = text.slice(end + 1);
        last = answer;
        answers.push(answer);
      }
    }
  })().catch(() => {});

  try {
    const deadline = Date.now() + timeoutMs;
    let nextSend = Date.now();
    await sleep(1000);
    while (Date.now() < deadline && !(last && done(last))) {
      if (!last && Date.now() >= nextSend) {
        const writer = port.writable.getWriter();
        try {
          await writer.write(new TextEncoder().encode(`\n${command}\n`));
        } finally {
          writer.releaseLock();
        }
        nextSend = Date.now() + retryMs;
      }
      await sleep(100);
    }
  } finally {
    await reader.cancel().catch(() => {});
    await reading;
    reader.releaseLock();
    await port.close().catch(() => {});
  }
  if (!last) {
    const err = new Error(
      msg(
        "本体から応答がありません。Muse が起動していない（画面が暗い、またはダウンロードモードのまま）可能性があります。本体の側面ボタンを1回押して画面が点灯したら、もう一度実行してください。",
        "No response from device. Muse might not be running (screen off or in download mode). Press the side button once to boot, then retry."
      )
    );
    err.code = "no_response";
    throw err;
  }
  return answers;
}

export async function sendToken(port, token) {
  const clean = (token || "").trim();
  if (!isToken(clean)) {
    throw new Error(
      msg(
        "SDK トークンの形式が正しくありません（mgst_...）。gadgets.muse.ai から正しくコピーしてください。",
        "Invalid SDK token format (mgst_...). Please copy it correctly from gadgets.muse.ai."
      )
    );
  }
  const answers = await talk(port, "sdk_token", `>sdk_token=${clean}`, {
    done: (a) => a.startsWith("ok") || a.startsWith("error"),
    timeoutMs: 25000,
    retryMs: 4000,
  });
  const last = answers[answers.length - 1];
  if (last !== "ok") {
    throw new Error(
      last === "error invalid"
        ? msg("本体が SDK トークンを拒否しました（無効な形式です）。", "Device rejected the SDK token (invalid format).")
        : msg(`本体からエラーが返されました: ${last}`, `Device returned error: ${last}`)
    );
  }
}

export async function addWifi(port, ssid, pass) {
  if (!isSsid(ssid)) {
    throw new Error(
      msg(
        `SSID「${ssid}」が無効です（1〜32文字で、カンマや改行は使用できません）。`,
        `Invalid SSID "${ssid}" (1-32 chars, no commas or newlines allowed).`
      )
    );
  }
  if (!isPassphrase(pass)) {
    throw new Error(
      msg(
        `SSID「${ssid}」のパスワードが無効です（64文字以内で、改行は使用できません）。`,
        `Invalid password for SSID "${ssid}" (up to 64 chars, no newlines allowed).`
      )
    );
  }
  const answers = await talk(port, "wifi", `>wifi.add=${ssid},${pass}`, {
    done: (a) => a.startsWith("added") || a.startsWith("failed") || a.startsWith("error"),
    timeoutMs: 20000,
    retryMs: 4000,
  });
  const last = answers[answers.length - 1];
  if (!last.startsWith("added")) {
    throw new Error(
      msg(
        `本体への Wi-Fi 設定追加に失敗しました（${last}）: ${ssid}`,
        `Failed to add Wi-Fi to device (${last}): ${ssid}`
      )
    );
  }
}

export async function joinWifi(port) {
  const answers = await talk(port, "wifi", ">wifi.join", {
    done: (a) => a.startsWith("connected") || a.startsWith("failed") || a.startsWith("error"),
    timeoutMs: 90000,
    retryMs: 15000,
  });
  const last = answers[answers.length - 1];
  if (last.startsWith("connected")) return last.slice("connected".length).trim();
  if (last === "failed join") {
    throw new Error(
      msg(
        "保存された Wi-Fi に接続できませんでした。SSID・パスワード、および 2.4 GHz 帯であることを確認してください。",
        "Failed to connect to saved Wi-Fi. Check SSID, password, and ensure 2.4 GHz band."
      )
    );
  }
  if (last === "failed not_nearby") {
    throw new Error(
      msg(
        "指定した Wi-Fi が見つかりませんでした。本体をルーターに近づけてください。",
        "Specified Wi-Fi network was not found nearby. Move closer to the router."
      )
    );
  }
  if (last === "failed busy") {
    throw new Error(
      msg(
        "本体が処理中です。少し待ってから再度お試しください。",
        "Device is busy. Please wait a moment and try again."
      )
    );
  }
  throw new Error(msg(`Wi-Fi 接続に失敗しました: ${last}`, `Wi-Fi connection failed: ${last}`));
}

export async function scanWifi(port) {
  const answers = await talk(port, "wifi", ">wifi.scan", {
    done: (a) => a.startsWith("scan ") || a.startsWith("failed") || a.startsWith("error"),
    timeoutMs: 45000,
    retryMs: 12000,
  });
  const aps = [];
  for (const a of answers) {
    const m = a.match(/^ap (-?\d+) (\d) (\d+) (.*)$/);
    if (m) aps.push({ rssi: Number(m[1]), secure: m[2] === "1", ssid: m[4] });
  }
  const bySsid = new Map();
  for (const ap of aps) {
    if (!bySsid.has(ap.ssid) || bySsid.get(ap.ssid).rssi < ap.rssi) {
      bySsid.set(ap.ssid, ap);
    }
  }
  return [...bySsid.values()].sort((x, y) => y.rssi - x.rssi);
}

export async function listWifi(port) {
  const answers = await talk(port, "wifi", ">wifi", {
    done: (a) => a === "none" || /^\d+ saved$/.test(a) || a.startsWith("error"),
    timeoutMs: 20000,
    retryMs: 4000,
  });
  return answers
    .filter((a) => a.startsWith("saved "))
    .map((a) => a.slice(6))
    .filter((name, i, all) => all.indexOf(name) === i);
}

export async function forgetWifi(port) {
  const answers = await talk(port, "wifi", ">wifi.forget", {
    done: (a) => a === "forgotten" || a.startsWith("error"),
    timeoutMs: 20000,
    retryMs: 4000,
  });
  if (answers[answers.length - 1] !== "forgotten") {
    throw new Error(msg("本体の Wi-Fi 設定消去に失敗しました。", "Failed to erase Wi-Fi settings from device."));
  }
}

// The same list, but with the passwords, straight from the device's NVS.
// Answers are one JSON object per network ("@wifi net {...}").
export async function listWifiFull(port) {
  const answers = await talk(port, "wifi", ">wifi.list", {
    done: (a) => a === "none" || /^\d+ saved$/.test(a) || a.startsWith("error"),
    timeoutMs: 6000,
    retryMs: 3000,
  });
  if (answers.some((a) => a.startsWith("error"))) {
    throw new Error(
      msg(
        "本体が保存済み Wi-Fi の一覧を返せませんでした。",
        "The device could not return its saved Wi-Fi list."
      )
    );
  }
  const nets = [];
  for (const a of answers) {
    if (!a.startsWith("net ")) continue;
    try {
      const net = JSON.parse(a.slice(4));
      if (net && typeof net.s === "string") {
        nets.push({
          ssid: net.s,
          pass: typeof net.p === "string" ? net.p : "",
          hidden: Boolean(net.h),
        });
      }
    } catch {
      // A truncated line means a lost answer; leave it out rather than guess.
    }
  }
  return nets;
}

// Forgets one saved network by name. The SSID may contain spaces or commas.
export async function removeWifi(port, ssid) {
  const clean = typeof ssid === "string" ? ssid : "";
  if (!clean || clean.length > 32 || /[\r\n\0]/.test(clean)) {
    throw new Error(
      msg(
        "削除する SSID が無効です。",
        "Invalid SSID to remove."
      )
    );
  }
  const answers = await talk(port, "wifi", `>wifi.remove=${clean}`, {
    done: (a) => a.startsWith("removed") || a.startsWith("error"),
    timeoutMs: 15000,
    retryMs: 3000,
  });
  const last = answers[answers.length - 1];
  if (!last.startsWith("removed")) {
    throw new Error(
      msg(
        `本体から「${clean}」を削除できませんでした（${last}）。`,
        `Could not remove "${clean}" from the device (${last}).`
      )
    );
  }
}

export { openPicker, STICKS3 };

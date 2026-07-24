#!/usr/bin/env node
/**
 * Gemini Code Assist OAuth 셋업 (gemini-cli와 동일한 방식).
 *
 * - gemini-cli의 공개 OAuth 클라이언트로 로그인(loopback) → refresh token 발급
 * - Code Assist(cloudcode-pa) loadCodeAssist/onboardUser로 무료 티어 프로젝트 확보
 * - generateContent 1회 호출로 동작 검증
 * - 토큰을 data/google-oauth.json 에 저장 (앱이 재사용)
 *
 * 실행: node scripts/gemini-oauth-setup.js
 * 출력 로그에서 AUTH_URL 을 브라우저(그 PC)에서 열어 승인하면 나머지 자동 진행.
 */
const http = require("node:http");
const https = require("node:https");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// gemini-cli의 공개 OAuth 클라이언트를 사용한다. 값은 리포에 커밋하지 않고
// 환경변수로 주입한다(gemini-cli 오픈소스 소스코드에서 확인 가능):
//   GEMINI_OAUTH_CLIENT_ID, GEMINI_OAUTH_CLIENT_SECRET
const CLIENT_ID =
  process.env.GEMINI_OAUTH_CLIENT_ID ??
  "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com";
const CLIENT_SECRET = process.env.GEMINI_OAUTH_CLIENT_SECRET;
if (!CLIENT_SECRET) {
  console.log(
    "GEMINI_OAUTH_CLIENT_SECRET 환경변수가 필요합니다 (gemini-cli의 공개 클라이언트 시크릿).",
  );
  process.exit(1);
}
const PORT = 8123;
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
].join(" ");
const CA = "https://cloudcode-pa.googleapis.com/v1internal";
const OUT = path.join(process.cwd(), "data", "google-oauth.json");

function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function postJson(url, token, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const u = new URL(url);
    const req = https.request(
      u,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let out = "";
        res.on("data", (c) => (out += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: out ? JSON.parse(out) : {} }),
        );
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function tokenRequest(params) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(new URLSearchParams(params).toString());
    const req = https.request(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": data.length,
        },
      },
      (res) => {
        let out = "";
        res.on("data", (c) => (out += c));
        res.on("end", () => resolve(JSON.parse(out)));
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT,
      response_type: "code",
      scope: SCOPE,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      access_type: "offline",
      prompt: "consent",
    }).toString();

  console.log("AUTH_URL: " + authUrl);
  console.log("위 URL을 이 PC 브라우저에서 열어 승인하세요...");

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (!url.pathname.startsWith("/oauth2callback")) {
        res.writeHead(404).end();
        return;
      }
      const c = url.searchParams.get("code");
      const s = url.searchParams.get("state");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h2>인증 완료. 이 창을 닫으셔도 됩니다.</h2>");
      server.close();
      if (s !== state) return reject(new Error("state mismatch"));
      resolve(c);
    });
    server.listen(PORT, "127.0.0.1");
    setTimeout(() => reject(new Error("timeout(20분) - 다시 실행하세요")), 1200000);
  });

  const tok = await tokenRequest({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT,
  });
  if (!tok.refresh_token) {
    console.log("TOKEN_ERR: " + JSON.stringify(tok));
    process.exit(1);
  }
  const access = tok.access_token;

  // loadCodeAssist
  const meta = {
    ideType: "IDE_UNSPECIFIED",
    platform: "PLATFORM_UNSPECIFIED",
    pluginType: "GEMINI",
  };
  const load = await postJson(`${CA}:loadCodeAssist`, access, { metadata: meta });
  console.log("loadCodeAssist status=" + load.status);
  let project = load.body.cloudaicompanionProject || null;
  let tierId =
    load.body.currentTier?.id ||
    (load.body.allowedTiers || []).find((t) => t.isDefault)?.id ||
    "free-tier";

  if (!project) {
    let onboard = await postJson(`${CA}:onboardUser`, access, {
      tierId,
      cloudaicompanionProject: project || undefined,
      metadata: meta,
    });
    // poll LRO
    for (let i = 0; i < 10 && !onboard.body.done; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      onboard = await postJson(`${CA}:onboardUser`, access, {
        tierId,
        cloudaicompanionProject: project || undefined,
        metadata: meta,
      });
    }
    project =
      onboard.body.response?.cloudaicompanionProject?.id ||
      onboard.body.response?.cloudaicompanionProject ||
      null;
  }
  console.log("tier=" + tierId + " project=" + project);

  // generateContent 검증
  const gen = await postJson(`${CA}:generateContent`, access, {
    model: "gemini-2.5-flash",
    project,
    request: {
      contents: [{ role: "user", parts: [{ text: "한 문장으로 자기소개해줘." }] }],
    },
  });
  const text =
    gen.body.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
    JSON.stringify(gen.body).slice(0, 300);
  console.log("generateContent status=" + gen.status);
  console.log("SAMPLE: " + text);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        refresh_token: tok.refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        project,
        tier: tierId,
        saved_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log("SAVED: " + OUT);
  console.log("DONE");
  process.exit(0);
}

main().catch((e) => {
  console.log("FATAL: " + (e.stack || e.message));
  process.exit(1);
});

import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signPayload, verifyPayload } from "@/lib/security/signing";
import { detectFileType, validateUpload } from "@/lib/storage";
import { signStreamToken } from "@/lib/video";
import { safeReturnPath } from "@/lib/auth/viewer";

describe("tokens assinados", () => {
  it("valida, expira e detecta adulteração", () => {
    const t = signPayload({ uid: "u1" }, 60);
    expect(verifyPayload<{ uid: string }>(t)?.uid).toBe("u1");
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: 9999999999 })).toString("base64url");
    expect(verifyPayload(`${forged}.${sig}`)).toBeNull();
    expect(verifyPayload(`${body}.x${sig.slice(1)}`)).toBeNull();
    expect(verifyPayload(signPayload({ uid: "u1" }, -10))).toBeNull();
    expect(verifyPayload(undefined)).toBeNull();
  });
});

describe("redirecionamento seguro após login", () => {
  it("aceita apenas caminhos internos", () => {
    expect(safeReturnPath("/aulas/x")).toBe("/aulas/x");
    expect(safeReturnPath("https://site-malicioso.com")).toBe("/");
    expect(safeReturnPath("//site-malicioso.com")).toBe("/");
    expect(safeReturnPath("/\\site-malicioso.com")).toBe("/");
    expect(safeReturnPath(null)).toBe("/");
  });
});

describe("validação de arquivos enviados", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const pdf = new TextEncoder().encode("%PDF-1.7 conteudo");
  const html = new TextEncoder().encode("<html><script>alert(1)</script>");
  it("identifica pelo conteúdo, não pela extensão", () => {
    expect(detectFileType(png)?.mime).toBe("image/png");
    expect(detectFileType(pdf)?.mime).toBe("application/pdf");
    expect(detectFileType(html)).toBeNull();
  });
  it("recusa tipo errado, vazio ou grande demais", () => {
    expect(() => validateUpload("image", html)).toThrow();
    expect(() => validateUpload("image", pdf)).toThrow();
    expect(() => validateUpload("book", png)).toThrow();
    expect(() => validateUpload("image", new Uint8Array())).toThrow();
    const big = new Uint8Array(5 * 1024 * 1024);
    big.set(png);
    expect(() => validateUpload("image", big)).toThrow(/grande/);
    expect(validateUpload("book", pdf).ext).toBe("pdf");
  });
});

describe("token de vídeo do Cloudflare Stream", () => {
  it("assina RS256 verificável, com expiração", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk = Buffer.from(JSON.stringify(privateKey.export({ format: "jwk" }))).toString("base64");
    const token = signStreamToken({ uid: "video123", keyId: "kid1", jwkBase64: jwk, ttlSeconds: 3600, now: 1000 });
    const [h, p, s] = token.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "RS256", kid: "kid1" });
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(payload).toMatchObject({ sub: "video123", kid: "kid1", exp: 4600 });
    const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s, "base64url"));
    expect(ok).toBe(true);
  });
});

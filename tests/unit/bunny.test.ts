import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { bunnyTusSignature, isBunnyVideoId, signBunnyCdnUrl } from "@/lib/video/bunny";

/**
 * Referência independente (Python), seguindo o SDK oficial BunnyWay/BunnyCDN.TokenAuthentication:
 * mensagem = caminho_assinado + expires + ip + parametros_ordenados; HMAC-SHA256; Base64URL sem "=".
 */
function pythonToken(key: string, signaturePath: string, expires: number, signingData: string) {
  const code = [
    "import sys, hmac, hashlib, base64",
    "key, path, exp, data = sys.argv[1:5]",
    "d = hmac.new(key.encode(), (path + exp + data).encode(), hashlib.sha256).digest()",
    "print('HS256-' + base64.urlsafe_b64encode(d).decode().rstrip('='))",
  ].join("\n");
  return execFileSync("python3", ["-I", "-c", code, key, signaturePath, String(expires), signingData]).toString().trim();
}

const VIDEO = "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe";

describe("Bunny Stream — links assinados", () => {
  it("formato de diretório (HLS): token no caminho, autorizando a pasta inteira do vídeo", () => {
    const url = signBunnyCdnUrl({
      host: "vz-teste.b-cdn.net",
      path: `/${VIDEO}/playlist.m3u8`,
      securityKey: "chave-secreta",
      expires: 1798761600,
      tokenPath: `/${VIDEO}/`,
      isDirectory: true,
    });
    const expected = pythonToken("chave-secreta", `/${VIDEO}/`, 1798761600, `token_path=/${VIDEO}/`);
    expect(url).toBe(
      `https://vz-teste.b-cdn.net/bcdn_token=${expected}&token_path=%2F${VIDEO}%2F&expires=1798761600/${VIDEO}/playlist.m3u8`,
    );
    expect(expected).toMatch(/^HS256-[A-Za-z0-9_-]+$/);
  });

  it("formato de parâmetro (arquivo único)", () => {
    const url = signBunnyCdnUrl({ host: "h.b-cdn.net", path: `/${VIDEO}/thumbnail.jpg`, securityKey: "k", expires: 100 });
    expect(url).toBe(`https://h.b-cdn.net/${VIDEO}/thumbnail.jpg?token=${pythonToken("k", `/${VIDEO}/thumbnail.jpg`, 100, "")}&expires=100`);
  });

  it("chave, validade ou pasta diferentes geram tokens diferentes", () => {
    const base = { host: "h", path: "/a/playlist.m3u8", securityKey: "k", expires: 100, tokenPath: "/a/", isDirectory: true };
    const t = signBunnyCdnUrl(base);
    expect(signBunnyCdnUrl({ ...base, securityKey: "x" })).not.toBe(t);
    expect(signBunnyCdnUrl({ ...base, expires: 101 })).not.toBe(t);
    expect(signBunnyCdnUrl({ ...base, tokenPath: "/b/" })).not.toBe(t);
  });
});

describe("Bunny Stream — envio TUS", () => {
  it("assinatura SHA256 hex de libraryId + apiKey + expires + videoId", () => {
    const code = "import sys, hashlib; print(hashlib.sha256(''.join(sys.argv[1:5]).encode()).hexdigest())";
    const expected = execFileSync("python3", ["-I", "-c", code, "759", "api-key", "1798761600", VIDEO]).toString().trim();
    expect(bunnyTusSignature("759", "api-key", 1798761600, VIDEO)).toBe(expected);
  });
  it("valida o identificador do vídeo", () => {
    expect(isBunnyVideoId(VIDEO)).toBe(true);
    expect(isBunnyVideoId("../../etc/passwd")).toBe(false);
    expect(isBunnyVideoId("")).toBe(false);
  });
});

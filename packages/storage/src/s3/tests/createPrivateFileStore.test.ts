import { beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { createPrivateFileStore } from "../createPrivateFileStore.js";

const mocks = vi.hoisted(() => ({ send: vi.fn(), sign: vi.fn() }));
vi.mock("@aws-sdk/client-s3", async () => ({
  ...(await vi.importActual<typeof import("@aws-sdk/client-s3")>(
    "@aws-sdk/client-s3",
  )),
  S3Client: class {
    send = mocks.send;
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: mocks.sign }));

const config = {
  bucket: "private",
  region: "ap-southeast-2",
  prefix: "email-center/attachments/",
};

const fileId = "d7ea777e-af81-4a54-a6a2-b60b7c8faf12";
const signal = () => AbortSignal.timeout(1000);
beforeEach(() => {
  vi.resetAllMocks();
});

it("uses immutable private objects and verifies an interrupted upload's checksum", async () => {
  const storage = createPrivateFileStore(config);
  const bytes = Buffer.from("pdf bytes");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  mocks.send.mockResolvedValueOnce({});
  await storage.put(fileId, bytes, signal());
  expect(mocks.send.mock.calls[0][0].input).toMatchObject({
    Bucket: "private",
    Key: `${config.prefix}${fileId}`,
    IfNoneMatch: "*",
    ContentType: "application/octet-stream",
    Metadata: { sha256 },
  });

  const conflict = Object.assign(new Error("exists"), {
    name: "PreconditionFailed",
  });

  mocks.send.mockRejectedValueOnce(conflict).mockResolvedValueOnce({
    ContentLength: bytes.length,
    Metadata: { sha256 },
  });

  await storage.put(fileId, bytes, signal());
  mocks.send.mockRejectedValueOnce(conflict).mockResolvedValueOnce({
    ContentLength: bytes.length,
    Metadata: { sha256: "different" },
  });

  await expect(storage.put(fileId, bytes, signal())).rejects.toThrow(
    "private file size changed",
  );
});

it("physically deletes matching versions and delete markers only", async () => {
  const storage = createPrivateFileStore(config);
  const key = `${config.prefix}${fileId}`;
  mocks.send
    .mockResolvedValueOnce({
      Versions: [
        { Key: key, VersionId: "one" },
        { Key: `${key}-other`, VersionId: "unrelated" },
      ],
      DeleteMarkers: [{ Key: key, VersionId: "marker" }],
    })
    .mockResolvedValue({});

  await storage.remove(fileId, signal());
  expect(mocks.send.mock.calls.map(([command]) => command.input)).toEqual([
    { Bucket: "private", Prefix: key },
    { Bucket: "private", Key: key, VersionId: "one" },
    { Bucket: "private", Key: key, VersionId: "marker" },
  ]);

  mocks.send.mockResolvedValueOnce({ IsTruncated: true });
  await expect(storage.remove(fileId, signal())).rejects.toThrow(
    "cleanup incomplete",
  );
});

it("issues short download capabilities with escaped filenames and rejects foreign keys", async () => {
  const storage = createPrivateFileStore(config);
  mocks.sign.mockResolvedValue("https://private.invalid/download");
  await storage.download(fileId, "a\r\nfile.html");
  expect(mocks.sign.mock.calls[0][1].input).toMatchObject({
    ResponseContentType: "application/octet-stream",
    ResponseContentDisposition: "attachment; filename*=UTF-8''a%0D%0Afile.html",
  });

  expect(mocks.sign.mock.calls[0][2]).toEqual({ expiresIn: 60 });
  await expect(storage.remove("../../admin", signal())).rejects.toThrow(
    "invalid private file ID",
  );
});

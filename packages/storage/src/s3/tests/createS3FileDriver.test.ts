import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GetBucketVersioningCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3FileDriver } from "../createS3FileDriver.js";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://storage.example/signed"),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const id = "d7ea777e-af81-4a54-a6a2-b60b7c8faf12";
const checksum = "ab".repeat(32);
const config = {
  bucket: "library",
  region: "ap-southeast-2",
  endpoint: "https://s3.example",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
};

const metadata = {
  operationId: id,
  scope: "admin:files",
  name: "a.pdf",
  contentType: "application/pdf" as const,
  sizeBytes: 10,
  checksum,
  category: "admin" as const,
  tags: [],
};

describe("S3 file driver", () => {
  it("rejects insecure endpoints, unsafe prefixes and foreign keys", async () => {
    expect(() =>
      createS3FileDriver({ ...config, endpoint: "http://s3.example" }),
    ).toThrow("secure storage endpoint required");
    expect(() =>
      createS3FileDriver({ ...config, endpoint: "http://127.0.0.1:9000" }),
    ).toThrow("secure storage endpoint required");
    createS3FileDriver({
      ...config,
      endpoint: "http://127.0.0.1:9000",
      allowLocalHttpForTests: true,
    });
    expect(() => createS3FileDriver({ ...config, prefix: "../" })).toThrow(
      "invalid storage prefix",
    );
    await expect(
      createS3FileDriver(config).driver.inspect("../admin"),
    ).rejects.toThrow("invalid file object key");
  });

  it("signs a conditional create bound to type, length and SHA-256 on a versioned bucket", async () => {
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockImplementation(async () => ({ Status: "Enabled" }));
    const { driver } = createS3FileDriver(config);
    const upload = await driver.signUpload({
      key: `files/${id}`,
      metadata,
      expiresAt: Date.now() + 60_000,
    });
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetBucketVersioningCommand);
    const [, command, options] = vi.mocked(getSignedUrl).mock.calls[0];
    expect(command.input).toMatchObject({
      Bucket: "library",
      Key: `file-library/files/${id}`,
      ContentType: "application/pdf",
      ContentLength: 10,
      IfNoneMatch: "*",
      ChecksumSHA256: Buffer.from(checksum, "hex").toString("base64"),
    });
    expect(options?.expiresIn).toBeLessThanOrEqual(60);
    expect(upload.headers["If-None-Match"]).toBe("*");

    send.mockImplementation(async () => ({ Status: "Suspended" }));
    await expect(
      driver.signUpload({
        key: `files/${id}`,
        metadata,
        expiresAt: Date.now() + 60_000,
      }),
    ).rejects.toThrow("requires versioning");
  });

  it("requires an immutable version and full-object checksum on inspection", async () => {
    const send = vi.spyOn(S3Client.prototype, "send");
    const { driver } = createS3FileDriver(config);
    const head = {
      VersionId: "v1",
      ContentLength: 10,
      ContentType: "application/pdf",
      ChecksumSHA256: Buffer.from(checksum, "hex").toString("base64"),
      ChecksumType: "FULL_OBJECT",
    };
    send.mockImplementationOnce(async () => head);
    expect(await driver.inspect(`files/${id}`)).toEqual({
      version: "v1",
      sizeBytes: 10,
      contentType: "application/pdf",
      checksum,
    });
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand);

    for (const bad of [
      { VersionId: "null" },
      { ChecksumType: "COMPOSITE" },
      { ChecksumSHA256: undefined },
    ]) {
      send.mockImplementationOnce(async () => ({ ...head, ...bad }));
      await expect(driver.inspect(`files/${id}`)).rejects.toThrow(
        "immutable full-object checksum",
      );
    }
  });

  it("signs version-pinned private attachment downloads", async () => {
    const { driver } = createS3FileDriver(config);
    await driver.download({
      key: `files/${id}`,
      version: "v1",
      name: "a\r\nb.html",
      expiresAt: Date.now() + 60_000,
    });
    expect(vi.mocked(getSignedUrl).mock.calls[0][1].input).toMatchObject({
      VersionId: "v1",
      ResponseContentType: "application/octet-stream",
      ResponseCacheControl: "private, no-store",
      ResponseContentDisposition: "attachment; filename*=UTF-8''a%0D%0Ab.html",
    });
    await expect(
      driver.download({
        key: `files/${id}`,
        version: "v1",
        name: "a",
        expiresAt: Date.now() - 1,
      }),
    ).rejects.toThrow("capability expired");
  });

  it("reads exactly the requested version and rejects truncated bodies", async () => {
    const send = vi.spyOn(S3Client.prototype, "send");
    const { readVersion } = createS3FileDriver(config);
    const body = (chunks: string[]) => ({
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) yield Buffer.from(chunk);
      },
      destroy: vi.fn(),
    });
    send.mockImplementationOnce(async () => ({
      Body: body(["ab", "cd"]),
      VersionId: "v1",
      ContentLength: 4,
    }));
    expect((await readVersion(`files/${id}`, "v1")).toString()).toBe("abcd");

    send.mockImplementationOnce(async () => ({
      Body: body(["ab"]),
      VersionId: "v1",
      ContentLength: 4,
    }));
    await expect(readVersion(`files/${id}`, "v1")).rejects.toThrow(
      "incomplete scan source",
    );

    send.mockImplementationOnce(async () => ({
      Body: body(["ab"]),
      VersionId: "v2",
      ContentLength: 2,
    }));
    await expect(readVersion(`files/${id}`, "v1")).rejects.toThrow(
      "invalid immutable scan source",
    );
  });
});

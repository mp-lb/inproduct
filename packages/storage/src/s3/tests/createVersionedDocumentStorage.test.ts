import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GetBucketVersioningCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createVersionedDocumentStorage } from "../createVersionedDocumentStorage";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://storage.example/signed"),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const storage = () =>
  createVersionedDocumentStorage({
    bucket: "private-documents",
    region: "ap-southeast-2",
    endpoint: "https://s3.example",
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
  });

describe("versioned document storage", () => {
  it("generates a real signature bound to type and length without an empty-body checksum", async () => {
    const actual = await vi.importActual<
      typeof import("@aws-sdk/s3-request-presigner")
    >("@aws-sdk/s3-request-presigner");

    vi.mocked(getSignedUrl).mockImplementationOnce(actual.getSignedUrl);
    vi.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({
      Status: "Enabled",
    }));

    const upload = await storage().prepareUpload({
      key: "generated",
      contentType: "application/pdf",
      sizeBytes: 100,
    });

    const url = new URL(upload.url);
    expect(url.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toEqual(
      expect.arrayContaining(["content-type", "content-length"]),
    );

    expect(url.searchParams.has("x-amz-checksum-crc32")).toBe(false);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
  });

  it("refuses uploads to an unversioned bucket", async () => {
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockImplementation(async () => ({ Status: "Suspended" }));

    await expect(
      storage().prepareUpload({
        key: "generated",
        contentType: "application/pdf",
        sizeBytes: 100,
      }),
    ).rejects.toThrow("requires versioning");

    expect(send.mock.calls[0][0]).toBeInstanceOf(GetBucketVersioningCommand);
  });

  it("signs exact upload metadata and verifies a persisted immutable version", async () => {
    const send = vi.spyOn(S3Client.prototype, "send");
    send.mockImplementationOnce(async () => ({ Status: "Enabled" }));
    const service = storage();

    const upload = await service.prepareUpload({
      key: "generated",
      contentType: "application/pdf",
      sizeBytes: 100,
    });

    expect(upload.expiresInSeconds).toBe(300);
    const [, command, options] = vi.mocked(getSignedUrl).mock.calls.at(-1)!;
    expect(command.input).toMatchObject({
      Bucket: "private-documents",
      Key: "generated",
      ContentLength: 100,
      ContentType: "application/pdf",
    });

    expect(options?.signableHeaders).toEqual(
      new Set(["content-type", "content-length"]),
    );

    send.mockImplementationOnce(async () => ({
      ContentLength: 100,
      ContentType: "application/pdf",
      VersionId: "v1",
    }));

    expect(await service.inspect("generated")).toEqual({
      sizeBytes: 100,
      contentType: "application/pdf",
      versionId: "v1",
    });

    expect(send.mock.calls.at(-1)![0]).toBeInstanceOf(HeadObjectCommand);
  });

  it("requires a real version and forces downloads as attachments of that version", async () => {
    vi.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({
      ContentLength: 100,
      ContentType: "application/pdf",
      VersionId: "null",
    }));

    const service = storage();
    await expect(service.inspect("generated")).rejects.toThrow(
      "immutable version",
    );

    await service.prepareDownload({
      key: "generated",
      versionId: "v1",
      fileName: "Client's contract.pdf",
    });

    const command = vi.mocked(getSignedUrl).mock.calls.at(-1)![1];
    expect(command.input).toMatchObject({
      Key: "generated",
      VersionId: "v1",
      ResponseContentType: "application/octet-stream",
      ResponseContentDisposition:
        "attachment; filename=\"Client's contract.pdf\"; filename*=UTF-8''Client%27s%20contract.pdf",
    });
  });
});

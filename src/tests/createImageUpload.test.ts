/** @vitest-environment node */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import handler from "../../api/createImageUpload";
import {
  createRequest,
  createResponse,
} from "./helpers/httpMocks";

const mocks = vi.hoisted(() => ({
  getAdminAuth: vi.fn(),
  verifyIdToken: vi.fn(),
  S3Client: vi.fn(function FakeS3Client() {}),
  createPresignedPost: vi.fn(),
}));

vi.mock("../../server/firebaseAdmin.js", () => ({
  getAdminAuth: mocks.getAdminAuth,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: mocks.S3Client,
}));

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: mocks.createPresignedPost,
}));

const MAX_BYTES = 5 * 1024 * 1024;

const validBody = {
  contentType: "image/png",
  fileSize: 1024,
};

async function call(
  body: unknown = validBody,
  authorization = "Bearer test-token"
) {
  const { res, response } = createResponse();

  await handler(
    createRequest({
      headers: authorization ? { authorization } : {},
      body,
    }),
    res
  );

  return response;
}

beforeEach(() => {
  vi.resetAllMocks();

  vi.spyOn(console, "error").mockImplementation(() => {});

  // Valores inventados: no usar credenciales reales.
  vi.stubEnv("S3_REGION", "sa-east-1");
  vi.stubEnv("AWS_S3_BUCKET", "bucket-de-prueba");
  vi.stubEnv("S3_ACCESS_KEY_ID", "id-falso-para-tests");
  vi.stubEnv(
    "S3_SECRET_ACCESS_KEY",
    "secreto-falso-para-tests"
  );

  mocks.getAdminAuth.mockReturnValue({
    verifyIdToken: mocks.verifyIdToken,
  });

  mocks.verifyIdToken.mockResolvedValue({
    uid: "admin-1",
    role: "admin",
  });

  mocks.createPresignedPost.mockResolvedValue({
    url: "https://bucket-de-prueba.s3.sa-east-1.amazonaws.com/",
    fields: {
      key: "clave-simulada",
      policy: "politica-simulada",
    },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("autorización de imágenes S3", () => {
  it("rechaza métodos diferentes de POST", async () => {
    const { res, response } = createResponse();

    await handler(
      createRequest({ method: "GET" }),
      res
    );

    expect(response.status).toHaveBeenCalledWith(405);

    expect(
      mocks.createPresignedPost
    ).not.toHaveBeenCalled();
  });

  it("rechaza una solicitud sin sesión", async () => {
    const response = await call(validBody, "");

    expect(response.status).toHaveBeenCalledWith(401);

    expect(
      mocks.createPresignedPost
    ).not.toHaveBeenCalled();
  });

  it("rechaza un token inválido", async () => {
    mocks.verifyIdToken.mockRejectedValueOnce(
      new Error("Token inválido")
    );

    const response = await call();

    expect(response.status).toHaveBeenCalledWith(401);

    expect(
      mocks.createPresignedPost
    ).not.toHaveBeenCalled();
  });

  it("impide que un cliente autorice imágenes", async () => {
    mocks.verifyIdToken.mockResolvedValueOnce({
      uid: "cliente-1",
      role: "customer",
    });

    const response = await call();

    expect(response.status).toHaveBeenCalledWith(403);

    expect(
      mocks.createPresignedPost
    ).not.toHaveBeenCalled();
  });

  it.each([
    "image/svg+xml",
    "text/html",
    "application/pdf",
  ])("rechaza el tipo %s", async (contentType) => {
    const response = await call({
      ...validBody,
      contentType,
    });

    expect(response.status).toHaveBeenCalledWith(400);

    expect(
      mocks.createPresignedPost
    ).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, MAX_BYTES + 1, "1024"])(
    "rechaza el tamaño %s",
    async (fileSize) => {
      const response = await call({
        ...validBody,
        fileSize,
      });

      expect(response.status).toHaveBeenCalledWith(400);

      expect(
        mocks.createPresignedPost
      ).not.toHaveBeenCalled();
    }
  );

  it.each([
    { contentType: "image/jpeg", extension: "jpg" },
    { contentType: "image/png", extension: "png" },
    { contentType: "image/webp", extension: "webp" },
  ])(
    "autoriza $contentType con vencimiento y límite de tamaño",
    async ({ contentType, extension }) => {
      const response = await call({
        contentType,
        fileSize: MAX_BYTES,
      });

      expect(response.status).toHaveBeenCalledWith(200);

      expect(mocks.verifyIdToken).toHaveBeenCalledWith(
        "test-token",
        true
      );

      expect(
        mocks.createPresignedPost
      ).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: "bucket-de-prueba",
          Key: expect.stringMatching(
            new RegExp(
              `^products/admin-1/[0-9a-f-]+\\.${extension}$`
            )
          ),
          Expires: 60,
          Fields: {
            "Content-Type": contentType,
            success_action_status: "204",
          },
          Conditions: expect.arrayContaining([
            ["content-length-range", 1, MAX_BYTES],
            ["eq", "$Content-Type", contentType],
            ["eq", "$success_action_status", "204"],
          ]),
        })
      );

      expect(response.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-store"
      );

      const payload = response.json.mock.calls[0][0];

      expect(payload).toEqual(
        expect.objectContaining({
          expiresIn: 60,
          maxBytes: MAX_BYTES,
        })
      );

      expect(JSON.stringify(payload)).not.toContain(
        "secreto-falso-para-tests"
      );
    }
  );

  it("responde sin filtrar secretos si falla la firma", async () => {
    mocks.createPresignedPost.mockRejectedValueOnce(
      new Error("secreto-falso-para-tests")
    );

    const response = await call();

    expect(response.status).toHaveBeenCalledWith(500);

    expect(
      JSON.stringify(response.json.mock.calls)
    ).not.toContain("secreto-falso-para-tests");
  });

  it("detecta configuración incompleta sin contactar AWS", async () => {
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "");

    const response = await call();

    expect(response.status).toHaveBeenCalledWith(500);

    expect(
      mocks.createPresignedPost
    ).not.toHaveBeenCalled();
  });
});

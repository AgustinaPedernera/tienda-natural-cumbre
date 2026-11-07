/** @vitest-environment node */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import handler from "../../api/checkout";
import {
  createRequest,
  createResponse,
} from "./helpers/httpMocks";

type SavedOrder = {
  userId: string;
  cartFingerprint: string;
  total: number;
  status: string;
};

const mocks = vi.hoisted(() => ({
  getAdminAuth: vi.fn(),
  getAdminDb: vi.fn(),
  verifyIdToken: vi.fn(),
  collection: vi.fn(),
  runTransaction: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../../api/firebaseAdmin.js", () => ({
  getAdminAuth: mocks.getAdminAuth,
  getAdminDb: mocks.getAdminDb,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: (delta: number) => ({ increment: delta }),
  },
}));

const validBody = {
  requestId: "request_12345678",
  items: [
    { productId: "almendras", quantity: 2 },
  ],
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

function expectNoWrites() {
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();

  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.getAdminAuth.mockReturnValue({
    verifyIdToken: mocks.verifyIdToken,
  });

  mocks.verifyIdToken.mockResolvedValue({
    uid: "cliente-1",
  });

  mocks.getAdminDb.mockReturnValue({
    collection: mocks.collection,
    runTransaction: mocks.runTransaction,
  });

  mocks.collection.mockImplementation((name: string) => ({
    doc: (id: string) => ({
      path: `${name}/${id}`,
    }),
  }));

  mocks.get.mockResolvedValue({
    exists: false,
  });

  mocks.getAll.mockImplementation(
    async (...refs: { path: string }[]) =>
      refs.map(() => ({
        exists: true,
        data: () => ({
          name: "Almendras",
          price: 100,
          stock: 5,
        }),
      }))
  );

  mocks.runTransaction.mockImplementation(
    async (callback) =>
      callback({
        get: mocks.get,
        getAll: mocks.getAll,
        create: mocks.create,
        update: mocks.update,
      })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API de checkout", () => {
  it("rechaza métodos diferentes de POST", async () => {
    const { res, response } = createResponse();

    await handler(
      createRequest({ method: "GET" }),
      res
    );

    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.setHeader).toHaveBeenCalledWith(
      "Allow",
      "POST"
    );
    expectNoWrites();
  });

  it("rechaza solicitudes sin sesión", async () => {
    const response = await call(validBody, "");

    expect(response.status).toHaveBeenCalledWith(401);
    expect(mocks.getAdminDb).not.toHaveBeenCalled();
  });

  it("rechaza tokens inválidos", async () => {
    mocks.verifyIdToken.mockRejectedValueOnce(
      new Error("Token inválido")
    );

    const response = await call();

    expect(response.status).toHaveBeenCalledWith(401);
    expectNoWrites();
  });

  it("distingue un error de configuración del servidor", async () => {
    mocks.getAdminAuth.mockImplementationOnce(() => {
      throw new Error("Sin configuración");
    });

    const response = await call();

    expect(response.status).toHaveBeenCalledWith(500);
    expectNoWrites();
  });

  it("rechaza un identificador de solicitud inválido", async () => {
    const response = await call({
      ...validBody,
      requestId: "x",
    });

    expect(response.status).toHaveBeenCalledWith(400);
    expectNoWrites();
  });

  it("rechaza carritos vacíos", async () => {
    const response = await call({
      ...validBody,
      items: [],
    });

    expect(response.status).toHaveBeenCalledWith(400);
    expectNoWrites();
  });

  it.each([0, -1, 1.5, 1001])(
    "rechaza la cantidad %s",
    async (quantity) => {
      const response = await call({
        ...validBody,
        items: [{ productId: "almendras", quantity }],
      });

      expect(response.status).toHaveBeenCalledWith(400);
      expectNoWrites();
    }
  );

  it("rechaza productos duplicados", async () => {
    const response = await call({
      ...validBody,
      items: [
        validBody.items[0],
        validBody.items[0],
      ],
    });

    expect(response.status).toHaveBeenCalledWith(400);
    expectNoWrites();
  });

  it("rechaza rutas en el identificador de producto", async () => {
    const response = await call({
      ...validBody,
      items: [
        { productId: "products/otro", quantity: 1 },
      ],
    });

    expect(response.status).toHaveBeenCalledWith(400);
    expectNoWrites();
  });

  it("calcula precios en el servidor y usa el usuario del token", async () => {
    const response = await call({
      ...validBody,
      total: 1,
      userId: "otra-persona",
    });

    expect(response.status).toHaveBeenCalledWith(201);

    expect(mocks.create).toHaveBeenCalledWith(
      {
        path: "orders/cliente-1_request_12345678",
      },
      expect.objectContaining({
        userId: "cliente-1",
        total: 200,
        status: "pending",
      })
    );

    expect(mocks.update).toHaveBeenCalledWith(
      { path: "products/almendras" },
      { stock: { increment: -2 } }
    );
  });

  it("no escribe si el producto ya no existe", async () => {
    mocks.getAll.mockResolvedValueOnce([
      { exists: false },
    ]);

    const response = await call();

    expect(response.status).toHaveBeenCalledWith(400);
    expectNoWrites();
  });

  it("no crea la orden si el stock es insuficiente", async () => {
    mocks.getAll.mockResolvedValueOnce([
      {
        exists: true,
        data: () => ({
          name: "Almendras",
          price: 100,
          stock: 1,
        }),
      },
    ]);

    const response = await call();

    expect(response.status).toHaveBeenCalledWith(400);
    expectNoWrites();
  });

  it("rechaza importes que exceden el rango seguro", async () => {
    mocks.getAll.mockResolvedValueOnce([
      {
        exists: true,
        data: () => ({
          name: "Almendras",
          price: Number.MAX_SAFE_INTEGER,
          stock: 5,
        }),
      },
    ]);

    const response = await call();

    expect(response.status).toHaveBeenCalledWith(400);
    expectNoWrites();
  });

  it("reutiliza la orden sin volver a descontar stock", async () => {
    await call();

    const saved = mocks.create.mock.calls[0][1] as SavedOrder;

    mocks.get.mockResolvedValue({
      exists: true,
      data: () => saved,
    });

    mocks.create.mockClear();
    mocks.update.mockClear();

    const response = await call();

    expect(response.status).toHaveBeenCalledWith(200);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 200 })
    );

    expectNoWrites();
  });

  it("rechaza usar el mismo requestId para un carrito distinto", async () => {
    await call();

    const saved = mocks.create.mock.calls[0][1] as SavedOrder;

    mocks.get.mockResolvedValue({
      exists: true,
      data: () => saved,
    });

    mocks.create.mockClear();
    mocks.update.mockClear();

    const response = await call({
      ...validBody,
      items: [
        { productId: "almendras", quantity: 1 },
      ],
    });

    expect(response.status).toHaveBeenCalledWith(409);
    expectNoWrites();
  });
});
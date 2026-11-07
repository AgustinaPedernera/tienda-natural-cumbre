import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { AdminLayout } from "../components/layout/AdminLayout";
import { Pagination } from "../components/ui/Pagination";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  type ManagedProduct,
  type ProductInput,
} from "../services/productsService";
import {
  uploadProductImage,
  validateImageFile,
} from "../services/imagesService";

const PAGE_SIZE = 8;
const PLACEHOLDER = "/product-placeholder.svg";

const emptyForm = {
  name: "",
  category: "",
  price: "",
  stock: "",
};

const fields = [
  {
    name: "name",
    label: "Nombre",
    type: "text",
    maxLength: 160,
  },
  {
    name: "category",
    label: "Categoría",
    type: "text",
    maxLength: 80,
  },
  {
    name: "price",
    label: "Precio en pesos, sin centavos",
    type: "number",
    min: 1,
  },
  {
    name: "stock",
    label: "Stock disponible",
    type: "number",
    min: 0,
  },
] as const;

function ProductsManager() {
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<ManagedProduct | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operationText, setOperationText] = useState("");

  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);

  const [pendingDelete, setPendingDelete] =
    useState<ManagedProduct | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeImage, setRemoveImage] = useState(false);

  const busyRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadedImageRef = useRef<{
    file: File;
    key: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setRefreshing(true);
      setLoadError("");

      try {
        const result = await getProducts();

        if (active) setProducts(result);
      } catch {
        if (active) {
          setLoadError(
            "No pudimos cargar los productos. Intentá nuevamente."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    uploadedImageRef.current = null;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setRemoveImage(false);
    clearSelectedFile();
  };

  const startEdit = (product: ManagedProduct) => {
    if (busyRef.current || refreshing) return;

    clearSelectedFile();
    setRemoveImage(false);
    setPendingDelete(null);
    setEditing(product);
    setError("");
    setMessage("");

    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
    });

    formRef.current?.scrollIntoView({
      block: "start",
    });
  };

  const handleFileSelection = (file: File | undefined) => {
    if (!file || busyRef.current) return;

    try {
      validateImageFile(file);
      uploadedImageRef.current = null;
      setSelectedFile(file);
      setRemoveImage(false);
      setError("");
      setMessage("");
    } catch (err) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setError(
        err instanceof Error ? err.message : "La imagen no es válida."
      );
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (busyRef.current || refreshing) return;

    setError("");
    setMessage("");

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (
      form.name.trim().length < 2 ||
      form.name.trim().length > 160 ||
      form.category.trim().length < 2 ||
      form.category.trim().length > 80 ||
      form.price.trim() === "" ||
      form.stock.trim() === "" ||
      !Number.isSafeInteger(price) ||
      price <= 0 ||
      !Number.isSafeInteger(stock) ||
      stock < 0
    ) {
      setError(
        "Revisá los campos. El precio debe ser un entero mayor a cero y el stock un entero igual o mayor a cero."
      );
      return;
    }

    busyRef.current = true;
    setSaving(true);

    try {
      const data: ProductInput = {
        name: form.name.trim(),
        category: form.category.trim(),
        price,
        stock,
      };

      if (selectedFile) {
        const previousUpload = uploadedImageRef.current;

        if (previousUpload?.file === selectedFile) {
          data.imageKey = previousUpload.key;
        } else {
          setOperationText("Subiendo imagen…");

          const key = await uploadProductImage(selectedFile);

          uploadedImageRef.current = {
            file: selectedFile,
            key,
          };

          data.imageKey = key;
        }
      } else if (removeImage) {
        data.imageKey = "";
      }

      setOperationText("Guardando producto…");

      const confirmation = editing
        ? await updateProduct(editing, data)
        : await createProduct(data);

      resetForm();
      setMessage(confirmation);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el producto."
      );
    } finally {
      busyRef.current = false;
      setSaving(false);
      setOperationText("");
      setAttempt((value) => value + 1);
    }
  };

  const handleDelete = async (product: ManagedProduct) => {
    if (busyRef.current || refreshing) return;

    busyRef.current = true;
    setSaving(true);
    setDeletingId(product.id);
    setOperationText("Eliminando producto…");
    setError("");
    setMessage("");

    try {
      const confirmation = await deleteProduct(product);

      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );

      setPendingDelete(null);

      if (editing?.id === product.id) resetForm();

      setMessage(confirmation);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el producto."
      );
    } finally {
      busyRef.current = false;
      setSaving(false);
      setDeletingId(null);
      setOperationText("");
    }
  };

  const disabled = saving || refreshing;

  const displayedImage = selectedFile
    ? previewUrl
    : removeImage
      ? ""
      : editing?.imageUrl ?? "";

  const totalPages = Math.max(
    1,
    Math.ceil(products.length / PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);

  const visibleProducts = products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <AdminLayout
      title="Gestión de productos"
      description="Administrá el catálogo, los precios, el stock y las imágenes."
    >
      {message && (
        <p role="status" className="cumbre-success mb-4 text-sm">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="cumbre-error mb-4 text-sm">
          {error}
        </p>
      )}

      {saving && (
        <p role="status" className="mb-3 text-sm text-muted">
          {operationText}
        </p>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        aria-busy={saving}
        className="cumbre-card mb-5 scroll-mt-44"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="mb-0 text-base font-bold">
            {editing ? "Editar producto" : "Crear producto"}
          </h2>

          {editing && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                resetForm();
                setError("");
                setMessage("");
              }}
              className="min-h-11 px-2 text-xs font-semibold text-wine"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <fieldset
          disabled={disabled}
          className="m-0 grid min-w-0 gap-4 border-0 p-0"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className="min-w-0">
                <label
                  htmlFor={`product-${field.name}`}
                  className="mb-1 block text-xs font-semibold text-muted"
                >
                  {field.label}
                </label>

                <input
                  id={`product-${field.name}`}
                  type={field.type}
                  required
                  minLength={field.type === "text" ? 2 : undefined}
                  maxLength={
                    "maxLength" in field ? field.maxLength : undefined
                  }
                  min={"min" in field ? field.min : undefined}
                  step={field.type === "number" ? 1 : undefined}
                  list={
                    field.name === "category"
                      ? "product-categories"
                      : undefined
                  }
                  value={form[field.name]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  className="cumbre-field"
                />
              </div>
            ))}
          </div>

          <datalist id="product-categories">
            {[...new Set(products.map((p) => p.category))]
              .sort((a, b) => a.localeCompare(b, "es"))
              .map((category) => (
                <option key={category} value={category} />
              ))}
          </datalist>

          <div className="rounded-lg border border-line bg-surface-soft p-3">
            <label
              htmlFor="product-image"
              className="mb-1 block text-xs font-semibold"
            >
              Imagen del producto
            </label>

            <p id="image-help" className="text-xs text-muted">
              JPG, PNG o WebP. Máximo 5 MB.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <img
                src={displayedImage || PLACEHOLDER}
                alt="Vista previa del producto"
                className="h-24 w-24 shrink-0 rounded-lg border border-line bg-page object-contain"
              />

              <div className="min-w-0 flex-1">
                <input
                  ref={fileInputRef}
                  id="product-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-describedby="image-help"
                  onChange={(event) =>
                    handleFileSelection(event.target.files?.[0])
                  }
                  className="block w-full min-w-0 text-sm text-ink file:mr-2 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-on-brand"
                />

                <p className="mt-2 mb-0 text-xs text-muted">
                  Se sube al guardar el producto.
                </p>

                {selectedFile ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearSelectedFile();
                      setRemoveImage(false);
                    }}
                    className="mt-1 min-h-11 text-xs font-semibold text-wine"
                  >
                    Descartar imagen seleccionada
                  </button>
                ) : removeImage ? (
                  <div>
                    <p className="mt-2 mb-0 text-xs">
                      La imagen se quitará al guardar.
                    </p>
                    <button
                      type="button"
                      onClick={() => setRemoveImage(false)}
                      className="min-h-11 text-xs font-semibold text-wine"
                    >
                      Conservar imagen actual
                    </button>
                  </div>
                ) : editing?.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setRemoveImage(true)}
                    className="mt-1 min-h-11 text-xs font-semibold text-danger"
                  >
                    Quitar imagen del producto
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="cumbre-button w-full sm:w-auto sm:justify-self-start"
          >
            {saving
              ? operationText
              : editing
                ? "Guardar cambios"
                : "Crear producto"}
          </button>
        </fieldset>
      </form>

      <section ref={listRef} className="scroll-mt-44">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="mb-0 text-base font-bold">
            Catálogo · {products.length} productos
          </h2>

          <button
            type="button"
            disabled={loading || disabled}
            onClick={() => {
              if (busyRef.current || refreshing) return;

              setPendingDelete(null);
              resetForm();
              setError("");
              setMessage("");
              setAttempt((value) => value + 1);
            }}
            className="cumbre-button cumbre-button-secondary"
          >
            Actualizar
          </button>
        </div>

        {refreshing && !loading && (
          <p role="status" className="text-xs text-muted">
            Actualizando productos…
          </p>
        )}

        {loadError && (
          <p role="alert" className="cumbre-error">
            {loadError}
          </p>
        )}

        {loading ? (
          <p role="status" className="text-sm text-muted">
            Cargando productos…
          </p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no hay productos.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleProducts.map((product) => (
                <article
                  key={product.id}
                  aria-busy={deletingId === product.id}
                  className="cumbre-card"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={product.imageUrl || PLACEHOLDER}
                      alt={product.name}
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-lg border border-line bg-page object-contain"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 text-sm font-bold">
                        {product.name}
                      </h3>

                      <p className="mb-1 text-xs text-muted">
                        {product.category}
                      </p>

                      <p className="mb-0 text-sm font-semibold">
                        ${product.price.toLocaleString("es-AR")}
                        <span className="ml-2 text-xs font-normal text-muted">
                          Stock: {product.stock}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => startEdit(product)}
                      className="cumbre-button cumbre-button-secondary"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (busyRef.current || refreshing) return;

                        setError("");
                        setMessage("");
                        setPendingDelete(product);
                      }}
                      className="min-h-11 rounded-lg bg-danger-surface px-3 text-xs font-semibold text-danger"
                    >
                      Eliminar
                    </button>
                  </div>

                  {pendingDelete?.id === product.id && (
                    <div className="mt-3 rounded-lg border border-line bg-surface-soft p-3">
                      <p className="text-xs">
                        ¿Eliminar este producto? No se puede deshacer.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            void handleDelete(product);
                          }}
                          className="min-h-11 rounded-lg bg-danger-surface px-3 text-xs font-semibold text-danger"
                        >
                          {deletingId === product.id
                            ? "Eliminando…"
                            : "Confirmar eliminación"}
                        </button>

                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => setPendingDelete(null)}
                          className="cumbre-button cumbre-button-secondary"
                        >
                          Conservar
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              disabled={disabled}
              onChange={(nextPage) => {
                setPendingDelete(null);
                setPage(nextPage);
                listRef.current?.scrollIntoView({
                  block: "start",
                });
              }}
            />
          </>
        )}
      </section>
    </AdminLayout>
  );
}

export function AdminProductsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <p role="status" className="cumbre-container py-6 text-sm">
        Verificando permisos…
      </p>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return (
      <main className="cumbre-container py-8">
        <h1>Acceso restringido</h1>
        <p>Necesitás permisos de administrador.</p>
        <Link to="/">Volver al catálogo</Link>
      </main>
    );
  }

  return <ProductsManager key={user.id} />;
}
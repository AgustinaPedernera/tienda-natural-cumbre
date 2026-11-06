
import type { CSSProperties } from "react";
import type { Product } from "../../types/product";
import { Button } from "../ui/Button";

interface BaseProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

interface GridProductCardProps extends BaseProductCardProps {
  layout: "grid";
  showPrice?: boolean;
  showDescription?: never;
}

interface ListProductCardProps extends BaseProductCardProps {
  layout: "list";
  showDescription?: boolean;
  showPrice?: never;
}

type ProductCardProps =
  | GridProductCardProps
  | ListProductCardProps;

export function ProductCard(props: ProductCardProps) {
  const { product, onAddToCart } = props;
  const isGrid = props.layout === "grid";

  const cardStyles: CSSProperties = {
    display: "flex",
    flexDirection: isGrid ? "column" : "row",
    alignItems: isGrid ? "stretch" : "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "20px",
    border: "1px solid #d9e3df",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    color: "#173f4f",
  };

  return (
    <article style={cardStyles}>
      <div>
        <h3>{product.name}</h3>

        <p>Categoría: {product.category}</p>

        {props.layout === "grid" &&
          props.showPrice !== false && (
            <p>
              <strong>
                ${product.price.toLocaleString("es-AR")}
              </strong>
            </p>
          )}

        {props.layout === "list" &&
          props.showDescription && (
            <p>
              Producto de la categoría {product.category}.
              Stock disponible: {product.stock}.
            </p>
          )}
      </div>

      <Button
        variant="solid"
        onClick={() => onAddToCart(product.id)}
        disabled={product.stock === 0}
      >
        Agregar al carrito
      </Button>
    </article>
  );
}

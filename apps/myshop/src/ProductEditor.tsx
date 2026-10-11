import { useState } from "react";
import { slugify } from "@mp-lb/inproduct";
import { saveProduct, type Product } from "./catalog";

type Props = {
  product?: Product;
  products: Product[];
  onSave: (products: Product[]) => void;
  onCancel: () => void;
};

export const ProductEditor = ({
  product,
  products,
  onSave,
  onCancel,
}: Props) => {
  const [name, setName] = useState(product?.name ?? "");

  const [price, setPrice] = useState(
    product ? (product.price / 100).toFixed(2) : "",
  );

  const [error, setError] = useState("");
  return (
    <form
      className="editor"
      onSubmit={(event) => {
        event.preventDefault();

        try {
          onSave(
            saveProduct(
              products,
              product?.id ?? crypto.randomUUID(),
              name,
              price,
            ),
          );
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "Could not save product.",
          );
        }
      }}
    >
      <h2>{product ? "Edit product" : "New product"}</h2>
      <label>
        Name
        <input
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <p className="muted">
        Slug from InProduct: <code>{slugify(name) || "—"}</code>
      </p>
      <label>
        Price (USD)
        <input
          required
          type="number"
          min="0.01"
          max="10000"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="actions">
        <button type="submit">Save product</button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

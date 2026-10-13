import type { Dispatch, SetStateAction } from "react";
import { formatPrice, type Cart, type Product } from "./catalog";
import { ProductEditor } from "./ProductEditor";
type Props = {
  products: Product[];
  setProducts: (products: Product[]) => void;
  setCart: Dispatch<SetStateAction<Cart>>;
  editing: Product | "new" | null;
  setEditing: (product: Product | "new" | null) => void;
  setNotice: (notice: string) => void;
};
export const ProductAdmin = ({
  products,
  setProducts,
  setCart,
  editing,
  setEditing,
  setNotice,
}: Props) => (
  <section className="admin" aria-label="Product management">
    <button onClick={() => setEditing("new")}>Add product</button>
    {editing !== null && (
      <ProductEditor
        key={editing === "new" ? "new" : editing.id}
        product={editing === "new" ? undefined : editing}
        products={products}
        onSave={(next) => {
          setProducts(next);
          setEditing(null);
          setNotice("Product saved. Storefront and cart are updated.");
        }}
        onCancel={() => setEditing(null)}
      />
    )}
    {products.map((product) => (
      <article className="admin-row" key={product.id}>
        <span aria-hidden="true">{product.icon}</span>
        <div>
          <h2>{product.name}</h2>
          <code>/{product.slug}</code>
        </div>
        <strong>{formatPrice(product.price)}</strong>
        <button className="secondary" onClick={() => setEditing(product)}>
          Edit
        </button>
        <button
          className="text"
          onClick={() => {
            setProducts(products.filter((entry) => entry.id !== product.id));

            setCart((current) => ({ ...current, [product.id]: 0 }));
            if (editing !== "new" && editing?.id === product.id)
              setEditing(null);
            setNotice(`${product.name} deleted.`);
          }}
        >
          Delete
        </button>
      </article>
    ))}
    {!products.length && <p>No products. Add one or reset the demo.</p>}
  </section>
);

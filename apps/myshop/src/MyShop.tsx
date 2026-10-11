import { useState } from "react";
import { seedProducts, type Cart, type Product } from "./catalog";
import { ProductGrid } from "./ProductGrid";
import { CartPanel } from "./CartPanel";
import { ProductAdmin } from "./ProductAdmin";

export const MyShop = () => {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [cart, setCart] = useState<Cart>({});
  const [view, setView] = useState<"store" | "admin">("store");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [notice, setNotice] = useState("");

  const changeQuantity = (id: string, amount: number) =>
    setCart((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(99, (current[id] ?? 0) + amount)),
    }));

  return (
    <>
      <div className="banner">
        LOCAL DEMO · Synthetic products · Nothing is charged or saved
      </div>
      <header>
        <a className="brand" href="#" onClick={() => setView("store")}>
          ◈ MyShop
        </a>
        <nav aria-label="Shop navigation">
          <button
            className={view === "store" ? "" : "secondary"}
            onClick={() => setView("store")}
          >
            Storefront
          </button>
          <button
            className={view === "admin" ? "" : "secondary"}
            onClick={() => setView("admin")}
          >
            Manage products
          </button>
        </nav>
      </header>
      <main>
        <p className="eyebrow">SMALL THINGS, EVERY DAY</p>
        <h1>
          {view === "store" ? "A little shop. All yours." : "Your products."}
        </h1>
        <p className="intro">
          {view === "store"
            ? "Thoughtful essentials for your daily rituals. A tiny storefront powered by your own application."
            : "Create, edit and remove demo products. InProduct turns each name into a readable slug."}
        </p>
        <p className="notice" role="status">
          {notice}
        </p>
        {view === "store" ? (
          <div className="shop-layout">
            <ProductGrid
              products={products}
              addToCart={(product) => {
                changeQuantity(product.id, 1);
                setNotice(`${product.name} added to cart.`);
              }}
            />
            <CartPanel
              products={products}
              cart={cart}
              setCart={setCart}
              changeQuantity={changeQuantity}
              setNotice={setNotice}
            />
          </div>
        ) : (
          <ProductAdmin
            products={products}
            setProducts={setProducts}
            setCart={setCart}
            editing={editing}
            setEditing={setEditing}
            setNotice={setNotice}
          />
        )}
      </main>
      <footer>
        <p>
          InProduct provides <code>slugify</code>. Catalog and cart behavior are
          example application code.
          <br />
          Changes live in this tab only. Reload or reset to restore the four
          seed products.
        </p>
        <button
          className="secondary"
          onClick={() => {
            setProducts(seedProducts);
            setCart({});
            setEditing(null);
            setNotice("Demo reset to its original products.");
          }}
        >
          Reset demo
        </button>
      </footer>
    </>
  );
};

import { formatPrice, type Product } from "./catalog";
type Props = { products: Product[]; addToCart: (product: Product) => void };
export const ProductGrid = ({ products, addToCart }: Props) => (
  <section className="grid" aria-label="Products">
    {products.length === 0 && (
      <p>No products yet. Add one in Manage products.</p>
    )}
    {products.map((product) => (
      <article className="card" key={product.id}>
        <div className="art" aria-hidden="true">
          {product.icon}
        </div>
        <div className="card-body">
          <h2>{product.name}</h2>
          <code>/{product.slug}</code>
          <div className="product-footer">
            <strong>{formatPrice(product.price)}</strong>
            <button onClick={() => addToCart(product)}>Add to cart</button>
          </div>
        </div>
      </article>
    ))}
  </section>
);

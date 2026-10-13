import type { Dispatch, SetStateAction } from "react";
import {
  cartLines,
  cartTotal,
  formatPrice,
  type Cart,
  type Product,
} from "./catalog";
type Props = {
  products: Product[];
  cart: Cart;
  setCart: Dispatch<SetStateAction<Cart>>;
  changeQuantity: (id: string, amount: number) => void;
  setNotice: (notice: string) => void;
};

export const CartPanel = ({
  products,
  cart,
  setCart,
  changeQuantity,
  setNotice,
}: Props) => {
  const lines = cartLines(products, cart);
  return (
    <aside className="cart">
      <h2>
        Your cart{" "}
        <span>({lines.reduce((sum, line) => sum + line.quantity, 0)})</span>
      </h2>
      {lines.length === 0 && (
        <p className="muted">A few good things belong here.</p>
      )}
      {lines.map((line) => (
        <div className="cart-line" key={line.id}>
          <strong>{line.name}</strong>
          <p>{formatPrice(line.price * line.quantity)}</p>
          <div className="actions">
            <button
              className="secondary"
              aria-label={`Decrease ${line.name}`}
              onClick={() => changeQuantity(line.id, -1)}
            >
              −
            </button>
            <span>{line.quantity}</span>
            <button
              className="secondary"
              disabled={line.quantity >= 99}
              aria-label={`Increase ${line.name}`}
              onClick={() => changeQuantity(line.id, 1)}
            >
              +
            </button>
            <button
              className="text"
              onClick={() =>
                setCart((current) => ({ ...current, [line.id]: 0 }))
              }
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <div className="total">
        <strong>Subtotal</strong>
        <strong>{formatPrice(cartTotal(products, cart))}</strong>
      </div>
      <p className="muted">Demo only. No checkout, orders, tax or shipping.</p>
      <button
        className="secondary"
        disabled={!lines.length}
        onClick={() => {
          setCart({});
          setNotice("Cart cleared.");
        }}
      >
        Clear cart
      </button>
    </aside>
  );
};

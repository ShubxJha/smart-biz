"use client";

import { useEffect, useState, type FormEvent } from "react";

type Requester = (path: string, init?: RequestInit) => Promise<Response>;
export type ProductRecord = {
  id: number;
  name: string;
  sku: string;
  price_minor: number;
  cost_price_minor?: number | null;
  stock_quantity: number;
  active: boolean;
};
export type CustomerRecord = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
};
export type SaleRecord = {
  id: number;
  customer_id: number | null;
  total_minor: number;
  currency: string;
  created_at: string;
  external_reference: string | null;
  items: {
    product_id: number | null;
    product_name: string;
    quantity: number;
    unit_price_minor: number;
    unit_cost_minor?: number;
  }[];
};

export function RecordEditor({
  kind,
  record,
  currency,
  request,
  onClose,
  onSaved,
}: {
  kind: "product" | "customer";
  record: ProductRecord | CustomerRecord;
  currency: string;
  request: Requester;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const product = kind === "product" ? (record as ProductRecord) : null;
  const customer = kind === "customer" ? (record as CustomerRecord) : null;

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [busy, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const body =
        kind === "product"
          ? {
              name: String(values.get("name")).trim(),
              sku: String(values.get("sku")).trim(),
              price_minor: Math.round(Number(values.get("price")) * 100),
              cost_price_minor: String(values.get("cost_price") || "").trim() ? Math.round(Number(values.get("cost_price")) * 100) : null,
              stock_quantity: Number(values.get("stock_quantity")),
            }
          : {
              name: String(values.get("name")).trim(),
              email: String(values.get("email")).trim() || null,
              phone: String(values.get("phone")).trim() || null,
            };
      await request(`/api/v1/${kind === "product" ? "products" : "customers"}/${record.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not update this ${kind}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="entry-overlay"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <section className="entry-dialog maintenance-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-title">
        <header className="entry-dialog-header">
          <div>
            <span className="eyebrow">WORKSPACE RECORD</span>
            <h2 id="maintenance-title">Edit {kind}</h2>
          </div>
          <button className="entry-close" type="button" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </header>
        <form className="entry-form maintenance-form" onSubmit={submit}>
          <label>
            {kind === "product" ? "Product name" : "Customer name"}
            <input name="name" required maxLength={160} defaultValue={record.name} />
          </label>
          {product && (
            <>
              <label>
                SKU
                <input name="sku" required maxLength={64} defaultValue={product.sku} />
              </label>
              <div className="entry-field-row">
                <label>
                  Selling Price ({currency})
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={(product.price_minor / 100).toFixed(2)}
                  />
                </label>
                <label>
                  Cost Price ({currency}) <span className="entry-optional">For profit tracking</span>
                  <input
                    name="cost_price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={product.cost_price_minor == null ? "" : (product.cost_price_minor / 100).toFixed(2)}
                  />
                </label>
              </div>
              <div className="entry-field-row">
                <label>
                  In stock
                  <input
                    name="stock_quantity"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={product.stock_quantity}
                  />
                </label>
              </div>
              <p className="entry-hint">
                Profit margin is calculated automatically based on your cost vs selling price.
              </p>
            </>
          )}
          {customer && (
            <>
              <label>
                Email address <span className="entry-optional">Optional</span>
                <input name="email" type="email" maxLength={254} defaultValue={customer.email || ""} />
              </label>
              <label>
                Phone number <span className="entry-optional">Optional</span>
                <input name="phone" type="tel" maxLength={32} defaultValue={customer.phone || ""} />
              </label>
            </>
          )}
          {error && <p className="entry-error" role="alert">{error}</p>}
          <div className="maintenance-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="primary-button" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function SaleDetails({
  sale,
  currency,
  businessName = "SmartBiz Workspace",
  customerName,
  onClose,
}: {
  sale: SaleRecord;
  currency: string;
  businessName?: string;
  customerName?: string | null;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<"invoice" | "thermal">("invoice");

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);

  const money = (minor: number) => {
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
    } catch {
      return `${currency} ${(minor / 100).toFixed(2)}`;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="entry-overlay invoice-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`entry-dialog sale-details-dialog ${format === "thermal" ? "receipt-thermal-container" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-details-title"
      >
        <header className="entry-dialog-header no-print">
          <div>
            <span className="eyebrow">{sale.external_reference ? "CSV IMPORTED SALE" : "VERIFIED TRANSACTION"}</span>
            <h2 id="sale-details-title">Order #{String(sale.id).padStart(5, "0")}</h2>
            <p className="entry-hint">
              {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(sale.created_at))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`filter-pill-btn ${format === "invoice" ? "active" : ""}`}
              onClick={() => setFormat("invoice")}
            >
              A4 Invoice
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${format === "thermal" ? "active" : ""}`}
              onClick={() => setFormat("thermal")}
            >
              80mm Thermal
            </button>
            <button className="entry-close ml-2" type="button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </header>

        {/* Printable Invoice / Thermal Receipt Template */}
        <div id="printable-receipt" className={`invoice-paper ${format === "thermal" ? "thermal-receipt" : "a4-invoice"}`}>
          {/* Header */}
          <div className="receipt-header">
            <div className="receipt-brand">
              <span className="receipt-logo">❖</span>
              <h3>{businessName}</h3>
            </div>
            <div className="receipt-meta">
              <strong>SALES RECEIPT</strong>
              <span>Receipt: #{String(sale.id).padStart(6, "0")}</span>
              <span>Date: {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(sale.created_at))}</span>
              {sale.external_reference && <span>Ref: {sale.external_reference}</span>}
            </div>
          </div>

          {/* Customer / Billed To */}
          <div className="receipt-customer">
            <small>BILLED TO</small>
            <strong>{customerName || "Walk-in Customer"}</strong>
            {sale.external_reference && <span>Import reference: {sale.external_reference}</span>}
          </div>

          {/* Line Items Table */}
          <table className="receipt-table">
            <thead>
              <tr>
                <th>ITEM DESCRIPTION</th>
                <th style={{ textAlign: "center" }}>QTY</th>
                <th style={{ textAlign: "right" }}>UNIT PRICE</th>
                <th style={{ textAlign: "right" }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={`${item.product_name}-${index}`}>
                  <td>
                    <strong>{item.product_name}</strong>
                  </td>
                  <td style={{ textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right" }}>{money(item.unit_price_minor)}</td>
                  <td style={{ textAlign: "right" }}>{money(item.quantity * item.unit_price_minor)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* The system does not store tax details, so this receipt only reports the recorded sale total. */}
          <div className="receipt-totals">
            <div className="receipt-row receipt-grand-total">
              <strong>Sale Total:</strong>
              <strong>{money(sale.total_minor)}</strong>
            </div>
          </div>

          {/* Barcode & Footer note */}
          <div className="receipt-footer">
            <strong>Order #{String(sale.id).padStart(6, "0")}</strong>
            <p>Thank you for your business!</p>
            <p className="receipt-legal-note">Sales receipt only · Tax details are not recorded in SmartBiz</p>
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="maintenance-actions no-print" style={{ marginTop: 20 }}>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
          <button className="primary-button" type="button" onClick={handlePrint}>
            🖨️ Print / Save PDF
          </button>
        </div>
      </section>
    </div>
  );
}

export function SaleEditor({
  sale,
  products,
  customers,
  currency,
  request,
  onClose,
  onSaved,
}: {
  sale: SaleRecord;
  products: ProductRecord[];
  customers: CustomerRecord[];
  currency: string;
  request: Requester;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState(sale.customer_id ? String(sale.customer_id) : "");
  const [lines, setLines] = useState(() =>
    sale.items.map((item, index) => ({
      id: index + 1,
      productId: item.product_id ? String(item.product_id) : "",
      quantity: String(item.quantity),
      unitPrice: (item.unit_price_minor / 100).toFixed(2),
    }))
  );
  const [nextId, setNextId] = useState(sale.items.length + 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [busy, onClose]);

  const money = (minor: number) => {
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
    } catch {
      return `${currency} ${(minor / 100).toFixed(2)}`;
    }
  };

  const total = lines.reduce(
    (sum, line) => sum + (Number(line.unitPrice) || 0) * 100 * (Number(line.quantity) || 0),
    0
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request(`/api/v1/sales/${sale.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          customer_id: customerId ? Number(customerId) : null,
          items: lines.map((line) => ({
            product_id: Number(line.productId),
            quantity: Number(line.quantity),
            unit_price_minor: Math.round(Number(line.unitPrice) * 100),
          })),
        }),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this sale.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="entry-overlay"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <section className="entry-dialog sale-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="sale-editor-title">
        <header className="entry-dialog-header">
          <div>
            <span className="eyebrow">ORDER #{String(sale.id).padStart(5, "0")}</span>
            <h2 id="sale-editor-title">Edit sale</h2>
            <p className="entry-hint">
              {sale.external_reference
                ? "Historical import · stock will not change"
                : "Changing quantities will adjust current stock."}
            </p>
          </div>
          <button className="entry-close" type="button" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </header>
        <form className="entry-form sale-editor-form" onSubmit={submit}>
          <label>
            Customer
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Walk-in customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.email ? ` · ${customer.email}` : ""}
                </option>
              ))}
            </select>
          </label>
          {lines.map((line) => (
            <div className="sale-edit-line" key={line.id}>
              <label>
                Product
                <select
                  required
                  value={line.productId}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) => (item.id === line.id ? { ...item, productId: event.target.value } : item))
                    )
                  }
                >
                  <option value="">Choose product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {product.sku}
                      {product.active ? "" : " · inactive"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Qty
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) => (item.id === line.id ? { ...item, quantity: event.target.value } : item))
                    )
                  }
                />
              </label>
              <label>
                Unit price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={line.unitPrice}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) => (item.id === line.id ? { ...item, unitPrice: event.target.value } : item))
                    )
                  }
                />
              </label>
              {lines.length > 1 && (
                <button
                  className="entry-remove-line"
                  type="button"
                  aria-label="Remove item"
                  onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            className="entry-add-line"
            type="button"
            onClick={() => {
              setLines((current) => [...current, { id: nextId, productId: "", quantity: "1", unitPrice: "0.00" }]);
              setNextId((id) => id + 1);
            }}
          >
            + Add another item
          </button>
          <div className="entry-sale-total">
            <span>Updated total</span>
            <strong>{money(Math.round(total))}</strong>
          </div>
          {error && <p className="entry-error" role="alert">{error}</p>}
          <div className="maintenance-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="primary-button" disabled={busy}>
              {busy ? "Saving…" : "Save sale"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

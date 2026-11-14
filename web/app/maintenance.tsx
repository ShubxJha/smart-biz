"use client";

import { useEffect, useState, type FormEvent } from "react";

type Requester = (path: string, init?: RequestInit) => Promise<Response>;
export type ProductRecord = { id: number; name: string; sku: string; price_minor: number; stock_quantity: number; active: boolean };
export type CustomerRecord = { id: number; name: string; email: string | null; phone: string | null };
export type SaleRecord = { id: number; customer_id: number | null; total_minor: number; currency: string; created_at: string; external_reference: string | null; items: { product_id: number | null; product_name: string; quantity: number; unit_price_minor: number }[] };

export function RecordEditor({ kind, record, currency, request, onClose, onSaved }: {
  kind: "product" | "customer";
  record: ProductRecord | CustomerRecord;
  currency: string;
  request: Requester;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const product = kind === "product" ? record as ProductRecord : null;
  const customer = kind === "customer" ? record as CustomerRecord : null;

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [busy, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const body = kind === "product" ? {
        name: String(values.get("name")).trim(),
        sku: String(values.get("sku")).trim(),
        price_minor: Math.round(Number(values.get("price")) * 100),
        stock_quantity: Number(values.get("stock_quantity")),
      } : {
        name: String(values.get("name")).trim(),
        email: String(values.get("email")).trim() || null,
        phone: String(values.get("phone")).trim() || null,
      };
      await request(`/api/v1/${kind === "product" ? "products" : "customers"}/${record.id}`, { method: "PATCH", body: JSON.stringify(body) });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not update this ${kind}.`);
    } finally { setBusy(false); }
  }

  return <div className="entry-overlay" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }}>
    <section className="entry-dialog maintenance-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-title">
      <header className="entry-dialog-header"><div><span className="eyebrow">WORKSPACE RECORD</span><h2 id="maintenance-title">Edit {kind}</h2></div><button className="entry-close" type="button" onClick={onClose} disabled={busy} aria-label="Close">×</button></header>
      <form className="entry-form maintenance-form" onSubmit={submit}>
        <label>{kind === "product" ? "Product name" : "Customer name"}<input name="name" required maxLength={160} defaultValue={record.name}/></label>
        {product && <>
          <label>SKU<input name="sku" required maxLength={64} defaultValue={product.sku}/></label>
          <div className="entry-field-row"><label>Price ({currency})<input name="price" type="number" min="0" step="0.01" required defaultValue={(product.price_minor / 100).toFixed(2)}/></label><label>In stock<input name="stock_quantity" type="number" min="0" step="1" required defaultValue={product.stock_quantity}/></label></div>
          <p className="entry-hint">Changing the price applies to future sales. Past sales keep their recorded price.</p>
        </>}
        {customer && <>
          <label>Email address <span className="entry-optional">Optional</span><input name="email" type="email" maxLength={254} defaultValue={customer.email || ""}/></label>
          <label>Phone number <span className="entry-optional">Optional</span><input name="phone" type="tel" maxLength={32} defaultValue={customer.phone || ""}/></label>
        </>}
        {error && <p className="entry-error" role="alert">{error}</p>}
        <div className="maintenance-actions"><button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
      </form>
    </section>
  </div>;
}

export function SaleDetails({ sale, currency, onClose }: {
  sale: { id: number; total_minor: number; currency: string; created_at: string; external_reference: string | null; items: { product_name: string; quantity: number; unit_price_minor: number }[] };
  currency: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  const money = (minor: number) => {
    try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100); }
    catch { return `${currency} ${(minor / 100).toFixed(2)}`; }
  };
  return <div className="entry-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="entry-dialog sale-details-dialog" role="dialog" aria-modal="true" aria-labelledby="sale-details-title">
      <header className="entry-dialog-header"><div><span className="eyebrow">{sale.external_reference ? "IMPORTED SALE" : "COMPLETED SALE"}</span><h2 id="sale-details-title">Order #{String(sale.id).padStart(5, "0")}</h2><p className="entry-hint">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(sale.created_at))}</p></div><button className="entry-close" type="button" onClick={onClose} aria-label="Close">×</button></header>
      <div className="sale-detail-lines">{sale.items.map((item, index) => <div className="sale-detail-line" key={`${item.product_name}-${index}`}><span><strong>{item.product_name}</strong><small>{item.quantity} × {money(item.unit_price_minor)}</small></span><strong>{money(item.quantity * item.unit_price_minor)}</strong></div>)}</div>
      <div className="sale-detail-total"><span>Order total</span><strong>{money(sale.total_minor)}</strong></div>
    </section>
  </div>;
}

export function SaleEditor({ sale, products, customers, currency, request, onClose, onSaved }: {
  sale: SaleRecord;
  products: ProductRecord[];
  customers: CustomerRecord[];
  currency: string;
  request: Requester;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState(sale.customer_id ? String(sale.customer_id) : "");
  const [lines, setLines] = useState(() => sale.items.map((item, index) => ({
    id: index + 1,
    productId: item.product_id ? String(item.product_id) : "",
    quantity: String(item.quantity),
    unitPrice: (item.unit_price_minor / 100).toFixed(2),
  })));
  const [nextId, setNextId] = useState(sale.items.length + 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [busy, onClose]);
  const money = (minor: number) => {
    try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100); }
    catch { return `${currency} ${(minor / 100).toFixed(2)}`; }
  };
  const total = lines.reduce((sum, line) => sum + (Number(line.unitPrice) || 0) * 100 * (Number(line.quantity) || 0), 0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await request(`/api/v1/sales/${sale.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          customer_id: customerId ? Number(customerId) : null,
          items: lines.map((line) => ({ product_id: Number(line.productId), quantity: Number(line.quantity), unit_price_minor: Math.round(Number(line.unitPrice) * 100) })),
        }),
      });
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update this sale."); }
    finally { setBusy(false); }
  }
  return <div className="entry-overlay" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }}>
    <section className="entry-dialog sale-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="sale-editor-title">
      <header className="entry-dialog-header"><div><span className="eyebrow">ORDER #{String(sale.id).padStart(5, "0")}</span><h2 id="sale-editor-title">Edit sale</h2><p className="entry-hint">{sale.external_reference ? "Historical import · stock will not change" : "Changing quantities will adjust current stock."}</p></div><button className="entry-close" type="button" onClick={onClose} disabled={busy} aria-label="Close">×</button></header>
      <form className="entry-form sale-editor-form" onSubmit={submit}>
        <label>Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Walk-in customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.email ? ` · ${customer.email}` : ""}</option>)}</select></label>
        {lines.map((line) => <div className="sale-edit-line" key={line.id}>
          <label>Product<select required value={line.productId} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, productId: event.target.value } : item))}><option value="">Choose product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}{product.active ? "" : " · inactive"}</option>)}</select></label>
          <label>Qty<input type="number" min="1" step="1" required value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, quantity: event.target.value } : item))}/></label>
          <label>Unit price<input type="number" min="0" step="0.01" required value={line.unitPrice} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, unitPrice: event.target.value } : item))}/></label>
          {lines.length > 1 && <button className="entry-remove-line" type="button" aria-label="Remove item" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>×</button>}
        </div>)}
        <button className="entry-add-line" type="button" onClick={() => { setLines((current) => [...current, { id: nextId, productId: "", quantity: "1", unitPrice: "0.00" }]); setNextId((id) => id + 1); }}>+ Add another item</button>
        <div className="entry-sale-total"><span>Updated total</span><strong>{money(Math.round(total))}</strong></div>
        {error && <p className="entry-error" role="alert">{error}</p>}
        <div className="maintenance-actions"><button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save sale"}</button></div>
      </form>
    </section>
  </div>;
}

"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

export type EntryKind = "product" | "customer" | "sale";
type ProductRecord = { id: number; name: string; sku: string; price_minor: number; stock_quantity: number; active: boolean };
type CustomerRecord = { id: number; name: string; email: string | null; phone: string | null };
type SaleLine = { id: number; product_id: string; quantity: string };
type Requester = (path: string, init?: RequestInit) => Promise<Response>;

type Props = {
  kind: EntryKind;
  currency: string;
  request: Requester;
  onClose: () => void;
  onSaved: (kind: EntryKind) => void;
};

const TITLES: Record<EntryKind, string> = {
  product: "Add a product",
  customer: "Add a customer",
  sale: "Record a sale",
};

export default function DataEntryModal({ kind, currency, request, onClose, onSaved }: Props) {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(kind !== "sale");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lines, setLines] = useState<SaleLine[]>([{ id: 1, product_id: "", quantity: "1" }]);
  const [nextLineId, setNextLineId] = useState(2);
  const [customerId, setCustomerId] = useState("");

  useEffect(() => {
    let active = true;
    const loads: Promise<void>[] = [];
    if (kind === "product" || kind === "sale") {
      loads.push(request("/api/v1/products").then((response) => response.json()).then((data: ProductRecord[]) => {
        if (active) setProducts(data);
      }));
    }
    if (kind === "customer" || kind === "sale") {
      loads.push(request("/api/v1/customers").then((response) => response.json()).then((data: CustomerRecord[]) => {
        if (active) setCustomers(data);
      }));
    }
    setRecordsLoading(true);
    Promise.all(loads)
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load your records."); })
      .finally(() => { if (active) setRecordsLoading(false); });
    return () => { active = false; };
  }, [kind, request]);

  const saleTotal = useMemo(() => lines.reduce((total, line) => {
    const product = products.find((item) => item.id === Number(line.product_id));
    return total + (product ? product.price_minor * Math.max(0, Number(line.quantity) || 0) : 0);
  }, 0), [lines, products]);

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      await request("/api/v1/products", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")).trim(),
          sku: String(form.get("sku")).trim(),
          price_minor: Math.round(Number(form.get("price")) * 100),
          stock_quantity: Number(form.get("stock_quantity")),
        }),
      });
      onSaved(kind);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the product.");
    } finally { setBusy(false); }
  }

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      await request("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")).trim(),
          email: String(form.get("email")).trim() || null,
          phone: String(form.get("phone")).trim() || null,
        }),
      });
      onSaved(kind);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the customer.");
    } finally { setBusy(false); }
  }

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await request("/api/v1/sales", {
        method: "POST",
        body: JSON.stringify({
          customer_id: customerId ? Number(customerId) : null,
          items: lines.map((line) => ({ product_id: Number(line.product_id), quantity: Number(line.quantity) })),
        }),
      });
      onSaved(kind);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not record the sale.");
    } finally { setBusy(false); }
  }

  function updateLine(id: number, field: "product_id" | "quantity", value: string) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, [field]: value } : line));
  }

  return <div className="entry-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="entry-dialog" role="dialog" aria-modal="true" aria-labelledby="entry-title">
      <header className="entry-dialog-header">
        <div><span className="eyebrow">SMARTBIZ WORKSPACE</span><h2 id="entry-title">{TITLES[kind]}</h2></div>
        <button className="entry-close" type="button" onClick={onClose} aria-label="Close">×</button>
      </header>

      {kind === "product" && <div className="entry-columns">
        <form className="entry-form" onSubmit={submitProduct}>
          <label>Product name<input name="name" placeholder="e.g. Notebook" required maxLength={160}/></label>
          <label>SKU<input name="sku" placeholder="e.g. NOTE-001" required maxLength={64}/></label>
          <div className="entry-field-row">
            <label>Price ({currency})<input name="price" type="number" min="0" step="0.01" placeholder="50.00" required/></label>
            <label>Starting stock<input name="stock_quantity" type="number" min="0" step="1" defaultValue="0" required/></label>
          </div>
          {error && <p className="entry-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Add product"}</button>
          <p className="entry-hint">Price is entered in {currency}; stock decreases automatically when you record a sale.</p>
        </form>
        <RecordList title="Your products" loading={recordsLoading} empty="No products yet." count={products.length}>
          {products.map((product) => <div className="entry-record" key={product.id}><span><strong>{product.name}</strong><small>{product.sku}</small></span><span className="entry-record-value"><strong>{money(product.price_minor, currency)}</strong><small>{product.stock_quantity} in stock</small></span></div>)}
        </RecordList>
      </div>}

      {kind === "customer" && <div className="entry-columns">
        <form className="entry-form" onSubmit={submitCustomer}>
          <label>Customer name<input name="name" placeholder="Full name" required maxLength={160}/></label>
          <label>Email address <span className="entry-optional">Optional</span><input name="email" type="email" placeholder="customer@example.com" maxLength={254}/></label>
          <label>Phone number <span className="entry-optional">Optional</span><input name="phone" type="tel" placeholder="Phone number" maxLength={32}/></label>
          {error && <p className="entry-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Add customer"}</button>
        </form>
        <RecordList title="Your customers" loading={recordsLoading} empty="No customers yet." count={customers.length}>
          {customers.map((customer) => <div className="entry-record" key={customer.id}><span><strong>{customer.name}</strong><small>{customer.email || customer.phone || "No contact details"}</small></span></div>)}
        </RecordList>
      </div>}

      {kind === "sale" && <form className="entry-form entry-sale-form" onSubmit={submitSale}>
        {recordsLoading && <p className="entry-hint">Loading your products and customers…</p>}
        {!recordsLoading && products.filter((product) => product.active && product.stock_quantity > 0).length === 0 && <p className="entry-callout">Add a product with stock before recording a sale.</p>}
        <div className="entry-sale-lines">
          {lines.map((line) => <div className="entry-sale-line" key={line.id}>
            <label>Product<select required value={line.product_id} onChange={(event) => updateLine(line.id, "product_id", event.target.value)}>
              <option value="">Choose a product</option>
              {products.filter((product) => product.active && product.stock_quantity > 0).map((product) => <option value={product.id} key={product.id}>{product.name} · {money(product.price_minor, currency)} · {product.stock_quantity} in stock</option>)}
            </select></label>
            <label className="entry-quantity">Qty<input type="number" min="1" step="1" required value={line.quantity} onChange={(event) => updateLine(line.id, "quantity", event.target.value)}/></label>
            {lines.length > 1 && <button className="entry-remove-line" type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} aria-label="Remove product">×</button>}
          </div>)}
        </div>
        <button className="entry-add-line" type="button" onClick={() => { setLines((current) => [...current, { id: nextLineId, product_id: "", quantity: "1" }]); setNextLineId((id) => id + 1); }}>+ Add another product</button>
        <div className="entry-customer-select"><label>Customer <span className="entry-optional">Optional</span><select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Walk-in customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label></div>
        <div className="entry-sale-total"><span>Sale total</span><strong>{money(saleTotal, currency)}</strong></div>
        {error && <p className="entry-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={busy || recordsLoading || products.every((product) => !product.active || product.stock_quantity < 1)}>{busy ? "Recording…" : "Record sale"}</button>
        <p className="entry-hint">Stock is checked and updated when the sale is saved.</p>
      </form>}
    </section>
  </div>;
}

function RecordList({ title, loading, empty, count, children }: { title: string; loading: boolean; empty: string; count: number; children: ReactNode }) {
  return <section className="entry-record-list"><div className="entry-record-heading"><h3>{title}</h3><span>{count}</span></div>
    {loading ? <p className="entry-hint">Loading…</p> : count === 0 ? <p className="entry-hint">{empty}</p> : <div className="entry-record-scroll">{children}</div>}
  </section>;
}

function money(minor: number, currency: string) {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100); }
  catch { return `${currency} ${(minor / 100).toFixed(2)}`; }
}

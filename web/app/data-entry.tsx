"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

export type EntryKind = "product" | "customer" | "sale";
type ProductRecord = { id: number; name: string; sku: string; price_minor: number; stock_quantity: number; active: boolean };
type CustomerRecord = { id: number; name: string; email: string | null; phone: string | null };
type SaleLine = { id: number; product_id: string; quantity: string };
type Requester = (path: string, init?: RequestInit) => Promise<Response>;
type ImportPreviewRow = { line: number; values: string[]; errors: string[]; data: Record<string, string | number | null> };

type Props = {
  kind: EntryKind;
  currency: string;
  request: Requester;
  onClose: () => void;
  onSaved: (kind: EntryKind, importedCount?: number) => void;
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
  const [importMode, setImportMode] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose]);

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

  return <div className="entry-overlay" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }}>
    <section className="entry-dialog" role="dialog" aria-modal="true" aria-labelledby="entry-title">
      <header className="entry-dialog-header">
        <div><span className="eyebrow">SMARTBIZ WORKSPACE</span><h2 id="entry-title">{TITLES[kind]}</h2></div>
        <button className="entry-close" type="button" onClick={onClose} disabled={busy} aria-label="Close">×</button>
      </header>

      {(kind === "product" || kind === "customer") && <div className="entry-mode-switch" role="group" aria-label="Choose how to add records">
        <button type="button" className={!importMode ? "is-selected" : ""} onClick={() => setImportMode(false)}>Add manually</button>
        <button type="button" className={importMode ? "is-selected" : ""} onClick={() => setImportMode(true)}>Import CSV</button>
      </div>}

      {importMode && (kind === "product" || kind === "customer") && <CsvImportPanel
        kind={kind}
        currency={currency}
        products={products}
        customers={customers}
        recordsLoading={recordsLoading}
        request={request}
        onSaved={onSaved}
        onBusyChange={setBusy}
      />}

      {kind === "product" && !importMode && <div className="entry-columns">
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

      {kind === "customer" && !importMode && <div className="entry-columns">
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

function CsvImportPanel({ kind, currency, products, customers, recordsLoading, request, onSaved, onBusyChange }: {
  kind: "product" | "customer";
  currency: string;
  products: ProductRecord[];
  customers: CustomerRecord[];
  recordsLoading: boolean;
  request: Requester;
  onSaved: (kind: EntryKind, importedCount?: number) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setPreview([]);
    setFilename("");
    setError("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Choose a .csv file. Excel files are not supported yet."); return; }
    if (file.size > 1024 * 1024) { setError("This file is larger than 1 MB. Split it into smaller CSV files and try again."); return; }
    if (recordsLoading) { setError("Wait for your existing records to finish loading, then choose the file again."); return; }
    setReading(true);
    try {
      const parsed = parseCsv(await file.text());
      const expected = kind === "product" ? ["name", "sku", "price", "stock_quantity"] : ["name", "email", "phone"];
      const required = kind === "product" ? ["name", "sku", "price"] : ["name"];
      const headers = parsed.headers.map((header) => header.trim().toLowerCase());
      const missing = required.filter((header) => !headers.includes(header));
      if (missing.length) throw new Error(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`);
      if (new Set(headers).size !== headers.length) throw new Error("The CSV has duplicate column names.");
      const positions = new Map(headers.map((header, index) => [header, index]));
      const seen = new Set<string>();
      const existing = kind === "product"
        ? new Set(products.map((product) => product.sku.trim().toLowerCase()))
        : new Set(customers.flatMap((customer) => customer.email ? [customer.email.trim().toLowerCase()] : []));
      const rows = parsed.rows.filter((row) => row.cells.some((cell) => cell.trim())).map(({ line, cells }): ImportPreviewRow => {
        const get = (header: string) => { const index = positions.get(header); return index === undefined ? "" : (cells[index] || "").trim(); };
        const name = get("name");
        const errors: string[] = [];
        const data: Record<string, string | number | null> = { name };
        if (!name) errors.push("Name is required");
        if (name.length > 160) errors.push("Name must be 160 characters or fewer");
        if (kind === "product") {
          const sku = get("sku");
          const price = get("price");
          const stock = get("stock_quantity") || "0";
          data.sku = sku;
          data.price_minor = 0;
          data.stock_quantity = 0;
          if (!sku) errors.push("SKU is required");
          if (sku.length > 64) errors.push("SKU must be 64 characters or fewer");
          if (sku) {
            const key = sku.toLowerCase();
            if (seen.has(key) || existing.has(key)) errors.push("SKU is duplicated in this file or already exists");
            seen.add(key);
          }
          if (!/^\d+(?:\.\d{1,2})?$/.test(price) || !Number.isSafeInteger(Number(price) * 100) || Number(price) * 100 > 2147483647) errors.push("Price must be zero or more with up to 2 decimals");
          else data.price_minor = Math.round(Number(price) * 100);
          if (!/^\d+$/.test(stock) || !Number.isSafeInteger(Number(stock)) || Number(stock) > 2147483647) errors.push("Stock must be a whole number zero or more");
          else data.stock_quantity = Number(stock);
        } else {
          const email = get("email");
          const phone = get("phone");
          data.email = email || null;
          data.phone = phone || null;
          if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) errors.push("Enter a valid email (or leave it blank)");
          if (email) {
            const key = email.toLowerCase();
            if (seen.has(key) || existing.has(key)) errors.push("Email is duplicated in this file or already exists");
            seen.add(key);
          }
          if (phone.length > 32) errors.push("Phone must be 32 characters or fewer");
        }
        return { line, values: expected.map((header) => get(header)), errors, data };
      });
      if (!rows.length) throw new Error("The CSV has a header but no data rows.");
      if (rows.length > 500) throw new Error("Import up to 500 rows at a time. Split this CSV and try again.");
      setFilename(file.name);
      setPreview(rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this CSV file.");
    } finally { setReading(false); }
  }

  function downloadTemplate() {
    const headers = kind === "product" ? "name,sku,price,stock_quantity\r\n" : "name,email,phone\r\n";
    const url = URL.createObjectURL(new Blob([headers], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartbiz-${kind}-template.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importRows() {
    if (preview.some((row) => row.errors.length) || !preview.length) return;
    setSaving(true); onBusyChange(true); setError("");
    try {
      const payload = preview.map((row) => row.data);
      const response = await request(`/api/v1/${kind === "product" ? "products" : "customers"}/import`, {
        method: "POST",
        body: JSON.stringify({ rows: payload }),
      });
      const result = await response.json() as { created: number };
      onSaved(kind, result.created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not import ${kind}s.`);
    } finally { setSaving(false); onBusyChange(false); }
  }

  const errorCount = preview.filter((row) => row.errors.length).length;
  return <section className="csv-import-panel" aria-label={`Import ${kind}s from CSV`}>
    <div className="csv-import-intro"><div><h3>Import {kind === "product" ? "products" : "customers"} from CSV</h3><p>Upload a CSV, review every row, then import. Nothing is saved until you confirm.</p></div><button type="button" className="text-button csv-template-button" onClick={downloadTemplate}>Download template</button></div>
    <label className="csv-file-picker">Choose CSV file<input type="file" accept=".csv,text/csv" onChange={selectFile} disabled={reading || saving}/></label>
    {reading && <p className="entry-hint">Reading and checking the file…</p>}
    {filename && <p className="csv-file-name">{filename}</p>}
    {error && <p className="entry-error" role="alert">{error}</p>}
    {preview.length > 0 && <>
      <p className={errorCount ? "csv-preview-summary has-errors" : "csv-preview-summary"} role="status">{preview.length} rows found · {errorCount ? `${errorCount} need attention` : "all rows look good"}</p>
      <div className="csv-preview-scroll"><table className="csv-preview-table"><thead><tr><th>ROW</th><th>CSV VALUES</th><th>CHECK</th></tr></thead><tbody>{preview.slice(0, 8).map((row) => <tr key={row.line}><td>{row.line}</td><td>{row.values.join(" · ") || "—"}</td><td className={row.errors.length ? "csv-row-error" : "csv-row-valid"}>{row.errors.join("; ") || "Ready"}</td></tr>)}</tbody></table></div>
      {preview.length > 8 && <p className="entry-hint">Showing the first 8 rows. All {preview.length} rows will be checked before import.</p>}
      <button type="button" className="primary-button" onClick={importRows} disabled={saving || recordsLoading || Boolean(errorCount)}>{saving ? "Importing…" : `Import ${preview.length} ${kind === "product" ? "products" : "customers"}`}</button>
      {errorCount > 0 && <p className="entry-hint">Correct the flagged rows in your CSV, then choose the updated file.</p>}
    </>}
    <p className="entry-hint">CSV only · up to 500 rows and 1 MB per file. Prices use {currency} and must have no more than 2 decimal places.</p>
  </section>;
}

function parseCsv(text: string): { headers: string[]; rows: { line: number; cells: string[] }[] } {
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [], cell = "", quoted = false, line = 1, recordLine = 1;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else { cell += char; if (char === "\n") line += 1; }
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { cells.push(cell); cell = ""; }
    else if (char === "\n") { cells.push(cell.replace(/\r$/, "")); records.push({ line: recordLine, cells }); cells = []; cell = ""; line += 1; recordLine = line; }
    else cell += char;
  }
  if (quoted) throw new Error("The CSV has an unclosed quotation mark.");
  if (cell.length || cells.length) { cells.push(cell.replace(/\r$/, "")); records.push({ line: recordLine, cells }); }
  if (!records.length) throw new Error("The CSV file is empty.");
  const [header, ...rows] = records;
  return { headers: header.cells, rows };
}

function money(minor: number, currency: string) {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100); }
  catch { return `${currency} ${(minor / 100).toFixed(2)}`; }
}

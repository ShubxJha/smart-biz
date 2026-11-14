"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

export type EntryKind = "product" | "customer" | "sale";
type ProductRecord = { id: number; name: string; sku: string; price_minor: number; stock_quantity: number; active: boolean };
type CustomerRecord = { id: number; name: string; email: string | null; phone: string | null };
type SaleLine = { id: number; product_id: string; quantity: string };
type Requester = (path: string, init?: RequestInit) => Promise<Response>;
type ImportPreviewRow = { line: number; values: string[]; errors: string[]; data: Record<string, string | number | null> };
type SaleImportField = "sale_ref" | "sold_at" | "customer_name" | "sku" | "quantity" | "unit_price";
type CsvSourceRow = { line: number; cells: string[] };

type Props = {
  kind: EntryKind;
  businessId: number;
  currency: string;
  request: Requester;
  startInImport?: boolean;
  onClose: () => void;
  onSaved: (kind: EntryKind, importedCount?: number) => void;
};

const TITLES: Record<EntryKind, string> = {
  product: "Add a product",
  customer: "Add a customer",
  sale: "Record a sale",
};

export default function DataEntryModal({ kind, businessId, currency, request, startInImport = false, onClose, onSaved }: Props) {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(kind !== "sale");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lines, setLines] = useState<SaleLine[]>([{ id: 1, product_id: "", quantity: "1" }]);
  const [nextLineId, setNextLineId] = useState(2);
  const [customerId, setCustomerId] = useState("");
  const [importMode, setImportMode] = useState(startInImport);

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

      <div className="entry-mode-switch" role="group" aria-label="Choose how to add records">
        <button type="button" className={!importMode ? "is-selected" : ""} onClick={() => setImportMode(false)}>{kind === "sale" ? "Record manually" : "Add manually"}</button>
        <button type="button" className={importMode ? "is-selected" : ""} onClick={() => setImportMode(true)}>Import CSV</button>
      </div>

      {importMode && <CsvImportPanel
        kind={kind}
        businessId={businessId}
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

      {kind === "sale" && !importMode && <form className="entry-form entry-sale-form" onSubmit={submitSale}>
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

function CsvImportPanel({ kind, businessId, currency, products, customers, recordsLoading, request, onSaved, onBusyChange }: {
  kind: EntryKind;
  businessId: number;
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
  const [salesHeaders, setSalesHeaders] = useState<string[]>([]);
  const [salesSourceRows, setSalesSourceRows] = useState<CsvSourceRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Partial<Record<SaleImportField, string>>>({});

  const salesMappingReady = ["sale_ref", "sold_at", "sku", "quantity", "unit_price"].every((field) => {
    const selected = columnMapping[field as SaleImportField];
    return Boolean(selected && salesHeaders.includes(selected));
  });

  useEffect(() => {
    if (kind !== "sale" || !salesSourceRows.length) return;
    if (!salesMappingReady) { setPreview([]); return; }
    setPreview(buildSalesPreview(salesHeaders, salesSourceRows, columnMapping, products, customers));
  }, [kind, salesHeaders, salesSourceRows, columnMapping, products, customers, salesMappingReady]);

  function changeColumnMapping(field: SaleImportField, value: string) {
    const next = { ...columnMapping };
    if (value) next[field] = value;
    else delete next[field];
    setPreview([]);
    setColumnMapping(next);
    try { localStorage.setItem(`smartbiz-sales-import-columns-v1-${businessId}`, JSON.stringify(next)); }
    catch { /* Import still works if the browser cannot store preferences. */ }
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setPreview([]);
    setFilename("");
    setError("");
    setSalesHeaders([]);
    setSalesSourceRows([]);
    setColumnMapping({});
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Choose a .csv file. Excel files are not supported yet."); return; }
    if (file.size > 1024 * 1024) { setError("This file is larger than 1 MB. Split it into smaller CSV files and try again."); return; }
    if (recordsLoading) { setError("Wait for your existing records to finish loading, then choose the file again."); return; }
    setReading(true);
    try {
      const parsed = parseCsv(await file.text());
      if (kind === "sale") {
        const headers = parsed.headers.map((header) => header.trim());
        const normalized = headers.map(normalizeHeader);
        if (new Set(normalized).size !== normalized.length) throw new Error("The CSV has duplicate column names. Rename the repeated columns and try again.");
        const rows = parsed.rows.filter((row) => row.cells.some((cell) => cell.trim()));
        if (!rows.length) throw new Error("The CSV has a header but no data rows.");
        if (rows.length > 500) throw new Error("Import up to 500 rows at a time. Split this CSV and try again.");
        let remembered: Partial<Record<SaleImportField, string>> = {};
        try {
          const saved = localStorage.getItem(`smartbiz-sales-import-columns-v1-${businessId}`);
          if (saved) remembered = JSON.parse(saved) as Partial<Record<SaleImportField, string>>;
        } catch { /* Ignore malformed saved column preferences. */ }
        const detected = detectSalesColumns(headers);
        const validRemembered = Object.fromEntries(Object.entries(remembered).filter(([, header]) => typeof header === "string" && headers.includes(header))) as Partial<Record<SaleImportField, string>>;
        const initialMapping = { ...detected, ...validRemembered };
        setSalesHeaders(headers);
        setSalesSourceRows(rows);
        setColumnMapping(initialMapping);
        try { localStorage.setItem(`smartbiz-sales-import-columns-v1-${businessId}`, JSON.stringify(initialMapping)); }
        catch { /* Import still works if the browser cannot store preferences. */ }
        setFilename(file.name);
        return;
      }
      const expected = kind === "product" ? ["name", "sku", "price", "stock_quantity"]
        : kind === "customer" ? ["name", "email", "phone"]
          : ["sale_ref", "sold_at", "customer_name", "sku", "quantity", "unit_price"];
      const required = kind === "product" ? ["name", "sku", "price"]
        : kind === "customer" ? ["name"]
          : ["sale_ref", "sold_at", "sku", "quantity", "unit_price"];
      const headers = parsed.headers.map((header) => header.trim().toLowerCase());
      const missing = required.filter((header) => !headers.includes(header));
      if (missing.length) throw new Error(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`);
      if (new Set(headers).size !== headers.length) throw new Error("The CSV has duplicate column names.");
      const positions = new Map(headers.map((header, index) => [header, index]));
      const seen = new Set<string>();
      const saleGroups = new Map<string, { soldAt: string; customerName: string; line: number }>();
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
        } else if (kind === "customer") {
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
        } else {
          const saleRef = get("sale_ref");
          const soldAt = get("sold_at");
          const customerName = get("customer_name");
          const sku = get("sku");
          const quantity = get("quantity");
          const unitPrice = get("unit_price");
          data.sale_ref = saleRef;
          data.sold_at = soldAt;
          data.customer_name = customerName || null;
          data.sku = sku;
          data.quantity = 0;
          data.unit_price_minor = 0;
          if (!saleRef) errors.push("Sale reference is required");
          if (saleRef.length > 128) errors.push("Sale reference must be 128 characters or fewer");
          const dateHasZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(soldAt);
          const parsedDate = Date.parse(soldAt);
          const normalizedDate = Number.isNaN(parsedDate) ? "" : new Date(parsedDate).toISOString();
          if (!dateHasZone || !normalizedDate) errors.push("Sale date must be valid ISO date/time with a timezone (for example, +05:30)");
          const matchingCustomers = customerName ? customers.filter((customer) => customer.name.toLowerCase() === customerName.toLowerCase()) : [];
          if (customerName && matchingCustomers.length === 0) errors.push("Customer name was not found in this workspace");
          if (matchingCustomers.length > 1) errors.push("More than one customer has this name; use a unique name");
          if (sku && !products.some((product) => product.sku.toLowerCase() === sku.toLowerCase())) errors.push("SKU was not found in this workspace");
          if (sku.length > 64) errors.push("SKU must be 64 characters or fewer");
          if (!/^\d+$/.test(quantity) || !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 2147483647) errors.push("Quantity must be a whole number greater than zero");
          else data.quantity = Number(quantity);
          if (!/^\d+(?:\.\d{1,2})?$/.test(unitPrice) || !Number.isSafeInteger(Number(unitPrice) * 100) || Number(unitPrice) * 100 > 2147483647) errors.push("Unit price must be zero or more with up to 2 decimals");
          else data.unit_price_minor = Math.round(Number(unitPrice) * 100);
          if (saleRef && normalizedDate) {
            const groupKey = saleRef.toLowerCase();
            const prior = saleGroups.get(groupKey);
            if (prior && (prior.soldAt !== normalizedDate || prior.customerName.toLowerCase() !== customerName.toLowerCase())) errors.push(`Must match sale_ref group on row ${prior.line} (same date and customer)`);
            else if (!prior) saleGroups.set(groupKey, { soldAt: normalizedDate, customerName, line });
            data.sold_at = normalizedDate;
          }
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
    const headers = kind === "product" ? "name,sku,price,stock_quantity\r\n"
      : kind === "customer" ? "name,email,phone\r\n"
        : "sale_ref,sold_at,customer_name,sku,quantity,unit_price\r\n";
    const url = URL.createObjectURL(new Blob([headers], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartbiz-${kind}-template.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importRows() {
    if (preview.some((row) => row.errors.length) || !preview.length || (kind === "sale" && !salesMappingReady)) return;
    setSaving(true); onBusyChange(true); setError("");
    try {
      const payload = preview.map((row) => row.data);
      const endpoint = kind === "product" ? "/api/v1/products/import" : kind === "customer" ? "/api/v1/customers/import" : "/api/v1/sales/import";
      const response = await request(endpoint, {
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
  const importedCount = kind === "sale" ? new Set(preview.map((row) => String(row.data.sale_ref || "").toLowerCase()).filter(Boolean)).size : preview.length;
  const entityLabel = kind === "product" ? "products" : kind === "customer" ? "customers" : "sales";
  return <section className="csv-import-panel" aria-label={`Import ${kind}s from CSV`}>
    <div className="csv-import-intro"><div><h3>Import {entityLabel} from CSV</h3><p>{kind === "sale" ? "Upload your business’s sales CSV and map its columns to SmartBiz fields. Customer name is optional; include a timezone with the sale date." : "Upload a CSV, review every row, then import. Nothing is saved until you confirm."}</p></div><button type="button" className="text-button csv-template-button" onClick={downloadTemplate}>Download template</button></div>
    <label className="csv-file-picker">Choose CSV file<input type="file" accept=".csv,text/csv" onChange={selectFile} disabled={reading || saving}/></label>
    {reading && <p className="entry-hint">Reading and checking the file…</p>}
    {filename && <p className="csv-file-name">{filename}</p>}
    {kind === "sale" && salesHeaders.length > 0 && <div className="sales-column-mapper">
      <div><h4>Match your columns</h4><p>We’ll suggest matches from your headers. Review them, then check the preview below.</p></div>
      <div className="sales-column-grid">{SALE_IMPORT_FIELDS.map((field) => <label key={field}>{SALE_FIELD_LABELS[field]}{field === "customer_name" && <span className="entry-optional">Optional</span>}<select value={columnMapping[field] || ""} onChange={(event) => changeColumnMapping(field, event.target.value)}><option value="">{field === "customer_name" ? "Skip customer matching" : "Choose a CSV column"}</option>{salesHeaders.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div>
      <p className="entry-hint">Your column choices are remembered in this browser for this workspace.</p>
      {!salesMappingReady && <p className="entry-error" role="alert">Choose a column for sale reference, sale date, product, quantity, and unit price to preview the file.</p>}
    </div>}
    {error && <p className="entry-error" role="alert">{error}</p>}
    {preview.length > 0 && <>
      <p className={errorCount ? "csv-preview-summary has-errors" : "csv-preview-summary"} role="status">{preview.length} rows found{kind === "sale" ? ` · ${importedCount} sales` : ""} · {errorCount ? `${errorCount} need attention` : "all rows look good"}</p>
      <div className="csv-preview-scroll"><table className="csv-preview-table"><thead><tr><th>ROW</th><th>CSV VALUES</th><th>CHECK</th></tr></thead><tbody>{preview.slice(0, 8).map((row) => <tr key={row.line}><td>{row.line}</td><td>{row.values.join(" · ") || "—"}</td><td className={row.errors.length ? "csv-row-error" : "csv-row-valid"}>{row.errors.join("; ") || "Ready"}</td></tr>)}</tbody></table></div>
      {preview.length > 8 && <p className="entry-hint">Showing the first 8 rows. All {preview.length} rows will be checked before import.</p>}
      <button type="button" className="primary-button" onClick={importRows} disabled={saving || recordsLoading || Boolean(errorCount) || (kind === "sale" && !salesMappingReady)}>{saving ? "Importing…" : `Import ${importedCount} ${entityLabel}`}</button>
      {errorCount > 0 && <p className="entry-hint">Correct the flagged rows in your CSV, then choose the updated file.</p>}
    </>}
    <p className="entry-hint">CSV only · up to 500 rows and 1 MB per file.{kind !== "customer" && ` Prices use ${currency} and must have no more than 2 decimal places.`}{kind === "sale" && " Historical sales keep their original date and do not change current stock."}</p>
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

const SALE_IMPORT_FIELDS: SaleImportField[] = ["sale_ref", "sold_at", "customer_name", "sku", "quantity", "unit_price"];
const SALE_FIELD_LABELS: Record<SaleImportField, string> = {
  sale_ref: "Sale / order reference",
  sold_at: "Sale date and time",
  customer_name: "Customer name",
  sku: "Product SKU or name",
  quantity: "Quantity",
  unit_price: "Unit price",
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function detectSalesColumns(headers: string[]): Partial<Record<SaleImportField, string>> {
  const aliases: Record<SaleImportField, string[]> = {
    sale_ref: ["sale ref", "order id", "order no", "order number", "invoice no", "invoice number", "bill no", "bill number", "receipt no", "receipt number", "transaction id", "transaction no", "reference", "id"],
    sold_at: ["sold at", "sale date", "sold date", "transaction date", "order date", "invoice date", "date time", "timestamp", "date"],
    customer_name: ["customer name", "buyer name", "client name", "buyer", "customer", "client"],
    sku: ["sku", "product sku", "item sku", "item code", "product code", "product name", "item name", "product", "item"],
    quantity: ["quantity", "qty", "units", "item quantity"],
    unit_price: ["unit price", "selling price", "sale price", "price per unit", "rate", "price"],
  };
  const mapping: Partial<Record<SaleImportField, string>> = {};
  for (const field of SALE_IMPORT_FIELDS) {
    const found = headers.find((header) => aliases[field].includes(normalizeHeader(header)));
    if (found) mapping[field] = found;
  }
  return mapping;
}

function parseImportPrice(value: string): number | null {
  if (value.includes("-") || /^\s*\(.*\)\s*$/.test(value)) return null;
  let normalized = value.trim().replace(/[^\d.,]/g, "");
  if (!normalized) return null;
  const lastDot = normalized.lastIndexOf(".");
  const lastComma = normalized.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    normalized = lastComma > lastDot ? normalized.replace(/\./g, "").replace(",", ".") : normalized.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const decimals = normalized.length - lastComma - 1;
    normalized = decimals === 1 || decimals === 2 ? normalized.replace(",", ".") : normalized.replace(/,/g, "");
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const minor = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(minor) && minor <= 2_147_483_647 ? minor : null;
}

function buildSalesPreview(headers: string[], sourceRows: CsvSourceRow[], mapping: Partial<Record<SaleImportField, string>>, products: ProductRecord[], customers: CustomerRecord[]): ImportPreviewRow[] {
  const positions = new Map(headers.map((header, index) => [header, index]));
  const saleGroups = new Map<string, { soldAt: string; customerName: string; line: number }>();
  return sourceRows.map(({ line, cells }): ImportPreviewRow => {
    const get = (field: SaleImportField) => {
      const header = mapping[field];
      const index = header === undefined ? undefined : positions.get(header);
      return index === undefined ? "" : (cells[index] || "").trim();
    };
    const saleRef = get("sale_ref");
    const soldAt = get("sold_at");
    const customerName = get("customer_name");
    const productText = get("sku");
    const quantityText = get("quantity").replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, "");
    const unitPriceText = get("unit_price");
    const errors: string[] = [];
    const data: Record<string, string | number | null> = {
      sale_ref: saleRef,
      sold_at: soldAt,
      customer_name: customerName || null,
      sku: productText,
      quantity: 0,
      unit_price_minor: 0,
    };
    if (!saleRef) errors.push("Sale/order reference is required");
    if (saleRef.length > 128) errors.push("Sale/order reference must be 128 characters or fewer");
    const dateHasZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(soldAt);
    const parsedDate = Date.parse(soldAt);
    const normalizedDate = Number.isNaN(parsedDate) ? "" : new Date(parsedDate).toISOString();
    if (!dateHasZone || !normalizedDate) errors.push("Sale date must be ISO date/time with a timezone (for example, 2026-11-14T10:15:00+05:30)");

    if (customerName) {
      const matches = customers.filter((item) => item.name.trim().toLowerCase() === customerName.toLowerCase());
      if (matches.length === 0) errors.push("Customer name was not found in this workspace");
      else if (matches.length > 1) errors.push("More than one customer has this name; use a unique name");
    }

    const skuMatches = products.filter((item) => item.sku.trim().toLowerCase() === productText.toLowerCase());
    const productNameMatches = skuMatches.length ? [] : products.filter((item) => item.name.trim().toLowerCase() === productText.toLowerCase());
    const productMatches = skuMatches.length ? skuMatches : productNameMatches;
    if (!productText) errors.push("Product SKU or name is required");
    else if (productMatches.length === 0) errors.push("Product SKU or name was not found in this workspace");
    else if (productMatches.length > 1) errors.push("More than one product has this name; map a unique SKU column");
    else data.sku = productMatches[0].sku;

    if (!/^\d+$/.test(quantityText) || !Number.isSafeInteger(Number(quantityText)) || Number(quantityText) < 1 || Number(quantityText) > 2_147_483_647) errors.push("Quantity must be a whole number greater than zero");
    else data.quantity = Number(quantityText);
    const unitPriceMinor = parseImportPrice(unitPriceText);
    if (unitPriceMinor === null) errors.push("Unit price must be zero or more with up to 2 decimals");
    else data.unit_price_minor = unitPriceMinor;

    if (saleRef && normalizedDate) {
      const groupKey = saleRef.toLowerCase();
      const normalizedCustomerName = customerName.toLowerCase();
      const prior = saleGroups.get(groupKey);
      if (prior && (prior.soldAt !== normalizedDate || prior.customerName.toLowerCase() !== normalizedCustomerName)) errors.push(`Must match sale/order group on row ${prior.line} (same date and customer)`);
      else if (!prior) saleGroups.set(groupKey, { soldAt: normalizedDate, customerName, line });
      data.sold_at = normalizedDate;
    }
    return { line, values: SALE_IMPORT_FIELDS.map(get), errors, data };
  });
}

function money(minor: number, currency: string) {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100); }
  catch { return `${currency} ${(minor / 100).toFixed(2)}`; }
}

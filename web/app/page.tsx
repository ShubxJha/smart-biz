"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import DataEntryModal, { type EntryKind } from "./data-entry";
import { RecordEditor, SaleDetails, SaleEditor } from "./maintenance";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type Business = { id: number; name: string; currency: string; timezone: string };
type Membership = { business: Business; role: string };
type User = { id: number; email: string; full_name: string };
type Auth = { access_token: string; user: User; memberships: Membership[] };
type Summary = { order_count: number; revenue_minor: number; average_order_value_minor: number; currency: string; from_date: string; to_date: string };
type Bucket = { bucket_start: string; order_count: number; revenue_minor: number };
type Product = { product_name: string; units_sold: number; revenue_minor: number };
type Sale = { id: number; customer_id: number | null; total_minor: number; currency: string; created_at: string; external_reference: string | null; items: { product_id: number | null; product_name: string; quantity: number; unit_price_minor: number }[] };
type InventoryProduct = { id: number; name: string; sku: string; price_minor: number; stock_quantity: number; active: boolean };
type Customer = { id: number; name: string; email: string | null; phone: string | null };

function todayInZone(zone?: string) {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: zone || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
  catch { return new Date().toISOString().slice(0, 10); }
}
function earlier(day: string, amount: number) { const date = new Date(`${day}T12:00:00`); date.setDate(date.getDate() - amount); return date.toISOString().slice(0, 10); }
function money(minor: number, currency: string) {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100); }
  catch { return `${currency} ${(minor / 100).toFixed(2)}`; }
}
function dateLabel(day: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", options || { month: "short", day: "numeric" }).format(new Date(`${day}T12:00:00`));
}
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-7"/><path d="M17 6h4v4"/></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  };
  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

function SalesChart({ data, currency }: { data: Bucket[]; currency: string }) {
  const width = 720, height = 228, left = 50, right = 14, top = 12, bottom = 30;
  const max = Math.max(1, ...data.map((point) => point.revenue_minor));
  const x = (index: number) => left + (data.length <= 1 ? 0 : index * (width - left - right) / (data.length - 1));
  const y = (value: number) => top + (1 - value / max) * (height - top - bottom);
  const points = data.map((point, i) => `${x(i)},${y(point.revenue_minor)}`).join(" ");
  const area = data.length ? `${x(0)},${height - bottom} ${points} ${x(data.length - 1)},${height - bottom}` : "";
  const formatAxis = (value: number) => value >= 100000 ? `${currency} ${(value / 100000).toFixed(1)}L` : value >= 1000 ? `${currency} ${(value / 1000).toFixed(0)}k` : money(value, currency);
  return <div className="chart-wrap"><svg className="sales-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sales revenue trend">
    {[0, .25, .5, .75, 1].map((fraction) => { const value = max * fraction; const yy = y(value); return <g key={fraction}><line x1={left} x2={width - right} y1={yy} y2={yy} className="chart-grid"/><text x={left - 9} y={yy + 4} textAnchor="end" className="chart-axis">{formatAxis(value)}</text></g>; })}
    {data.length > 0 && <><polygon points={area} className="chart-area"/><polyline points={points} className="chart-line"/>{data.map((point, index) => <circle key={point.bucket_start} cx={x(index)} cy={y(point.revenue_minor)} r="3.5" className="chart-point"><title>{dateLabel(point.bucket_start, { month: "short", day: "numeric", year: "numeric" })}: {money(point.revenue_minor, currency)}</title></circle>)}</>}
    {[0, Math.floor((data.length - 1) / 3), Math.floor(2 * (data.length - 1) / 3), data.length - 1].filter((value, i, list) => data[value] && list.indexOf(value) === i).map((index) => <text key={index} x={x(index)} y={height - 7} textAnchor="middle" className="chart-axis">{dateLabel(data[index].bucket_start)}</text>)}
  </svg></div>;
}

export default function Home() {
  const pathname = usePathname();
  const [auth, setAuth] = useState<Auth | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<"sidebar" | "topbar" | null>(null);
  const [accountPanel, setAccountPanel] = useState<"profile" | "settings" | null>(null);
  const [entryKind, setEntryKind] = useState<EntryKind | null>(null);
  const [entryImportMode, setEntryImportMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [actionNotice, setActionNotice] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<Bucket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState("");
  const [showAllTopProducts, setShowAllTopProducts] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [dashboardStatus, setDashboardStatus] = useState<"checking" | "connected" | "issue">("checking");
  const [interval, setInterval] = useState("day");
  const [verificationBusy, setVerificationBusy] = useState(false);

  useEffect(() => {
    if (!accountMenuAnchor && !accountPanel) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!accountMenuAnchor) return;
      const target = event.target;
      if (target instanceof Element && !target.closest("[data-account-trigger], [data-account-menu-panel]")) {
        setAccountMenuAnchor(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuAnchor(null);
        setAccountPanel(null);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuAnchor, accountPanel]);

  async function verifyEmailToken(token: string) {
    setVerificationBusy(true);
    setError("");
    setNotice("");
    setVerificationUrl("");
    try {
      const response = await fetch(`${API}/api/v1/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || "This verification link is invalid or expired.");
      }
      setNotice("Email verified. You can now sign in.");
      setMode("login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Email verification failed.");
    } finally {
      setVerificationBusy(false);
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const invitationToken = url.searchParams.get("token") || new URLSearchParams(url.hash.slice(1)).get("token");
    const emailToken = url.searchParams.get("verify") || new URLSearchParams(url.hash.slice(1)).get("verify");
    if (invitationToken) {
      setInviteToken(invitationToken);
      window.history.replaceState({}, "", url.pathname);
    } else if (emailToken) {
      window.history.replaceState({}, "", url.pathname);
      void verifyEmailToken(emailToken);
    }
    const saved = sessionStorage.getItem("smartbiz-auth");
    if (saved) { try { const next = JSON.parse(saved) as Auth; setAuth(next); setSelectedId(next.memberships[0]?.business.id ?? null); } catch { sessionStorage.removeItem("smartbiz-auth"); } }
  }, []);

  useEffect(() => {
    if (!auth || !inviteToken) return;
    const currentAuth: Auth = auth;
    let cancelled = false;
    async function acceptInvitation() {
      setInviteError("");
      try {
        const response = await fetch(`${API}/api/v1/auth/invitations/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentAuth.access_token}` },
          body: JSON.stringify({ token: inviteToken }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Unable to accept this invitation.");
        if (cancelled) return;
        const membership = result as Membership;
        const next = { ...currentAuth, memberships: [...currentAuth.memberships.filter((item) => item.business.id !== membership.business.id), membership] };
        sessionStorage.setItem("smartbiz-auth", JSON.stringify(next));
        setAuth(next);
        setSelectedId(membership.business.id);
        setInviteToken("");
        const day = todayInZone(membership.business.timezone);
        setEnd(day);
        setStart(earlier(day, 29));
      } catch (cause) {
        if (!cancelled) setInviteError(cause instanceof Error ? cause.message : "Unable to accept this invitation.");
      }
    }
    void acceptInvitation();
    return () => { cancelled = true; };
  }, [auth, inviteToken]);

  const business = auth?.memberships.find((item) => item.business.id === selectedId)?.business;
  useEffect(() => {
    const routeSection: Record<string, string> = { "/": "overview", "/sales": "sales", "/products": "products", "/customers": "customers" };
    setActiveSection(routeSection[pathname] || (pathname === "/" && window.location.hash === "#analytics" ? "analytics" : "overview"));
  }, [pathname]);
  useEffect(() => {
    if (business && !start) { const localToday = todayInZone(business.timezone); setEnd(localToday); setStart(earlier(localToday, 29)); }
  }, [business, start]);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!auth || !selectedId) throw new Error("Select a business to continue.");
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${auth.access_token}`);
    headers.set("X-Business-Id", String(selectedId));
    const response = await fetch(`${API}${path}`, { ...init, headers });
    if (response.status === 401) { sessionStorage.removeItem("smartbiz-auth"); setAuth(null); throw new Error("Your session expired. Please sign in again."); }
    if (!response.ok) { const body = await response.json().catch(() => null); const detail = body?.detail; throw new Error((typeof detail === "string" ? detail : detail?.message) || `Request failed (${response.status})`); }
    return response;
  }, [auth, selectedId]);

  const loadDashboard = useCallback(async () => {
    if (!auth || !selectedId || !start || !end) return;
    setLoading(true); setError("");
    setDashboardStatus("checking");
    const params = new URLSearchParams({ from_date: start, to_date: end });
    try {
      const [summaryResponse, trendResponse, productsResponse, salesResponse] = await Promise.all([
        request(`/api/v1/dashboard/summary?${params}`),
        request(`/api/v1/analytics/sales-trend?${params}&interval=${interval}`),
        request(`/api/v1/analytics/top-products?${params}&limit=100`),
        request(`/api/v1/sales?${params}&limit=500`),
      ]);
      const [s, t, p, recent] = await Promise.all([summaryResponse.json(), trendResponse.json(), productsResponse.json(), salesResponse.json()]);
      setSummary(s); setTrend(t.buckets || []); setProducts(p.products || []); setSales(recent || []);
      setDashboardStatus("connected");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load your sales data."); setDashboardStatus("issue"); }
    finally { setLoading(false); }
  }, [auth, selectedId, start, end, interval, request]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const loadWorkspaceRecords = useCallback(async () => {
    if (!auth || !selectedId) return;
    setRecordsLoading(true);
    setRecordsError("");
    try {
      const [productsResponse, customersResponse] = await Promise.all([
        request("/api/v1/products"),
        request("/api/v1/customers"),
      ]);
      const [productRecords, customerRecords] = await Promise.all([
        productsResponse.json() as Promise<InventoryProduct[]>,
        customersResponse.json() as Promise<Customer[]>,
      ]);
      setInventory(productRecords);
      setCustomers(customerRecords);
    } catch (cause) {
      setRecordsError(cause instanceof Error ? cause.message : "Could not load products and customers.");
    } finally {
      setRecordsLoading(false);
    }
  }, [auth, selectedId, request]);

  useEffect(() => { void loadWorkspaceRecords(); }, [loadWorkspaceRecords]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setVerificationUrl("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = mode === "register"
      ? { email: values.email, password: values.password, full_name: values.full_name, business_name: inviteToken ? undefined : values.business_name }
      : { email: values.email, password: values.password };
    try {
      const response = await fetch(`${API}/api/v1/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (mode === "register" && response.ok) {
        setNotice(result.message || "Check your email to verify your account before signing in.");
        setVerificationUrl(result.verification_url || "");
        setMode("login");
        return;
      }
      if (!response.ok) {
        const detail = typeof result.detail === "string" ? result.detail : result.detail?.message || "Unable to sign in.";
        if (result.detail?.verification_url) setVerificationUrl(result.detail.verification_url);
        throw new Error(detail);
      }
      const next = result as Auth; sessionStorage.setItem("smartbiz-auth", JSON.stringify(next)); setAuth(next); setSelectedId(next.memberships[0]?.business.id ?? null);
      const day = todayInZone(next.memberships[0]?.business.timezone); setEnd(day); setStart(earlier(day, 29));
      if (!next.memberships.length && !inviteToken) setError("Account created. Ask a business owner for an invitation, then sign in again.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }

  async function logout() {
    try { await request("/api/v1/auth/logout", { method: "POST" }); } catch { /* Local session still needs to end. */ }
    sessionStorage.removeItem("smartbiz-auth"); setAuth(null); setSummary(null);
  }

  async function downloadCsv() {
    setError("");
    try {
      const params = new URLSearchParams({ from_date: start, to_date: end });
      const response = await request(`/api/v1/reports/sales.csv?${params}`);
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `smartbiz-sales-${start}-${end}.csv`; link.click(); URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "CSV download failed."); }
  }

  const maxProductRevenue = useMemo(() => Math.max(1, ...products.map((product) => product.revenue_minor)), [products]);
  const dateRange = `${dateLabel(start || todayInZone(), { month: "short", day: "numeric" })} – ${dateLabel(end || todayInZone(), { month: "short", day: "numeric", year: "numeric" })}`;
  const selectedRole = auth?.memberships.find((item) => item.business.id === selectedId)?.role;
  const canManageProducts = selectedRole === "owner" || selectedRole === "admin";
  const canRecordSales = canManageProducts || selectedRole === "sales";

  function openEntry(kind: EntryKind, importCsv = false) {
    setActionNotice("");
    setEntryImportMode(importCsv);
    setEntryKind(kind);
  }

  function entrySaved(kind: EntryKind, importedCount?: number) {
    const messages: Record<EntryKind, string> = {
      product: importedCount === undefined ? "Product added to your inventory." : `${importedCount} products imported to your inventory.`,
      customer: importedCount === undefined ? "Customer added to your records." : `${importedCount} customers imported to your records.`,
      sale: importedCount === undefined ? "Sale recorded and inventory updated." : `${importedCount} historical sales imported. Current inventory was not changed.`,
    };
    setEntryKind(null);
    setActionNotice(messages[kind]);
    if (kind === "sale") void loadDashboard();
    void loadWorkspaceRecords();
  }

  async function setProductActive(product: InventoryProduct, active: boolean) {
    setRecordsError("");
    try {
      await request(`/api/v1/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ active }) });
      setActionNotice(`${product.name} ${active ? "activated" : "deactivated"}.`);
      void loadWorkspaceRecords();
    } catch (cause) { setRecordsError(cause instanceof Error ? cause.message : "Could not update product status."); }
  }

  async function removeProduct(product: InventoryProduct) {
    if (!window.confirm(`Remove “${product.name}” from this workspace? Products used in sales will be deactivated to preserve their history.`)) return;
    setRecordsError("");
    try {
      const response = await request(`/api/v1/products/${product.id}`, { method: "DELETE" });
      const result = await response.json() as { deleted: boolean; deactivated: boolean };
      setActionNotice(result.deactivated ? `${product.name} was deactivated to preserve past sales.` : `${product.name} was removed.`);
      void loadWorkspaceRecords();
    } catch (cause) { setRecordsError(cause instanceof Error ? cause.message : "Could not remove product."); }
  }

  async function removeCustomer(customer: Customer) {
    if (!window.confirm(`Delete customer “${customer.name}”? Past sales will remain, without this customer link.`)) return;
    setRecordsError("");
    try {
      await request(`/api/v1/customers/${customer.id}`, { method: "DELETE" });
      setActionNotice(`${customer.name} was deleted.`);
      void loadWorkspaceRecords();
    } catch (cause) { setRecordsError(cause instanceof Error ? cause.message : "Could not delete customer."); }
  }

  async function removeSale(sale: Sale) {
    if (!window.confirm(`Delete order #${String(sale.id).padStart(5, "0")} from sales and analytics? Manually recorded items will be returned to stock.`)) return;
    setError("");
    try {
      await request(`/api/v1/sales/${sale.id}`, { method: "DELETE" });
      setSelectedSale(null);
      setActionNotice("Sale removed. Analytics and inventory have been updated.");
      void loadDashboard();
      void loadWorkspaceRecords();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete sale."); }
  }

  const visibleTopProducts = showAllTopProducts ? products : products.slice(0, 5);
  const visibleSales = activeSection === "overview" ? sales.slice(0, 6) : sales;

  if (!auth) return <main className="auth-shell"><section className="auth-visual"><div className="brand brand-light"><span className="brand-mark"><Icon name="grid" size={19}/></span><span>smart<span className="brand-accent">biz</span></span></div><div className="auth-copy"><span className="eyebrow">BUSINESS, IN FOCUS</span><h1>Know your numbers.<br/>Grow with confidence.</h1><p>One clear view of your sales, customers, and what’s working for your business.</p><div className="preview-card"><div className="preview-head"><span>Revenue overview</span><span className="preview-period">Last 30 days</span></div><div className="preview-number">₹ 2,48,560 <span>↗ 12.8%</span></div><div className="preview-bars">{[34, 48, 38, 57, 44, 66, 52, 76, 61, 89, 68, 100, 81, 92, 73, 100, 84, 96, 72, 87].map((height, index) => <i key={index} style={{ height: `${height}%` }}/>)}</div></div></div><div className="auth-visual-footer">A simpler way to run your business.</div></section>
    <section className="auth-panel"><form className="auth-form" onSubmit={submitAuth}><div className="mobile-brand brand"><span className="brand-mark"><Icon name="grid" size={19}/></span><span>smart<span className="brand-accent">biz</span></span></div>{inviteToken && <div className="invite-banner"><strong>You’re invited to join a business</strong><span>Sign in with the invited email, or create an account to accept.</span></div>}<span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span><h2>{mode === "login" ? "Sign in to SmartBiz" : inviteToken ? "Join your team" : "Create your account"}</h2><p className="form-intro">{mode === "login" ? "Enter your details to access your dashboard." : inviteToken ? "Use the same email address that received the invitation." : "Set up your account and business workspace."}</p>
      {mode === "register" && <label>Full name<input name="full_name" autoComplete="name" placeholder="Your name" required minLength={1}/></label>}
      {mode === "register" && !inviteToken && <label>Business name<input name="business_name" placeholder="e.g. The Corner Store" required minLength={1}/></label>}
      <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required/></label><label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" required minLength={mode === "login" ? 1 : 8}/></label>
      {notice && <div className="invite-banner" role="status"><strong>{notice}</strong>{verificationUrl && <a href={verificationUrl} onClick={(event) => { const destination = new URL(event.currentTarget.href); const token = destination.searchParams.get("verify") || new URLSearchParams(destination.hash.slice(1)).get("verify"); if (destination.origin === window.location.origin && token) { event.preventDefault(); window.history.replaceState({}, "", destination.pathname); void verifyEmailToken(token); } }}>{verificationBusy ? "Verifying…" : "Open verification link"}</a>}</div>}{error && <div className="error-message" role="alert">{error}{verificationUrl && <> <a href={verificationUrl} onClick={(event) => { const destination = new URL(event.currentTarget.href); const token = destination.searchParams.get("verify") || new URLSearchParams(destination.hash.slice(1)).get("verify"); if (destination.origin === window.location.origin && token) { event.preventDefault(); window.history.replaceState({}, "", destination.pathname); void verifyEmailToken(token); } }}>{verificationBusy ? "Verifying…" : "Open verification link"}</a></>}</div>}<button className="primary-button auth-submit" disabled={busy || verificationBusy}>{busy ? "Please wait…" : verificationBusy ? "Verifying…" : mode === "login" ? "Sign in" : "Create account"}</button><p className="auth-switch">{mode === "login" ? "New to SmartBiz?" : "Already have an account?"} <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setNotice(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p><p className="secure-note"><span>●</span> Your business data is private and secure</p></form></section></main>;

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark"><Icon name="grid" size={19}/></span><span>smart<span className="brand-accent">biz</span></span></div><div className="workspace-switch"><span className="workspace-avatar">{initials(business?.name || "SB")}</span><span className="workspace-copy"><strong>{business?.name || "Choose a business"}</strong><small>{business ? `${business.currency} · ${business.timezone}` : "No workspace assigned"}</small></span><select aria-label="Select business" value={selectedId ?? ""} onChange={(event) => setSelectedId(Number(event.target.value))}>{auth.memberships.map((item) => <option key={item.business.id} value={item.business.id}>{item.business.name}</option>)}</select><span className="chevron">⌄</span></div>
    <nav className="side-nav" aria-label="Main navigation"><span className="nav-caption">WORKSPACE</span><a title="Overview" className={`nav-item${activeSection === "overview" ? " active" : ""}`} href="/" onClick={() => setActiveSection("overview")}><Icon name="grid"/>Overview</a><a title="Sales" className={`nav-item${activeSection === "sales" ? " active" : ""}`} href="/sales" onClick={() => setActiveSection("sales")}><Icon name="bag"/>Sales</a><a title="Products" className={`nav-item${activeSection === "products" ? " active" : ""}`} href="/products" onClick={() => setActiveSection("products")}><Icon name="box"/>Products</a><a title="Customers" className={`nav-item${activeSection === "customers" ? " active" : ""}`} href="/customers" onClick={() => setActiveSection("customers")}><Icon name="people"/>Customers</a><span className="nav-caption nav-spaced">INSIGHTS</span><a title="Analytics" className={`nav-item${activeSection === "analytics" ? " active" : ""}`} href="/#analytics" onClick={() => setActiveSection("analytics")}><Icon name="chart"/>Analytics</a></nav>
    <div className="sidebar-bottom"><div className="sidebar-help"><span className="help-icon">?</span><div><strong>Need a hand?</strong><small>Visit the help center</small></div><span className="help-arrow">↗</span></div>{accountMenuAnchor === "sidebar" && <div className="profile-popover" role="menu" aria-label="Account menu" data-account-menu-panel><button type="button" role="menuitem" onClick={() => { setAccountPanel("profile"); setAccountMenuAnchor(null); }}>My profile</button><button type="button" role="menuitem" onClick={() => { setAccountPanel("settings"); setAccountMenuAnchor(null); }}>Settings</button><button type="button" role="menuitem" className="profile-signout" onClick={() => { setAccountMenuAnchor(null); void logout(); }}>Sign out</button></div>}<button className="profile-row" type="button" data-account-trigger aria-haspopup="menu" aria-expanded={accountMenuAnchor === "sidebar"} onClick={() => setAccountMenuAnchor((anchor) => anchor === "sidebar" ? null : "sidebar")}><span className="profile-avatar">{initials(auth.user.full_name)}</span><span className="profile-copy"><strong>{auth.user.full_name}</strong><small>{auth.user.email}</small></span><span className="profile-menu">⋯</span></button></div>
  </aside><main className="main-content" id="overview"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{activeSection[0].toUpperCase() + activeSection.slice(1)}</strong></div><div className="topbar-right"><span className={`today-chip status-${dashboardStatus}`}><i/>{dashboardStatus === "checking" ? "Checking connection" : dashboardStatus === "connected" ? "Connected" : "Connection issue"}</span><button className="icon-button" title="Notifications" aria-label="Notifications"><Icon name="bell"/><i/></button>{accountMenuAnchor === "topbar" && <div className="profile-popover topbar-account-popover" role="menu" aria-label="Account menu" data-account-menu-panel><button type="button" role="menuitem" onClick={() => { setAccountPanel("profile"); setAccountMenuAnchor(null); }}>My profile</button><button type="button" role="menuitem" onClick={() => { setAccountPanel("settings"); setAccountMenuAnchor(null); }}>Settings</button><button type="button" role="menuitem" className="profile-signout" onClick={() => { setAccountMenuAnchor(null); void logout(); }}>Sign out</button></div>}<button className="top-avatar top-avatar-button" type="button" data-account-trigger aria-label="Account menu" aria-haspopup="menu" aria-expanded={accountMenuAnchor === "topbar"} onClick={() => setAccountMenuAnchor((anchor) => anchor === "topbar" ? null : "topbar")}>{initials(auth.user.full_name)}</button></div></header><nav className="mobile-nav" aria-label="Main navigation"><a className={`nav-item${activeSection === "overview" ? " active" : ""}`} href="/" onClick={() => setActiveSection("overview")}><Icon name="grid"/>Overview</a><a className={`nav-item${activeSection === "sales" ? " active" : ""}`} href="/sales" onClick={() => setActiveSection("sales")}><Icon name="bag"/>Sales</a><a className={`nav-item${activeSection === "products" ? " active" : ""}`} href="/products" onClick={() => setActiveSection("products")}><Icon name="box"/>Products</a><a className={`nav-item${activeSection === "customers" ? " active" : ""}`} href="/customers" onClick={() => setActiveSection("customers")}><Icon name="people"/>Customers</a><a className={`nav-item${activeSection === "analytics" ? " active" : ""}`} href="/#analytics" onClick={() => setActiveSection("analytics")}><Icon name="chart"/>Analytics</a></nav>
    <div className="content-wrap"><div className="page-heading"><div><span className="eyebrow">{activeSection === "overview" ? "YOUR BUSINESS AT A GLANCE" : "WORKSPACE"}</span><h1>{activeSection === "overview" ? <>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {auth.user.full_name.split(" ")[0]} <span className="wave">✦</span></> : activeSection === "sales" ? "Sales" : activeSection === "products" ? "Products" : activeSection === "customers" ? "Customers" : "Analytics"}</h1><p>{activeSection === "overview" ? `Here’s what’s happening with ${business?.name || "your business"}.` : activeSection === "sales" ? "Review orders, import history, and keep your sales records accurate." : activeSection === "products" ? "Manage your catalog, pricing, and stock levels." : activeSection === "customers" ? "Keep customer contact details tidy and up to date." : `Performance insights for ${business?.name || "your business"}.`}</p></div><div className="heading-actions entry-actions">
      {activeSection === "overview" && canManageProducts && <button className="secondary-button" type="button" onClick={() => openEntry("product")}><Icon name="box" size={15}/> Add product</button>}
      {activeSection === "products" && canManageProducts && <><button className="secondary-button" type="button" onClick={() => openEntry("product")}><Icon name="box" size={15}/> Add product</button><button className="secondary-button" type="button" onClick={() => openEntry("product", true)}><Icon name="download" size={15}/> Import CSV</button></>}
      {activeSection === "overview" && canRecordSales && <button className="secondary-button" type="button" onClick={() => openEntry("customer")}><Icon name="people" size={15}/> Add customer</button>}
      {activeSection === "customers" && canRecordSales && <><button className="secondary-button" type="button" onClick={() => openEntry("customer")}><Icon name="people" size={15}/> Add customer</button><button className="secondary-button" type="button" onClick={() => openEntry("customer", true)}><Icon name="download" size={15}/> Import CSV</button></>}
      {activeSection === "overview" && canRecordSales && <button className="primary-button entry-sale-button" type="button" onClick={() => openEntry("sale")}><Icon name="bag" size={15}/> Record sale</button>}
      {activeSection === "sales" && canRecordSales && <><button className="primary-button entry-sale-button" type="button" onClick={() => openEntry("sale")}><Icon name="bag" size={15}/> Record sale</button><button className="secondary-button" type="button" onClick={() => openEntry("sale", true)}><Icon name="download" size={15}/> Import CSV</button></>}
      {(activeSection === "overview" || activeSection === "sales") && <button className="secondary-button" type="button" onClick={() => void downloadCsv()}><Icon name="download" size={15}/> Export report</button>}
    </div></div>
    {(activeSection === "overview" || activeSection === "sales" || activeSection === "analytics") && <section className="filter-bar"><div className="filter-title"><span className="filter-icon"><Icon name="calendar" size={16}/></span><span><strong>Date range</strong><small>{dateRange}</small></span></div><div className="date-controls"><label><span>From</span><input type="date" value={start} max={end || undefined} onChange={(event) => setStart(event.target.value)}/></label><span className="date-separator">—</span><label><span>To</span><input type="date" value={end} min={start || undefined} max={todayInZone(business?.timezone)} onChange={(event) => setEnd(event.target.value)}/></label><button className="date-apply" onClick={() => void loadDashboard()} disabled={loading || !start || !end}>{loading ? "Loading…" : "Apply"}</button></div><button className="filter-export" onClick={() => void downloadCsv()} title="Export report"><Icon name="download" size={17}/></button></section>}
    {actionNotice && <div className="entry-success" role="status">{actionNotice}<button type="button" onClick={() => setActionNotice("")} aria-label="Dismiss">×</button></div>}
    {inviteError && <div className="inline-error" role="alert">{inviteError}<button onClick={() => void logout()}>Sign out to use another account</button></div>}
    {error && <div className="inline-error" role="alert">{error}<button onClick={() => void loadDashboard()}>Retry</button></div>}
    {recordsError && <div className="inline-error" role="alert">{recordsError}<button type="button" onClick={() => void loadWorkspaceRecords()}>Retry</button></div>}
    {(activeSection === "overview" || activeSection === "analytics") && <>
    <section className="metric-grid" aria-label="Sales key metrics"><Metric title="Total revenue" value={summary ? money(summary.revenue_minor, summary.currency) : "—"} note={dateRange} icon="chart" tone="green"/><Metric title="Total orders" value={summary?.order_count.toLocaleString("en-IN") ?? "—"} note="Orders in selected period" icon="bag" tone="blue"/><Metric title="Average order value" value={summary ? money(summary.average_order_value_minor, summary.currency) : "—"} note="Revenue per order" icon="arrow" tone="orange"/><Metric title="Products sold" value={products.reduce((total, item) => total + item.units_sold, 0).toLocaleString("en-IN")} note="Units across all orders" icon="box" tone="purple"/></section>
    <section className="dashboard-grid"><article className="panel trend-panel" id="analytics"><div className="panel-header"><div><h2>Sales overview</h2><p>Revenue over time for the selected period</p></div><div className="panel-actions"><span className="legend"><i/> Revenue</span><select className="interval-select" value={interval} onChange={(event) => setInterval(event.target.value)} aria-label="Chart interval"><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select></div></div><SalesChart data={trend} currency={summary?.currency || business?.currency || "INR"}/></article>
    <article className="panel products-panel"><div className="panel-header"><div><h2>Top products</h2><p>Best performers by revenue</p></div><button className="text-link text-button" type="button" onClick={() => setShowAllTopProducts((show) => !show)}>{showAllTopProducts ? "Show less" : "View all"} <span>→</span></button></div><div className="product-list">{visibleTopProducts.map((product, index) => <div className="product-row" key={product.product_name}><span className={`product-thumb p-${index % 5}`}><Icon name="box" size={19}/></span><span className="product-data"><strong>{product.product_name}</strong><small>{product.units_sold} units sold</small><span className="product-track"><i style={{ width: `${Math.max(7, product.revenue_minor / maxProductRevenue * 100)}%` }}/></span></span><strong className="product-revenue">{money(product.revenue_minor, summary?.currency || business?.currency || "INR")}</strong></div>)}{!products.length && <Empty text="No product sales in this period"/>}</div></article></section>
    </>}
    {activeSection === "products" && <section className="panel recent-panel inventory-panel"><div className="panel-header"><div><h2>Product inventory</h2><p>{inventory.length} products · Prices and stock for this workspace</p></div></div><div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>SKU</th><th>PRICE</th><th>IN STOCK</th><th>STATUS</th>{canManageProducts && <th>ACTIONS</th>}</tr></thead><tbody>{inventory.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.sku}</td><td>{money(product.price_minor, business?.currency || "INR")}</td><td>{product.stock_quantity}</td><td><span className={`inventory-status${product.active ? " is-active" : ""}`}>{product.active ? "Active" : "Inactive"}</span></td>{canManageProducts && <td className="record-actions"><button type="button" onClick={() => setEditingProduct(product)}>Edit</button><button type="button" onClick={() => void setProductActive(product, !product.active)}>{product.active ? "Deactivate" : "Activate"}</button><button type="button" className="danger-action" onClick={() => void removeProduct(product)}>Remove</button></td>}</tr>)}</tbody></table>{recordsLoading ? <Empty text="Loading products…"/> : !inventory.length && <Empty text="No products yet. Add or import products to start tracking stock."/>}</div></section>}
    {(activeSection === "overview" || activeSection === "sales") && <section className="panel recent-panel" id="sales"><div className="panel-header"><div><h2>{activeSection === "overview" ? "Recent sales" : "Sales"}</h2><p>{activeSection === "overview" ? "Latest orders in the selected period" : `${sales.length} orders in the selected date range`}</p></div>{activeSection === "overview" && <a className="text-link" href="/sales">View all sales <span>→</span></a>}</div><div className="table-scroll"><table><thead><tr><th>ORDER</th><th>ITEMS</th><th>DATE &amp; TIME</th><th>STATUS</th><th className="amount-col">AMOUNT</th><th>ACTIONS</th></tr></thead><tbody>{visibleSales.map((sale) => <tr key={sale.id}><td><strong className="order-id">#{String(sale.id).padStart(5, "0")}</strong></td><td><span className="sale-items">{sale.items.slice(0, 2).map((item) => item.product_name).join(", ")}{sale.items.length > 2 ? ` +${sale.items.length - 2} more` : ""}</span></td><td><span className="sale-time"><Icon name="clock" size={14}/>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: business?.timezone }).format(new Date(sale.created_at))}</span></td><td><span className="status-pill"><i/>{sale.external_reference ? "Imported" : "Completed"}</span></td><td className="amount-col"><strong>{money(sale.total_minor, sale.currency)}</strong></td><td className="record-actions"><button type="button" onClick={() => setEditingSale(sale)}>Edit</button><button type="button" onClick={() => setSelectedSale(sale)}>View</button>{canManageProducts && <button type="button" className="danger-action" onClick={() => void removeSale(sale)}>Delete</button>}</td></tr>)}</tbody></table>{loading ? <Empty text="Loading sales…"/> : !sales.length && <Empty text="No sales found in this period"/>}</div></section>}
    {activeSection === "customers" && <section className="panel recent-panel"><div className="panel-header"><div><h2>Customer directory</h2><p>{customers.length} customer records for this workspace</p></div></div><div className="table-scroll"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>PHONE</th>{canManageProducts && <th>ACTIONS</th>}</tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td>{customer.name}</td><td>{customer.email || "—"}</td><td>{customer.phone || "—"}</td>{canManageProducts && <td className="record-actions"><button type="button" onClick={() => setEditingCustomer(customer)}>Edit</button><button type="button" className="danger-action" onClick={() => void removeCustomer(customer)}>Delete</button></td>}</tr>)}</tbody></table>{recordsLoading ? <Empty text="Loading customers…"/> : !customers.length && <Empty text="No customers yet. Add or import customers to your workspace."/>}</div></section>}
    <footer className="page-footer"><span>© 2026 SmartBiz</span>{(activeSection === "overview" || activeSection === "sales" || activeSection === "analytics") && <span>Showing {dateRange} · Timezone: {business?.timezone || "—"}</span>}<a href={`${API}/docs`} target="_blank" rel="noreferrer">API documentation ↗</a></footer></div>
  </main>{entryKind && <DataEntryModal kind={entryKind} currency={business?.currency || "INR"} request={request} startInImport={entryImportMode} onClose={() => setEntryKind(null)} onSaved={entrySaved}/>}{editingProduct && <RecordEditor kind="product" record={editingProduct} currency={business?.currency || "INR"} request={request} onClose={() => setEditingProduct(null)} onSaved={() => { setEditingProduct(null); setActionNotice("Product updated."); void loadWorkspaceRecords(); }}/>}{editingCustomer && <RecordEditor kind="customer" record={editingCustomer} currency={business?.currency || "INR"} request={request} onClose={() => setEditingCustomer(null)} onSaved={() => { setEditingCustomer(null); setActionNotice("Customer updated."); void loadWorkspaceRecords(); }}/>}{editingSale && <SaleEditor sale={editingSale} products={inventory} customers={customers} currency={editingSale.currency} request={request} onClose={() => setEditingSale(null)} onSaved={() => { setEditingSale(null); setActionNotice("Sale updated. Inventory has been reconciled."); void loadDashboard(); void loadWorkspaceRecords(); }}/>}{selectedSale && <SaleDetails sale={selectedSale} currency={selectedSale.currency} onClose={() => setSelectedSale(null)}/>}{accountPanel && <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountPanel(null); }}><section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title" tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape") setAccountPanel(null); }}><div className="account-modal-header"><div><span className="eyebrow">ACCOUNT</span><h2 id="account-modal-title">{accountPanel === "profile" ? "My profile" : "Settings"}</h2></div><button type="button" className="account-close" aria-label="Close" onClick={() => setAccountPanel(null)}>×</button></div>{accountPanel === "profile" ? <><div className="account-profile-summary"><span className="account-avatar">{initials(auth.user.full_name)}</span><div><strong>{auth.user.full_name}</strong><small>{auth.user.email}</small></div></div><dl className="account-details"><div><dt>Workspace</dt><dd>{business?.name || "No workspace selected"}</dd></div><div><dt>Your role</dt><dd>{auth.memberships.find((item) => item.business.id === selectedId)?.role || "Member"}</dd></div></dl></> : <><p className="account-panel-intro">Your current workspace and account settings.</p><dl className="account-details"><div><dt>Workspace</dt><dd>{business?.name || "No workspace selected"}</dd></div><div><dt>Currency</dt><dd>{business?.currency || "—"}</dd></div><div><dt>Timezone</dt><dd>{business?.timezone || "—"}</dd></div><div><dt>Account email</dt><dd>{auth.user.email}</dd></div></dl><p className="account-settings-note">Workspace values are managed by your business setup. Contact your workspace owner to change them.</p></>}</section></div>}</div>;
}

function Metric({ title, value, note, icon, tone }: { title: string; value: string; note: string; icon: string; tone: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{title}</span><span className={`metric-icon ${tone}`}><Icon name={icon} size={18}/></span></div><strong className="metric-value">{value}</strong><div className="metric-note"><span className="note-dot"/>{note}</div></article>;
}

function Empty({ text }: { text: string }) { return <div className="empty-state"><span className="empty-icon"><Icon name="bag" size={20}/></span><span>{text}</span></div>; }

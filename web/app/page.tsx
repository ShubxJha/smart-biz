"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type Business = { id: number; name: string; currency: string; timezone: string };
type Membership = { business: Business; role: string };
type User = { id: number; email: string; full_name: string };
type Auth = { access_token: string; user: User; memberships: Membership[] };
type Summary = { order_count: number; revenue_minor: number; average_order_value_minor: number; currency: string; from_date: string; to_date: string };
type Bucket = { bucket_start: string; order_count: number; revenue_minor: number };
type Product = { product_name: string; units_sold: number; revenue_minor: number };
type Sale = { id: number; total_minor: number; currency: string; created_at: string; items: { product_name: string; quantity: number }[] };

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
  const [auth, setAuth] = useState<Auth | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<Bucket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [interval, setInterval] = useState("day");

  useEffect(() => {
    const url = new URL(window.location.href);
    const invitationToken = url.searchParams.get("token") || new URLSearchParams(url.hash.slice(1)).get("token");
    if (invitationToken) {
      setInviteToken(invitationToken);
      window.history.replaceState({}, "", url.pathname);
    }
    const saved = sessionStorage.getItem("smartbiz-auth");
    if (saved) { try { const next = JSON.parse(saved) as Auth; setAuth(next); setSelectedId(next.memberships[0]?.business.id ?? null); } catch { sessionStorage.removeItem("smartbiz-auth"); } }
  }, []);

  useEffect(() => {
    if (!auth || !inviteToken) return;
    let cancelled = false;
    async function acceptInvitation() {
      setInviteError("");
      try {
        const response = await fetch(`${API}/api/v1/auth/invitations/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth!.access_token}` },
          body: JSON.stringify({ token: inviteToken }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Unable to accept this invitation.");
        if (cancelled) return;
        const membership = result as Membership;
        const next = { ...auth, memberships: [...auth.memberships.filter((item) => item.business.id !== membership.business.id), membership] };
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
    if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.detail || `Request failed (${response.status})`); }
    return response;
  }, [auth, selectedId]);

  const loadDashboard = useCallback(async () => {
    if (!auth || !selectedId || !start || !end) return;
    setLoading(true); setError("");
    const params = new URLSearchParams({ from_date: start, to_date: end });
    try {
      const [summaryResponse, trendResponse, productsResponse, salesResponse] = await Promise.all([
        request(`/api/v1/dashboard/summary?${params}`),
        request(`/api/v1/analytics/sales-trend?${params}&interval=${interval}`),
        request(`/api/v1/analytics/top-products?${params}`),
        request(`/api/v1/sales?${params}&limit=6`),
      ]);
      const [s, t, p, recent] = await Promise.all([summaryResponse.json(), trendResponse.json(), productsResponse.json(), salesResponse.json()]);
      setSummary(s); setTrend(t.buckets || []); setProducts(p.products || []); setSales(recent || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load your sales data."); }
    finally { setLoading(false); }
  }, [auth, selectedId, start, end, interval, request]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = mode === "register"
      ? { email: values.email, password: values.password, full_name: values.full_name, business_name: inviteToken ? undefined : values.business_name }
      : { email: values.email, password: values.password };
    try {
      const response = await fetch(`${API}/api/v1/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Unable to sign in.");
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

  if (!auth) return <main className="auth-shell"><section className="auth-visual"><div className="brand brand-light"><span className="brand-mark"><Icon name="grid" size={19}/></span><span>smart<span className="brand-accent">biz</span></span></div><div className="auth-copy"><span className="eyebrow">BUSINESS, IN FOCUS</span><h1>Know your numbers.<br/>Grow with confidence.</h1><p>One clear view of your sales, customers, and what’s working for your business.</p><div className="preview-card"><div className="preview-head"><span>Revenue overview</span><span className="preview-period">Last 30 days</span></div><div className="preview-number">₹ 2,48,560 <span>↗ 12.8%</span></div><div className="preview-bars">{[34, 48, 38, 57, 44, 66, 52, 76, 61, 89, 68, 100, 81, 92, 73, 100, 84, 96, 72, 87].map((height, index) => <i key={index} style={{ height: `${height}%` }}/>)}</div></div></div><div className="auth-visual-footer">A simpler way to run your business.</div></section>
    <section className="auth-panel"><form className="auth-form" onSubmit={submitAuth}><div className="mobile-brand brand"><span className="brand-mark"><Icon name="grid" size={19}/></span><span>smart<span className="brand-accent">biz</span></span></div>{inviteToken && <div className="invite-banner"><strong>You’re invited to join a business</strong><span>Sign in with the invited email, or create an account to accept.</span></div>}<span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span><h2>{mode === "login" ? "Sign in to SmartBiz" : inviteToken ? "Join your team" : "Create your account"}</h2><p className="form-intro">{mode === "login" ? "Enter your details to access your dashboard." : inviteToken ? "Use the same email address that received the invitation." : "Set up your account and business workspace."}</p>
      {mode === "register" && <label>Full name<input name="full_name" autoComplete="name" placeholder="Your name" required minLength={1}/></label>}
      {mode === "register" && !inviteToken && <label>Business name<input name="business_name" placeholder="e.g. The Corner Store" required minLength={1}/></label>}
      <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required/></label><label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" required minLength={mode === "login" ? 1 : 8}/></label>
      {error && <div className="error-message" role="alert">{error}</div>}<button className="primary-button auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button><p className="auth-switch">{mode === "login" ? "New to SmartBiz?" : "Already have an account?"} <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p><p className="secure-note"><span>●</span> Your business data is private and secure</p></form></section></main>;

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark"><Icon name="grid" size={19}/></span><span>smart<span className="brand-accent">biz</span></span></div><div className="workspace-switch"><span className="workspace-avatar">{initials(business?.name || "SB")}</span><span className="workspace-copy"><strong>{business?.name || "Choose a business"}</strong><small>{business ? `${business.currency} · ${business.timezone}` : "No workspace assigned"}</small></span><select aria-label="Select business" value={selectedId ?? ""} onChange={(event) => setSelectedId(Number(event.target.value))}>{auth.memberships.map((item) => <option key={item.business.id} value={item.business.id}>{item.business.name}</option>)}</select><span className="chevron">⌄</span></div>
    <nav className="side-nav"><span className="nav-caption">WORKSPACE</span><a className="nav-item active" href="#overview"><Icon name="grid"/>Overview</a><a className="nav-item" href="#sales"><Icon name="bag"/>Sales</a><a className="nav-item" href="#products"><Icon name="box"/>Products</a><a className="nav-item" href="#customers"><Icon name="people"/>Customers</a><span className="nav-caption nav-spaced">INSIGHTS</span><a className="nav-item" href="#overview"><Icon name="chart"/>Analytics</a></nav>
    <div className="sidebar-bottom"><div className="sidebar-help"><span className="help-icon">?</span><div><strong>Need a hand?</strong><small>Visit the help center</small></div><span className="help-arrow">↗</span></div><button className="profile-row" onClick={() => void logout()}><span className="profile-avatar">{initials(auth.user.full_name)}</span><span className="profile-copy"><strong>{auth.user.full_name}</strong><small>{auth.user.email}</small></span><span className="profile-menu">⋯</span></button></div>
  </aside><main className="main-content" id="overview"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="topbar-right"><span className="today-chip"><i/> All systems normal</span><button className="icon-button" title="Notifications" aria-label="Notifications"><Icon name="bell"/><i/></button><span className="top-avatar">{initials(auth.user.full_name)}</span></div></header>
    <div className="content-wrap"><div className="page-heading"><div><span className="eyebrow">YOUR BUSINESS AT A GLANCE</span><h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {auth.user.full_name.split(" ")[0]} <span className="wave">✦</span></h1><p>Here’s what’s happening with {business?.name || "your business"}.</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => void downloadCsv()}><Icon name="download" size={16}/> Export report</button></div></div>
    <section className="filter-bar"><div className="filter-title"><span className="filter-icon"><Icon name="calendar" size={16}/></span><span><strong>Date range</strong><small>{dateRange}</small></span></div><div className="date-controls"><label><span>From</span><input type="date" value={start} max={end || undefined} onChange={(event) => setStart(event.target.value)}/></label><span className="date-separator">—</span><label><span>To</span><input type="date" value={end} min={start || undefined} max={todayInZone(business?.timezone)} onChange={(event) => setEnd(event.target.value)}/></label><button className="date-apply" onClick={() => void loadDashboard()} disabled={loading || !start || !end}>{loading ? "Loading…" : "Apply"}</button></div><button className="filter-export" onClick={() => void downloadCsv()} title="Export CSV"><Icon name="download" size={17}/></button></section>
    {inviteError && <div className="inline-error" role="alert">{inviteError}<button onClick={() => void logout()}>Sign out to use another account</button></div>}
    {error && <div className="inline-error" role="alert">{error}<button onClick={() => void loadDashboard()}>Retry</button></div>}
    <section className="metric-grid" aria-label="Sales key metrics"><Metric title="Total revenue" value={summary ? money(summary.revenue_minor, summary.currency) : "—"} note={dateRange} icon="chart" tone="green"/><Metric title="Total orders" value={summary?.order_count.toLocaleString("en-IN") ?? "—"} note="Orders in selected period" icon="bag" tone="blue"/><Metric title="Average order value" value={summary ? money(summary.average_order_value_minor, summary.currency) : "—"} note="Revenue per order" icon="arrow" tone="orange"/><Metric title="Products sold" value={products.reduce((total, item) => total + item.units_sold, 0).toLocaleString("en-IN")} note="Units across all orders" icon="box" tone="purple"/></section>
    <section className="dashboard-grid"><article className="panel trend-panel"><div className="panel-header"><div><h2>Sales overview</h2><p>Revenue over time for the selected period</p></div><div className="panel-actions"><span className="legend"><i/> Revenue</span><select className="interval-select" value={interval} onChange={(event) => setInterval(event.target.value)} aria-label="Chart interval"><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select></div></div><SalesChart data={trend} currency={summary?.currency || business?.currency || "INR"}/></article>
    <article className="panel products-panel" id="products"><div className="panel-header"><div><h2>Top products</h2><p>Best performers by revenue</p></div><a className="text-link" href="#products">View all <span>→</span></a></div><div className="product-list">{products.slice(0, 5).map((product, index) => <div className="product-row" key={product.product_name}><span className={`product-thumb p-${index % 5}`}><Icon name="box" size={19}/></span><span className="product-data"><strong>{product.product_name}</strong><small>{product.units_sold} units sold</small><span className="product-track"><i style={{ width: `${Math.max(7, product.revenue_minor / maxProductRevenue * 100)}%` }}/></span></span><strong className="product-revenue">{money(product.revenue_minor, summary?.currency || business?.currency || "INR")}</strong></div>)}{!products.length && <Empty text="No product sales in this period"/>}</div></article></section>
    <section className="panel recent-panel" id="sales"><div className="panel-header"><div><h2>Recent sales</h2><p>Your latest orders in this date range</p></div><a className="text-link" href="#sales">All sales <span>→</span></a></div><div className="table-scroll"><table><thead><tr><th>ORDER</th><th>ITEMS</th><th>DATE &amp; TIME</th><th>STATUS</th><th className="amount-col">AMOUNT</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td><strong className="order-id">#{String(sale.id).padStart(5, "0")}</strong></td><td><span className="sale-items">{sale.items.slice(0, 2).map((item) => item.product_name).join(", ")}{sale.items.length > 2 ? ` +${sale.items.length - 2} more` : ""}</span></td><td><span className="sale-time"><Icon name="clock" size={14}/>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: business?.timezone }).format(new Date(sale.created_at))}</span></td><td><span className="status-pill"><i/>Completed</span></td><td className="amount-col"><strong>{money(sale.total_minor, sale.currency)}</strong></td></tr>)}</tbody></table>{!sales.length && <Empty text="No sales found in this period"/>}</div></section>
    <footer className="page-footer"><span>© 2026 SmartBiz</span><span>Showing {dateRange} · Timezone: {business?.timezone || "—"}</span><a href={`${API}/docs`} target="_blank" rel="noreferrer">API documentation ↗</a></footer></div>
  </main></div>;
}

function Metric({ title, value, note, icon, tone }: { title: string; value: string; note: string; icon: string; tone: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{title}</span><span className={`metric-icon ${tone}`}><Icon name={icon} size={18}/></span></div><strong className="metric-value">{value}</strong><div className="metric-note"><span className="note-dot"/>{note}</div></article>;
}

function Empty({ text }: { text: string }) { return <div className="empty-state"><span className="empty-icon"><Icon name="bag" size={20}/></span><span>{text}</span></div>; }

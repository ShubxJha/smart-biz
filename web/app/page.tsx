"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import DataEntryModal, { type EntryKind } from "./data-entry";
import { RecordEditor, SaleDetails, SaleEditor } from "./maintenance";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Business = { id: number; name: string; currency: string; timezone: string };
type Membership = { business: Business; role: string };
type User = { id: number; email: string; full_name: string };
type Auth = { access_token: string; refresh_token?: string; user: User; memberships: Membership[] };
type Summary = {
  order_count: number;
  revenue_minor: number;
  cost_minor?: number | null;
  gross_profit_minor?: number | null;
  profit_margin_pct?: number | null;
  profit_data_complete?: boolean;
  average_order_value_minor: number;
  currency: string;
  from_date: string;
  to_date: string;
};
type Bucket = { bucket_start: string; order_count: number; revenue_minor: number };
type Product = { product_name: string; units_sold: number; revenue_minor: number };
type Sale = { id: number; customer_id: number | null; total_minor: number; currency: string; created_at: string; external_reference: string | null; items: { product_id: number | null; product_name: string; quantity: number; unit_price_minor: number }[] };
type InventoryProduct = { id: number; name: string; sku: string; price_minor: number; cost_price_minor?: number | null; stock_quantity: number; active: boolean };
type Customer = { id: number; name: string; email: string | null; phone: string | null };
type CustomerStatsOut = {
  customer: Customer;
  order_count: number;
  total_spend_minor: number;
  average_order_minor: number;
  first_order_date: string | null;
  latest_order_date: string | null;
  recent_sales: Sale[];
};

type Toast = { id: string; type: "success" | "error" | "info"; message: string };

function todayInZone(zone?: string) {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: zone || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
  catch { return new Date().toISOString().slice(0, 10); }
}

function earlier(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() - amount);
  return date.toISOString().slice(0, 10);
}

function money(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

function dateLabel(day: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", options || { month: "short", day: "numeric" }).format(new Date(`${day}T12:00:00`));
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
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
    search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
    moon: <><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></>,
    check: <><path d="M20 6 9 17l-5-5"/></>,
    alert: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  };
  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

/* Enhanced SVG Chart with Interactive Hover Tooltip & Area Glow */
function SalesChart({ data, currency }: { data: Bucket[]; currency: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 740, height = 240, left = 55, right = 16, top = 16, bottom = 32;
  const max = Math.max(1, ...data.map((point) => point.revenue_minor));

  const x = (index: number) => left + (data.length <= 1 ? 0 : index * (width - left - right) / Math.max(1, data.length - 1));
  const y = (value: number) => top + (1 - value / max) * (height - top - bottom);

  const points = data.map((point, i) => `${x(i)},${y(point.revenue_minor)}`).join(" ");
  const area = data.length ? `${x(0)},${height - bottom} ${points} ${x(data.length - 1)},${height - bottom}` : "";

  const formatAxis = (value: number) => {
    if (value >= 10000000) return `${currency} ${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `${currency} ${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `${currency} ${(value / 1000).toFixed(0)}k`;
    return money(value, currency);
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!data.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * width;
    const boundedX = Math.max(left, Math.min(width - right, mouseX));
    const ratio = (boundedX - left) / Math.max(1, width - left - right);
    const closestIndex = Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1))));
    setHoverIndex(closestIndex);
  };

  const activePoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;
  const activeX = hoverIndex !== null ? x(hoverIndex) : 0;
  const activeY = activePoint ? y(activePoint.revenue_minor) : 0;

  return (
    <div className="chart-wrap" onMouseLeave={() => setHoverIndex(null)}>
      <svg
        className="sales-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Sales revenue trend"
        onMouseMove={handleMouseMove}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const value = max * fraction;
          const yy = y(value);
          return (
            <g key={fraction}>
              <line x1={left} x2={width - right} y1={yy} y2={yy} className="chart-grid" />
              <text x={left - 10} y={yy + 4} textAnchor="end" className="chart-axis">
                {formatAxis(value)}
              </text>
            </g>
          );
        })}

        {data.length > 0 && (
          <>
            <polygon points={area} fill="url(#chartGradient)" className="chart-area" />
            <polyline points={points} className="chart-line" />
            {data.map((point, index) => {
              const cx = x(index);
              const cy = y(point.revenue_minor);
              const isActive = hoverIndex === index;
              return (
                <circle
                  key={point.bucket_start}
                  cx={cx}
                  cy={cy}
                  r={isActive ? 5.5 : 3.5}
                  className={`chart-point${isActive ? " active" : ""}`}
                />
              );
            })}
          </>
        )}

        {activePoint && hoverIndex !== null && (
          <line
            x1={activeX}
            x2={activeX}
            y1={top}
            y2={height - bottom}
            className="chart-crosshair"
          />
        )}

        {[0, Math.floor((data.length - 1) / 3), Math.floor(2 * (data.length - 1) / 3), data.length - 1]
          .filter((val, i, list) => data[val] && list.indexOf(val) === i)
          .map((index) => (
            <text key={index} x={x(index)} y={height - 8} textAnchor="middle" className="chart-axis">
              {dateLabel(data[index].bucket_start)}
            </text>
          ))}
      </svg>

      {activePoint && hoverIndex !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(activeX / width) * 100}%`,
            top: `${(activeY / height) * 100}%`,
          }}
        >
          <div className="chart-tooltip-date">
            {dateLabel(activePoint.bucket_start, { month: "short", day: "numeric", year: "numeric" })}
          </div>
          <div className="chart-tooltip-val">
            {money(activePoint.revenue_minor, currency)}
          </div>
          <div className="chart-tooltip-orders">
            {activePoint.order_count} {activePoint.order_count === 1 ? "order" : "orders"}
          </div>
        </div>
      )}
    </div>
  );
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
  const [pendingAccountEmail, setPendingAccountEmail] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<"sidebar" | "topbar" | null>(null);
  const [accountPanel, setAccountPanel] = useState<"profile" | "settings" | null>(null);
  const [entryKind, setEntryKind] = useState<EntryKind | null>(null);
  const [entryImportMode, setEntryImportMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Modern UI/UX states
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [productFilterStatus, setProductFilterStatus] = useState<"all" | "active" | "inactive" | "low_stock">("all");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchSale, setSearchSale] = useState("");

  // Command Palette & Customer Drilldown
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStatsOut | null>(null);
  const [customerStatsLoading, setCustomerStatsLoading] = useState(false);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
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
  const refreshInFlight = useRef<Promise<Auth | null> | null>(null);
  const rotatedAuthByToken = useRef(new Map<string, Auth>());

  // Theme synchronization
  useEffect(() => {
    try {
      const saved = localStorage.getItem("smartbiz-theme") as "light" | "dark" | null;
      const initial = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    } catch {
      // Fallback to light
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("smartbiz-theme", next);
      document.documentElement.setAttribute("data-theme", next);
    } catch {}
  };

  // Command Palette global keyboard shortcut (Cmd + K / Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Toast helper
  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const enableDemoMode = useCallback(() => {
    const localToday = todayInZone("Asia/Kolkata");
    const sampleAuth: Auth = {
      access_token: "demo-token",
      user: { id: 1, email: "alex@smartbiz.io", full_name: "Alex Morgan" },
      memberships: [
        {
          business: { id: 101, name: "The Corner Craft Store", currency: "INR", timezone: "Asia/Kolkata" },
          role: "owner",
        },
      ],
    };
    sessionStorage.setItem("smartbiz-auth", JSON.stringify(sampleAuth));
    setAuth(sampleAuth);
    setSelectedId(101);
    setEnd(localToday);
    setStart(earlier(localToday, 29));
    setSummary({
      order_count: 184,
      revenue_minor: 24856000,
      cost_minor: 14416480,
      gross_profit_minor: 10439520,
      profit_margin_pct: 42.0,
      average_order_value_minor: 135086,
      currency: "INR",
      from_date: earlier(localToday, 29),
      to_date: localToday,
    });
    const buckets: Bucket[] = Array.from({ length: 30 }, (_, i) => {
      const day = earlier(localToday, 29 - i);
      const wave = Math.sin(i / 3) * 0.35 + 0.65;
      const rev = Math.round((5000 + wave * 9000 + (i % 5) * 1200) * 100);
      return {
        bucket_start: day,
        order_count: Math.round(3 + wave * 5),
        revenue_minor: rev,
      };
    });
    setTrend(buckets);
    setProducts([
      { product_name: "Handcrafted Ceramic Mug", units_sold: 86, revenue_minor: 6880000 },
      { product_name: "Organic Linen Apron", units_sold: 52, revenue_minor: 6240000 },
      { product_name: "Artisan Leather Journal", units_sold: 44, revenue_minor: 5280000 },
      { product_name: "Soy Wax Scented Candle", units_sold: 72, revenue_minor: 3600000 },
      { product_name: "Cold Pressed Botanical Soap", units_sold: 95, revenue_minor: 2850000 },
    ]);
    setInventory([
      { id: 1, name: "Handcrafted Ceramic Mug", sku: "MUG-001", price_minor: 80000, cost_price_minor: 42000, stock_quantity: 42, active: true },
      { id: 2, name: "Organic Linen Apron", sku: "APR-102", price_minor: 120000, cost_price_minor: 68000, stock_quantity: 18, active: true },
      { id: 3, name: "Artisan Leather Journal", sku: "JOU-201", price_minor: 120000, cost_price_minor: 72000, stock_quantity: 6, active: true },
      { id: 4, name: "Soy Wax Scented Candle", sku: "CND-305", price_minor: 50000, cost_price_minor: 24000, stock_quantity: 85, active: true },
      { id: 5, name: "Cold Pressed Botanical Soap", sku: "SOP-401", price_minor: 30000, cost_price_minor: 13000, stock_quantity: 120, active: true },
      { id: 6, name: "Bamboo Matcha Whisk Set", sku: "TEA-502", price_minor: 95000, cost_price_minor: 52000, stock_quantity: 0, active: false },
    ]);
    setCustomers([
      { id: 1, name: "Priya Sharma", email: "priya.s@example.com", phone: "+91 98765 43210" },
      { id: 2, name: "Rahul Verma", email: "rahul.v@example.com", phone: "+91 98123 45678" },
      { id: 3, name: "Ananya Iyer", email: "ananya.i@example.com", phone: "+91 99887 76655" },
      { id: 4, name: "Vikram Malhotra", email: "vikram.m@example.com", phone: "+91 97654 32109" },
      { id: 5, name: "Neha Patel", email: "neha.p@example.com", phone: "+91 96543 21098" },
    ]);
    setSales([
      {
        id: 1042,
        customer_id: 1,
        total_minor: 200000,
        currency: "INR",
        created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        external_reference: null,
        items: [
          { product_id: 1, product_name: "Handcrafted Ceramic Mug", quantity: 1, unit_price_minor: 80000 },
          { product_id: 2, product_name: "Organic Linen Apron", quantity: 1, unit_price_minor: 120000 },
        ],
      },
      {
        id: 1041,
        customer_id: 2,
        total_minor: 240000,
        currency: "INR",
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        external_reference: null,
        items: [
          { product_id: 3, product_name: "Artisan Leather Journal", quantity: 2, unit_price_minor: 120000 },
        ],
      },
      {
        id: 1040,
        customer_id: 3,
        total_minor: 100000,
        currency: "INR",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        external_reference: "csv_import_1040",
        items: [
          { product_id: 4, product_name: "Soy Wax Scented Candle", quantity: 2, unit_price_minor: 50000 },
        ],
      },
      {
        id: 1039,
        customer_id: 4,
        total_minor: 150000,
        currency: "INR",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
        external_reference: null,
        items: [
          { product_id: 5, product_name: "Cold Pressed Botanical Soap", quantity: 5, unit_price_minor: 30000 },
        ],
      },
    ]);
    setDashboardStatus("connected");
    addToast("Interactive demo mode activated! Explore all views and features.", "info");
  }, [addToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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
      if (auth && pendingAccountEmail) {
        const next = { ...auth, user: { ...auth.user, email: pendingAccountEmail } };
        sessionStorage.setItem("smartbiz-auth", JSON.stringify(next));
        setAuth(next);
        setPendingAccountEmail("");
        setSettingsMessage("Email address verified and updated.");
        addToast("Email address verified and updated.", "success");
      } else {
        setNotice("Email verified. You can now sign in.");
        addToast("Email verified. You can now sign in.", "success");
      }
      setMode("login");
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Email verification failed.";
      setError(msg);
      addToast(msg, "error");
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
    const isDemo = url.searchParams.get("demo") === "true" || url.searchParams.get("demo") === "1";
    if (isDemo) {
      enableDemoMode();
      return;
    }
    const saved = sessionStorage.getItem("smartbiz-auth");
    if (saved) {
      try {
        const next = JSON.parse(saved) as Auth;
        if (next.access_token === "demo-token") {
          enableDemoMode();
          return;
        }
        setAuth(next);
        setSelectedId(next.memberships[0]?.business.id ?? null);
      } catch {
        sessionStorage.removeItem("smartbiz-auth");
      }
    }
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
        const next = {
          ...currentAuth,
          memberships: [...currentAuth.memberships.filter((item) => item.business.id !== membership.business.id), membership],
        };
        sessionStorage.setItem("smartbiz-auth", JSON.stringify(next));
        setAuth(next);
        setSelectedId(membership.business.id);
        setInviteToken("");
        addToast(`Joined workspace: ${membership.business.name}`, "success");
        const day = todayInZone(membership.business.timezone);
        setEnd(day);
        setStart(earlier(day, 29));
      } catch (cause) {
        if (!cancelled) {
          const msg = cause instanceof Error ? cause.message : "Unable to accept this invitation.";
          setInviteError(msg);
          addToast(msg, "error");
        }
      }
    }
    void acceptInvitation();
    return () => { cancelled = true; };
  }, [auth, inviteToken, addToast]);

  const business = auth?.memberships.find((item) => item.business.id === selectedId)?.business;

  useEffect(() => {
    const routeSection: Record<string, string> = { "/": "overview", "/sales": "sales", "/products": "products", "/customers": "customers" };
    setActiveSection(routeSection[pathname] || (pathname === "/" && window.location.hash === "#analytics" ? "analytics" : "overview"));
  }, [pathname]);

  useEffect(() => {
    if (business && !start) {
      const localToday = todayInZone(business.timezone);
      setEnd(localToday);
      setStart(earlier(localToday, 29));
    }
  }, [business, start]);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!auth || !selectedId) throw new Error("Select a business to continue.");
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${auth.access_token}`);
    headers.set("X-Business-Id", String(selectedId));
    let response = await fetch(`${API}${path}`, { ...init, headers });

    // Automatic Refresh Token Rotation & Session Extension
    if (response.status === 401 && auth.refresh_token) {
      try {
        let refreshedAuth = rotatedAuthByToken.current.get(auth.refresh_token) || null;
        if (!refreshedAuth) {
          if (!refreshInFlight.current) {
            const originalRefreshToken = auth.refresh_token;
            refreshInFlight.current = (async () => {
              const refreshRes = await fetch(`${API}/api/v1/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: originalRefreshToken }),
              });
              if (!refreshRes.ok) return null;
              const fresh = await refreshRes.json();
              const rotated: Auth = { ...auth, ...fresh };
              rotatedAuthByToken.current.set(originalRefreshToken, rotated);
              return rotated;
            })().finally(() => { refreshInFlight.current = null; });
          }
          refreshedAuth = await refreshInFlight.current;
        }
        if (refreshedAuth) {
          sessionStorage.setItem("smartbiz-auth", JSON.stringify(refreshedAuth));
          setAuth(refreshedAuth);
          headers.set("Authorization", `Bearer ${refreshedAuth.access_token}`);
          const retryInit = path === "/api/v1/auth/logout"
            ? { ...init, body: JSON.stringify({ refresh_token: refreshedAuth.refresh_token }) }
            : init;
          response = await fetch(`${API}${path}`, { ...retryInit, headers });
        }
      } catch {
        // Fall back to logout below
      }
    }

    if (response.status === 401) {
      sessionStorage.removeItem("smartbiz-auth");
      setAuth(null);
      throw new Error("Your session expired. Please sign in again.");
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = body?.detail;
      throw new Error((typeof detail === "string" ? detail : detail?.message) || `Request failed (${response.status})`);
    }
    return response;
  }, [auth, selectedId]);

  const loadDashboard = useCallback(async () => {
    if (!auth || !selectedId || !start || !end) return;
    if (auth.access_token === "demo-token") {
      setDashboardStatus("connected");
      return;
    }
    setLoading(true);
    setError("");
    setDashboardStatus("checking");
    const params = new URLSearchParams({ from_date: start, to_date: end });
    if (filterCustomerId) params.set("customer_id", filterCustomerId);
    if (filterProductId) params.set("product_id", filterProductId);
    try {
      const [summaryResponse, trendResponse, productsResponse, salesResponse] = await Promise.all([
        request(`/api/v1/dashboard/summary?${params}`),
        request(`/api/v1/analytics/sales-trend?${params}&interval=${interval}`),
        request(`/api/v1/analytics/top-products?${params}&limit=100`),
        request(`/api/v1/sales?${params}&limit=500`),
      ]);
      const [s, t, p, recent] = await Promise.all([
        summaryResponse.json(),
        trendResponse.json(),
        productsResponse.json(),
        salesResponse.json(),
      ]);
      setSummary(s);
      setTrend(t.buckets || []);
      setProducts(p.products || []);
      setSales(recent || []);
      setDashboardStatus("connected");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your sales data.");
      setDashboardStatus("issue");
    } finally {
      setLoading(false);
    }
  }, [auth, selectedId, start, end, interval, filterCustomerId, filterProductId, request]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const loadWorkspaceRecords = useCallback(async () => {
    if (!auth || !selectedId) return;
    if (auth.access_token === "demo-token") {
      return;
    }
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
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setVerificationUrl("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = mode === "register"
      ? { email: values.email, password: values.password, full_name: values.full_name, business_name: inviteToken ? undefined : values.business_name }
      : { email: values.email, password: values.password };
    try {
      const response = await fetch(`${API}/api/v1/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (mode === "register" && response.ok) {
        setNotice(result.message || "Check your email to verify your account before signing in.");
        setVerificationUrl(result.verification_url || "");
        setMode("login");
        addToast("Registration successful! Please verify your email.", "info");
        return;
      }
      if (!response.ok) {
        const detail = typeof result.detail === "string" ? result.detail : result.detail?.message || "Unable to sign in.";
        if (result.detail?.verification_url) setVerificationUrl(result.detail.verification_url);
        throw new Error(detail);
      }
      const next = result as Auth;
      sessionStorage.setItem("smartbiz-auth", JSON.stringify(next));
      setAuth(next);
      setSelectedId(next.memberships[0]?.business.id ?? null);
      const day = todayInZone(next.memberships[0]?.business.timezone);
      setEnd(day);
      setStart(earlier(day, 29));
      addToast(`Welcome back, ${next.user.full_name}!`, "success");
      if (!next.memberships.length && !inviteToken) {
        setError("Account created. Ask a business owner for an invitation, then sign in again.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try { await request("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: auth?.refresh_token }) }); } catch {}
    rotatedAuthByToken.current.clear();
    sessionStorage.removeItem("smartbiz-auth");
    setAuth(null);
    setSummary(null);
    addToast("Signed out successfully.", "info");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError("");
    setSettingsMessage("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await request("/api/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ full_name: values.full_name }),
      });
      const user = await response.json() as User;
      const next = { ...auth!, user };
      sessionStorage.setItem("smartbiz-auth", JSON.stringify(next));
      setAuth(next);
      setSettingsMessage("Profile details saved.");
      addToast("Profile details updated successfully.", "success");
    } catch (cause) {
      setSettingsError(cause instanceof Error ? cause.message : "Could not save profile details.");
    }
  }

  async function changeAccountEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError("");
    setSettingsMessage("");
    setVerificationUrl("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await request("/api/v1/auth/email-change", {
        method: "POST",
        body: JSON.stringify({ email: values.email, current_password: values.current_password }),
      });
      const result = await response.json();
      setPendingAccountEmail(String(values.email).trim().toLowerCase());
      setSettingsMessage(result.message || "Check the new email address to confirm the change.");
      setVerificationUrl(result.verification_url || "");
      addToast("Verification link sent to new email.", "info");
      event.currentTarget.reset();
    } catch (cause) {
      setSettingsError(cause instanceof Error ? cause.message : "Could not start the email change.");
    }
  }

  async function changeAccountPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError("");
    setSettingsMessage("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await request("/api/v1/auth/password", {
        method: "POST",
        body: JSON.stringify({ current_password: values.current_password, new_password: values.new_password }),
      });
      const result = await response.json();
      setSettingsMessage(result.message || "Password changed successfully.");
      addToast("Password changed successfully.", "success");
      event.currentTarget.reset();
    } catch (cause) {
      setSettingsError(cause instanceof Error ? cause.message : "Could not change the password.");
    }
  }

  function openVerificationLink(event: MouseEvent<HTMLAnchorElement>) {
    const destination = new URL(event.currentTarget.href);
    const token = destination.searchParams.get("verify") || new URLSearchParams(destination.hash.slice(1)).get("verify");
    if (destination.origin === window.location.origin && token) {
      event.preventDefault();
      void verifyEmailToken(token);
    }
  }

  async function downloadCsv() {
    setError("");
    try {
      const params = new URLSearchParams({ from_date: start, to_date: end });
      if (filterCustomerId) params.set("customer_id", filterCustomerId);
      if (filterProductId) params.set("product_id", filterProductId);
      const response = await request(`/api/v1/reports/sales.csv?${params}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `smartbiz-sales-${start}-${end}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      addToast("Sales report exported successfully.", "success");
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "CSV download failed.";
      setError(msg);
      addToast(msg, "error");
    }
  }

  const maxProductRevenue = useMemo(() => Math.max(1, ...products.map((p) => p.revenue_minor)), [products]);
  const dateRange = `${dateLabel(start || todayInZone(), { month: "short", day: "numeric" })} – ${dateLabel(end || todayInZone(), { month: "short", day: "numeric", year: "numeric" })}`;
  const selectedRole = auth?.memberships.find((item) => item.business.id === selectedId)?.role;
  const canManageProducts = selectedRole === "owner" || selectedRole === "admin";
  const canRecordSales = canManageProducts || selectedRole === "sales";

  function openEntry(kind: EntryKind, importCsv = false) {
    setEntryImportMode(importCsv);
    setEntryKind(kind);
  }

  function entrySaved(kind: EntryKind, importedCount?: number) {
    const messages: Record<EntryKind, string> = {
      product: importedCount === undefined ? "Product added to your inventory." : `${importedCount} products imported to inventory.`,
      customer: importedCount === undefined ? "Customer added to records." : `${importedCount} customers imported to records.`,
      sale: importedCount === undefined ? "Sale recorded and inventory updated." : `${importedCount} historical sales imported.`,
    };
    setEntryKind(null);
    addToast(messages[kind], "success");
    if (kind === "sale") void loadDashboard();
    void loadWorkspaceRecords();
  }

  async function setProductActive(product: InventoryProduct, active: boolean) {
    setRecordsError("");
    try {
      await request(`/api/v1/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ active }) });
      addToast(`${product.name} ${active ? "activated" : "deactivated"}.`, "success");
      void loadWorkspaceRecords();
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Could not update product status.";
      setRecordsError(msg);
      addToast(msg, "error");
    }
  }

  async function removeProduct(product: InventoryProduct) {
    if (!window.confirm(`Remove "${product.name}" from this workspace? Products used in sales will be deactivated to preserve their history.`)) return;
    setRecordsError("");
    try {
      const response = await request(`/api/v1/products/${product.id}`, { method: "DELETE" });
      const result = await response.json() as { deleted: boolean; deactivated: boolean };
      addToast(result.deactivated ? `${product.name} was deactivated to preserve past sales.` : `${product.name} was removed.`, "success");
      void loadWorkspaceRecords();
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Could not remove product.";
      setRecordsError(msg);
      addToast(msg, "error");
    }
  }

  async function removeCustomer(customer: Customer) {
    if (!window.confirm(`Delete customer "${customer.name}"? Past sales will remain, without this customer link.`)) return;
    setRecordsError("");
    try {
      await request(`/api/v1/customers/${customer.id}`, { method: "DELETE" });
      addToast(`${customer.name} was deleted.`, "success");
      void loadWorkspaceRecords();
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Could not delete customer.";
      setRecordsError(msg);
      addToast(msg, "error");
    }
  }

  const openCustomerDrawer = useCallback(async (customer: Customer) => {
    setViewingCustomer(customer);
    setCustomerStats(null);
    setCustomerStatsLoading(true);
    if (auth?.access_token === "demo-token") {
      const customerSales = sales.filter((s) => s.customer_id === customer.id);
      const totalSpend = customerSales.reduce((sum, s) => sum + s.total_minor, 0);
      const count = customerSales.length;
      const avg = count > 0 ? Math.round(totalSpend / count) : 0;
      setCustomerStats({
        customer,
        order_count: count,
        total_spend_minor: totalSpend,
        average_order_minor: avg,
        first_order_date: customerSales[customerSales.length - 1]?.created_at || null,
        latest_order_date: customerSales[0]?.created_at || null,
        recent_sales: customerSales,
      });
      setCustomerStatsLoading(false);
      return;
    }
    try {
      const res = await request(`/api/v1/customers/${customer.id}/stats`);
      const data = await res.json() as CustomerStatsOut;
      setCustomerStats(data);
    } catch (cause) {
      addToast(cause instanceof Error ? cause.message : "Could not load customer stats.", "error");
    } finally {
      setCustomerStatsLoading(false);
    }
  }, [auth, sales, request, addToast]);

  async function removeSale(sale: Sale) {
    if (!window.confirm(`Delete order #${String(sale.id).padStart(5, "0")} from sales and analytics? Items will be returned to stock.`)) return;
    setError("");
    try {
      await request(`/api/v1/sales/${sale.id}`, { method: "DELETE" });
      setSelectedSale(null);
      addToast("Sale deleted. Inventory has been updated.", "success");
      void loadDashboard();
      void loadWorkspaceRecords();
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Could not delete sale.";
      setError(msg);
      addToast(msg, "error");
    }
  }

  // Filtered & Sorted Lists
  const filteredProducts = useMemo(() => {
    return inventory.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchProduct.toLowerCase());
      if (!matchSearch) return false;
      if (productFilterStatus === "active") return item.active;
      if (productFilterStatus === "inactive") return !item.active;
      if (productFilterStatus === "low_stock") return item.stock_quantity <= 10;
      return true;
    });
  }, [inventory, searchProduct, productFilterStatus]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((item) => {
      const q = searchCustomer.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.phone && item.phone.toLowerCase().includes(q))
      );
    });
  }, [customers, searchCustomer]);

  const filteredSales = useMemo(() => {
    const q = searchSale.toLowerCase().trim();
    const source = activeSection === "overview" ? sales.slice(0, 6) : sales;
    if (!q) return source;
    return source.filter((sale) => {
      const orderIdStr = `#${String(sale.id).padStart(5, "0")}`.toLowerCase();
      const matchId = orderIdStr.includes(q) || String(sale.id).includes(q);
      const matchItems = sale.items.some((it) => it.product_name.toLowerCase().includes(q));
      return matchId || matchItems;
    });
  }, [sales, activeSection, searchSale]);

  const visibleTopProducts = showAllTopProducts ? products : products.slice(0, 5);

  // Authentication Screen
  if (!auth) {
    return (
      <main className="auth-shell">
        <section className="auth-visual">
          <div className="brand brand-light">
            <span className="brand-mark"><Icon name="grid" size={19} /></span>
            <span>smart<span className="brand-accent">biz</span></span>
          </div>
          <div className="auth-copy">
            <span className="eyebrow">INTELLIGENT COMMERCE PLATFORM</span>
            <h1>Know your numbers.<br />Grow with clarity.</h1>
            <p>One unified, real-time command center for sales, stock inventory, customer relationships, and profitability.</p>
            <div className="preview-card">
              <div className="preview-head">
                <span>Revenue Performance</span>
                <span className="preview-period">Last 30 days</span>
              </div>
              <div className="preview-number">
                ₹ 2,48,560 <span>↗ +14.2%</span>
              </div>
              <div className="preview-bars">
                {[32, 45, 38, 54, 48, 64, 58, 76, 68, 88, 72, 94, 82, 100, 78, 92, 86, 98, 80, 92].map((height, i) => (
                  <i key={i} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="auth-visual-footer">Enterprise precision engineered for modern small businesses.</div>
        </section>

        <section className="auth-panel">
          <form className="auth-form" onSubmit={submitAuth}>
            <div className="mobile-brand brand">
              <span className="brand-mark"><Icon name="grid" size={19} /></span>
              <span>smart<span className="brand-accent">biz</span></span>
            </div>

            {inviteToken && (
              <div className="invite-banner">
                <strong>You’re invited to collaborate</strong>
                <span>Sign in or create an account with your invited email to accept.</span>
              </div>
            )}

            <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span>
            <h2>{mode === "login" ? "Sign in to SmartBiz" : inviteToken ? "Accept your invitation" : "Create your account"}</h2>
            <p className="form-intro">
              {mode === "login"
                ? "Enter your credentials to access your business command center."
                : inviteToken
                ? "Sign up with the email address where you received the invite."
                : "Launch your workspace in seconds."}
            </p>

            {mode === "register" && (
              <label>
                Full name
                <input name="full_name" autoComplete="name" placeholder="Alex Morgan" required minLength={1} />
              </label>
            )}

            {mode === "register" && !inviteToken && (
              <label>
                Business name
                <input name="business_name" placeholder="Apex Retail Solutions" required minLength={1} />
              </label>
            )}

            <label>
              Email address
              <input name="email" type="email" autoComplete="email" placeholder="alex@company.com" required />
            </label>

            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                required
                minLength={mode === "login" ? 1 : 8}
              />
            </label>

            {notice && (
              <div className="invite-banner" role="status">
                <strong>{notice}</strong>
                {verificationUrl && (
                  <a href={verificationUrl} onClick={openVerificationLink}>
                    {verificationBusy ? "Verifying…" : "Click here to verify email"}
                  </a>
                )}
              </div>
            )}

            {error && (
              <div className="error-message" role="alert">
                {error}
                {verificationUrl && (
                  <> <a href={verificationUrl} onClick={openVerificationLink}>{verificationBusy ? "Verifying…" : "Click here to verify email"}</a></>
                )}
              </div>
            )}

            <button className="primary-button auth-submit" disabled={busy || verificationBusy}>
              {busy ? "Signing in…" : verificationBusy ? "Verifying…" : mode === "login" ? "Sign in" : "Create workspace"}
            </button>

            <p className="auth-switch">
              {mode === "login" ? "New to SmartBiz?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                  setNotice("");
                }}
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-default)" }}>
              <button
                type="button"
                className="secondary-button"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={enableDemoMode}
              >
                ✦ Explore Demo Dashboard
              </button>
            </div>

            <p className="secure-note">
              <span>●</span> Encrypted &amp; private session storage
            </p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      {/* Toast Notification Layer */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === "success" ? <Icon name="check" size={18} /> : <Icon name="alert" size={18} />}
            </span>
            <span className="toast-message">{t.message}</span>
            <button className="toast-close" onClick={() => removeToast(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Desktop Sidebar Navigation */}
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="SmartBiz home">
          <span className="brand-mark"><Icon name="grid" size={19} /></span>
          <span>smart<span className="brand-accent">biz</span></span>
        </a>

        <div className="workspace-switch">
          <span className="workspace-avatar">{initials(business?.name || "SB")}</span>
          <span className="workspace-copy">
            <strong>{business?.name || "Choose workspace"}</strong>
            <small>{business ? `${business.currency} · ${business.timezone}` : "No workspace"}</small>
          </span>
          <select
            aria-label="Select business"
            value={selectedId ?? ""}
            onChange={(event) => setSelectedId(Number(event.target.value))}
          >
            {auth.memberships.map((item) => (
              <option key={item.business.id} value={item.business.id}>
                {item.business.name}
              </option>
            ))}
          </select>
          <span className="chevron">⌄</span>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          <span className="nav-caption">Workspace</span>
          <a
            title="Overview"
            className={`nav-item${activeSection === "overview" ? " active" : ""}`}
            href="/"
            onClick={() => setActiveSection("overview")}
          >
            <Icon name="grid" />Overview
          </a>
          <a
            title="Sales"
            className={`nav-item${activeSection === "sales" ? " active" : ""}`}
            href="/sales"
            onClick={() => setActiveSection("sales")}
          >
            <Icon name="bag" />Sales
          </a>
          <a
            title="Products"
            className={`nav-item${activeSection === "products" ? " active" : ""}`}
            href="/products"
            onClick={() => setActiveSection("products")}
          >
            <Icon name="box" />Products
          </a>
          <a
            title="Customers"
            className={`nav-item${activeSection === "customers" ? " active" : ""}`}
            href="/customers"
            onClick={() => setActiveSection("customers")}
          >
            <Icon name="people" />Customers
          </a>

          <span className="nav-caption nav-spaced">Analytics</span>
          <a
            title="Performance Trends"
            className={`nav-item${activeSection === "analytics" ? " active" : ""}`}
            href="/#analytics"
            onClick={() => setActiveSection("analytics")}
          >
            <Icon name="chart" />Performance
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-icon">?</span>
            <div>
              <strong>Quick Reference</strong>
              <small>Documentation &amp; API</small>
            </div>
            <a href={`${API}/docs`} target="_blank" rel="noreferrer" className="help-arrow" title="Open API Docs">
              ↗
            </a>
          </div>

          {accountMenuAnchor === "sidebar" && (
            <div className="profile-popover" role="menu" aria-label="Account menu" data-account-menu-panel>
              <button type="button" role="menuitem" onClick={() => { setAccountPanel("profile"); setAccountMenuAnchor(null); }}>
                My Profile
              </button>
              <button type="button" role="menuitem" onClick={() => { setAccountPanel("settings"); setAccountMenuAnchor(null); }}>
                Workspace Settings
              </button>
              <button type="button" role="menuitem" onClick={toggleTheme}>
                <Icon name={theme === "light" ? "moon" : "sun"} size={16} />
                Switch to {theme === "light" ? "Dark" : "Light"} Mode
              </button>
              <button
                type="button"
                role="menuitem"
                className="profile-signout"
                onClick={() => { setAccountMenuAnchor(null); void logout(); }}
              >
                Sign out
              </button>
            </div>
          )}

          <button
            className="profile-row"
            type="button"
            data-account-trigger
            aria-haspopup="menu"
            aria-expanded={accountMenuAnchor === "sidebar"}
            onClick={() => setAccountMenuAnchor((anchor) => (anchor === "sidebar" ? null : "sidebar"))}
          >
            <span className="profile-avatar">{initials(auth.user.full_name)}</span>
            <span className="profile-copy">
              <strong>{auth.user.full_name}</strong>
              <small>{auth.user.email}</small>
            </span>
            <span className="profile-menu">⋯</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" id="overview">
        {/* Topbar */}
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activeSection[0].toUpperCase() + activeSection.slice(1)}</strong>
          </div>

          <button
            type="button"
            className="command-palette-trigger"
            onClick={() => setCommandOpen(true)}
            title="Open Command Palette (Ctrl+K or ⌘K)"
          >
            <Icon name="search" size={14} />
            <span>Quick search / actions...</span>
            <kbd>⌘K</kbd>
          </button>

          <div className="topbar-right">
            <span className={`today-chip status-${dashboardStatus}`}>
              <i />
              {dashboardStatus === "checking"
                ? "Connecting..."
                : dashboardStatus === "connected"
                ? "Live Sync"
                : "Offline"}
            </span>

            {/* Dark / Light Theme Toggle Button */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              aria-label="Toggle theme"
            >
              <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
            </button>

            <button className="icon-button" title="Notifications" aria-label="Notifications">
              <Icon name="bell" size={18} />
              <i />
            </button>

            {accountMenuAnchor === "topbar" && (
              <div className="profile-popover topbar-account-popover" role="menu" aria-label="Account menu" data-account-menu-panel>
                <button type="button" role="menuitem" onClick={() => { setAccountPanel("profile"); setAccountMenuAnchor(null); }}>
                  My profile
                </button>
                <button type="button" role="menuitem" onClick={() => { setAccountPanel("settings"); setAccountMenuAnchor(null); }}>
                  Settings
                </button>
                <button type="button" role="menuitem" onClick={toggleTheme}>
                  <Icon name={theme === "light" ? "moon" : "sun"} size={16} />
                  {theme === "light" ? "Dark Mode" : "Light Mode"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="profile-signout"
                  onClick={() => { setAccountMenuAnchor(null); void logout(); }}
                >
                  Sign out
                </button>
              </div>
            )}

            <button
              className="top-avatar top-avatar-button"
              type="button"
              data-account-trigger
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={accountMenuAnchor === "topbar"}
              onClick={() => setAccountMenuAnchor((anchor) => (anchor === "topbar" ? null : "topbar"))}
            >
              {initials(auth.user.full_name)}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
        <nav className="mobile-nav" aria-label="Main mobile navigation">
          <a className={`nav-item${activeSection === "overview" ? " active" : ""}`} href="/" onClick={() => setActiveSection("overview")}>
            <Icon name="grid" size={16} />Overview
          </a>
          <a className={`nav-item${activeSection === "sales" ? " active" : ""}`} href="/sales" onClick={() => setActiveSection("sales")}>
            <Icon name="bag" size={16} />Sales
          </a>
          <a className={`nav-item${activeSection === "products" ? " active" : ""}`} href="/products" onClick={() => setActiveSection("products")}>
            <Icon name="box" size={16} />Products
          </a>
          <a className={`nav-item${activeSection === "customers" ? " active" : ""}`} href="/customers" onClick={() => setActiveSection("customers")}>
            <Icon name="people" size={16} />Customers
          </a>
          <a className={`nav-item${activeSection === "analytics" ? " active" : ""}`} href="/#analytics" onClick={() => setActiveSection("analytics")}>
            <Icon name="chart" size={16} />Analytics
          </a>
        </nav>

        {/* Page Content Wrapper */}
        <div className="content-wrap">
          {/* Header & Quick Action Buttons */}
          <div className="page-heading">
            <div>
              <span className="eyebrow">{activeSection === "overview" ? "EXECUTIVE DASHBOARD" : "MANAGEMENT"}</span>
              <h1>
                {activeSection === "overview" ? (
                  <>
                    Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},{" "}
                    {auth.user.full_name.split(" ")[0]} <span className="wave">✦</span>
                  </>
                ) : activeSection === "sales" ? (
                  "Sales & Orders"
                ) : activeSection === "products" ? (
                  "Product Catalog"
                ) : activeSection === "customers" ? (
                  "Customer Directory"
                ) : (
                  "Analytics & Insights"
                )}
              </h1>
              <p>
                {activeSection === "overview"
                  ? `Here is the current operational summary for ${business?.name || "your workspace"}.`
                  : activeSection === "sales"
                  ? "Track transactions, inspect order line items, and import historical sales."
                  : activeSection === "products"
                  ? "Keep product specifications, active status, and real-time stock levels aligned."
                  : activeSection === "customers"
                  ? "Maintain customer profiles, contact info, and lifetime purchase histories."
                  : `Longitudinal revenue trends and product sales performance.`}
              </p>
            </div>

            <div className="heading-actions entry-actions">
              {activeSection === "overview" && canManageProducts && (
                <button className="secondary-button" type="button" onClick={() => openEntry("product")}>
                  <Icon name="box" size={16} /> Add product
                </button>
              )}
              {activeSection === "products" && canManageProducts && (
                <>
                  <button className="primary-button" type="button" onClick={() => openEntry("product")}>
                    <Icon name="box" size={16} /> Add product
                  </button>
                  <button className="secondary-button" type="button" onClick={() => openEntry("product", true)}>
                    <Icon name="download" size={16} /> Import CSV
                  </button>
                </>
              )}
              {activeSection === "overview" && canRecordSales && (
                <button className="secondary-button" type="button" onClick={() => openEntry("customer")}>
                  <Icon name="people" size={16} /> Add customer
                </button>
              )}
              {activeSection === "customers" && canRecordSales && (
                <>
                  <button className="primary-button" type="button" onClick={() => openEntry("customer")}>
                    <Icon name="people" size={16} /> Add customer
                  </button>
                  <button className="secondary-button" type="button" onClick={() => openEntry("customer", true)}>
                    <Icon name="download" size={16} /> Import CSV
                  </button>
                </>
              )}
              {(activeSection === "overview" || activeSection === "sales") && canRecordSales && (
                <button className="primary-button entry-sale-button" type="button" onClick={() => openEntry("sale")}>
                  <Icon name="bag" size={16} /> Record sale
                </button>
              )}
              {activeSection === "sales" && canRecordSales && (
                <button className="secondary-button" type="button" onClick={() => openEntry("sale", true)}>
                  <Icon name="download" size={16} /> Import CSV
                </button>
              )}
              {(activeSection === "overview" || activeSection === "sales") && (
                <button className="secondary-button" type="button" onClick={() => void downloadCsv()}>
                  <Icon name="download" size={16} /> Export report
                </button>
              )}
            </div>
          </div>

          {/* Date Range & Global Filter Bar */}
          {(activeSection === "overview" || activeSection === "sales" || activeSection === "analytics") && (
            <section className="filter-bar">
              <div className="filter-title">
                <span className="filter-icon"><Icon name="calendar" size={18} /></span>
                <span>
                  <strong>Filter by Period</strong>
                  <small>{dateRange}</small>
                </span>
              </div>

              <div className="sales-filter-controls">
                <label>
                  <span>Customer:</span>
                  <select value={filterCustomerId} onChange={(e) => setFilterCustomerId(e.target.value)}>
                    <option value="">All Customers</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Product:</span>
                  <select value={filterProductId} onChange={(e) => setFilterProductId(e.target.value)}>
                    <option value="">All Products</option>
                    {inventory.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>

                <div className="date-controls">
                  <label>
                    <span>From</span>
                    <input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} />
                  </label>
                  <span className="date-separator">—</span>
                  <label>
                    <span>To</span>
                    <input type="date" value={end} min={start || undefined} max={todayInZone(business?.timezone)} onChange={(e) => setEnd(e.target.value)} />
                  </label>
                </div>

                <button
                  className="date-apply"
                  onClick={() => void loadDashboard()}
                  disabled={loading || !start || !end}
                >
                  {loading ? "Refreshing…" : "Apply Range"}
                </button>

                <button
                  className="text-button clear-filters"
                  onClick={() => {
                    setFilterCustomerId("");
                    setFilterProductId("");
                    const day = todayInZone(business?.timezone);
                    setEnd(day);
                    setStart(earlier(day, 29));
                  }}
                >
                  Reset
                </button>
              </div>

              <button className="filter-export" onClick={() => void downloadCsv()} title="Export filtered report">
                <Icon name="download" size={18} />
              </button>
            </section>
          )}

          {/* Inline Errors if API Fails */}
          {error && (
            <div className="inline-error" role="alert">
              <span>{error}</span>
              <button onClick={() => void loadDashboard()}>Retry</button>
            </div>
          )}
          {recordsError && (
            <div className="inline-error" role="alert">
              <span>{recordsError}</span>
              <button type="button" onClick={() => void loadWorkspaceRecords()}>Retry</button>
            </div>
          )}

          {/* Key Metrics Cards */}
          {(activeSection === "overview" || activeSection === "analytics") && (
            <>
              <section className="metric-grid" aria-label="Key sales performance metrics">
                <Metric
                  title="Total Revenue"
                  value={summary ? money(summary.revenue_minor, summary.currency) : "—"}
                  note={dateRange}
                  icon="chart"
                  tone="green"
                />
                <Metric
                  title="Gross Profit"
                          value={summary?.gross_profit_minor != null ? money(summary.gross_profit_minor, summary.currency) : "—"}
                          note={summary?.profit_margin_pct != null ? `${summary.profit_margin_pct.toFixed(1)}% gross margin` : "Add cost prices to measure profit"}
                  icon="chart"
                  tone="emerald"
                />
                <Metric
                  title="Total Orders"
                  value={summary?.order_count.toLocaleString("en-IN") ?? "—"}
                  note="Orders in selected period"
                  icon="bag"
                  tone="blue"
                />
                <Metric
                  title="Average Order Value"
                  value={summary ? money(summary.average_order_value_minor, summary.currency) : "—"}
                  note="Revenue per completed order"
                  icon="arrow"
                  tone="orange"
                />
                <Metric
                  title="Total Units Sold"
                  value={products.reduce((total, item) => total + item.units_sold, 0).toLocaleString("en-IN")}
                  note="Quantity across all line items"
                  icon="box"
                  tone="purple"
                />
              </section>

              {/* Trend Chart & Top Products Leaderboard */}
              <section className="dashboard-grid">
                <article className="panel trend-panel" id="analytics">
                  <div className="panel-header">
                    <div>
                      <h2>Revenue Trajectory</h2>
                      <p>Hover over data points to inspect date, revenue &amp; order volume</p>
                    </div>
                    <div className="panel-actions">
                      <span className="legend"><i /> Revenue</span>
                      <select
                        className="interval-select"
                        value={interval}
                        onChange={(event) => setInterval(event.target.value)}
                        aria-label="Chart interval"
                      >
                        <option value="day">Daily</option>
                        <option value="week">Weekly</option>
                        <option value="month">Monthly</option>
                      </select>
                    </div>
                  </div>
                  <SalesChart data={trend} currency={summary?.currency || business?.currency || "INR"} />
                </article>

                <article className="panel products-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Top Products</h2>
                      <p>Ranked by gross sales volume</p>
                    </div>
                    <button
                      className="text-link text-button"
                      type="button"
                      onClick={() => setShowAllTopProducts((show) => !show)}
                    >
                      {showAllTopProducts ? "Show Top 5" : "View all"} <span>→</span>
                    </button>
                  </div>
                  <div className="product-list">
                    {visibleTopProducts.map((product, index) => (
                      <div className="product-row" key={product.product_name}>
                        <span className={`product-thumb p-${index % 5}`}>
                          <Icon name="box" size={18} />
                        </span>
                        <span className="product-data">
                          <strong>{product.product_name}</strong>
                          <small>{product.units_sold} units sold</small>
                          <span className="product-track">
                            <i style={{ width: `${Math.max(8, (product.revenue_minor / maxProductRevenue) * 100)}%` }} />
                          </span>
                        </span>
                        <strong className="product-revenue">
                          {money(product.revenue_minor, summary?.currency || business?.currency || "INR")}
                        </strong>
                      </div>
                    ))}
                    {!products.length && <Empty text="No product sales recorded in this period" />}
                  </div>
                </article>
              </section>
            </>
          )}

          {/* Products / Inventory Table Section */}
          {activeSection === "products" && (
            <section className="panel recent-panel inventory-panel">
              <div className="panel-header">
                <div>
                  <h2>Product Inventory</h2>
                  <p>{inventory.length} total catalog items · Real-time stock counts and pricing</p>
                </div>
              </div>

              {/* Table Toolbar: Search & Status Filters */}
              <div className="table-toolbar">
                <div className="table-search-box">
                  <Icon name="search" size={16} />
                  <input
                    type="text"
                    placeholder="Search by product name or SKU..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                  />
                  {searchProduct && (
                    <button className="text-button" onClick={() => setSearchProduct("")} aria-label="Clear search">
                      ×
                    </button>
                  )}
                </div>

                <div className="table-filter-pills">
                  <button
                    className={`filter-pill-btn${productFilterStatus === "all" ? " active" : ""}`}
                    onClick={() => setProductFilterStatus("all")}
                  >
                    All ({inventory.length})
                  </button>
                  <button
                    className={`filter-pill-btn${productFilterStatus === "active" ? " active" : ""}`}
                    onClick={() => setProductFilterStatus("active")}
                  >
                    Active
                  </button>
                  <button
                    className={`filter-pill-btn${productFilterStatus === "inactive" ? " active" : ""}`}
                    onClick={() => setProductFilterStatus("inactive")}
                  >
                    Inactive
                  </button>
                  <button
                    className={`filter-pill-btn${productFilterStatus === "low_stock" ? " active" : ""}`}
                    onClick={() => setProductFilterStatus("low_stock")}
                  >
                    Low Stock (≤10)
                  </button>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Selling Price</th>
                      <th>Cost Price</th>
                      <th>Gross Margin</th>
                      <th>Stock Status</th>
                      <th>Status</th>
                      {canManageProducts && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.name}</strong>
                        </td>
                        <td>
                          <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>{product.sku}</code>
                        </td>
                        <td>
                          <strong>{money(product.price_minor, business?.currency || "INR")}</strong>
                        </td>
                        <td>
                          {product.cost_price_minor != null ? (
                            <span>{money(product.cost_price_minor, business?.currency || "INR")}</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          {product.cost_price_minor != null ? (
                            (() => {
                              const margin = product.price_minor - product.cost_price_minor;
                              const pct = product.price_minor > 0 ? Math.round((margin / product.price_minor) * 100) : 0;
                              return (
                                <span>
                                  <strong style={{ color: pct >= 30 ? "var(--accent-emerald-text, #10b981)" : "inherit" }}>{pct}%</strong>{" "}
                                  <small style={{ color: "var(--text-muted)", fontSize: "11px" }}>({money(margin, business?.currency || "INR")})</small>
                                </span>
                              );
                            })()
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          {product.stock_quantity === 0 ? (
                            <span className="stock-badge out-of-stock">Out of stock</span>
                          ) : product.stock_quantity <= 10 ? (
                            <span className="stock-badge low-stock">Low stock ({product.stock_quantity})</span>
                          ) : (
                            <span className="stock-badge in-stock">{product.stock_quantity} in stock</span>
                          )}
                        </td>
                        <td>
                          <span className={`inventory-status${product.active ? " is-active" : ""}`}>
                            {product.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        {canManageProducts && (
                          <td>
                            <div className="record-actions">
                              <button type="button" onClick={() => setEditingProduct(product)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void setProductActive(product, !product.active)}
                              >
                                {product.active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                type="button"
                                className="danger-action"
                                onClick={() => void removeProduct(product)}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recordsLoading ? (
                  <Empty text="Loading inventory records…" />
                ) : !filteredProducts.length ? (
                  <Empty text="No matching products found." />
                ) : null}
              </div>
            </section>
          )}

          {/* Sales History & Ledger */}
          {(activeSection === "overview" || activeSection === "sales") && (
            <section className="panel recent-panel" id="sales">
              <div className="panel-header">
                <div>
                  <h2>{activeSection === "overview" ? "Recent Transactions" : "Sales Ledger"}</h2>
                  <p>
                    {activeSection === "overview"
                      ? "Recent transactions in the selected date range"
                      : `${sales.length} orders recorded in this date range`}
                  </p>
                </div>
                {activeSection === "overview" && (
                  <a className="text-link" href="/sales">
                    View complete ledger <span>→</span>
                  </a>
                )}
              </div>

              {activeSection === "sales" && (
                <div className="table-toolbar">
                  <div className="table-search-box">
                    <Icon name="search" size={16} />
                    <input
                      type="text"
                      placeholder="Search order ID or item keyword..."
                      value={searchSale}
                      onChange={(e) => setSearchSale(e.target.value)}
                    />
                    {searchSale && (
                      <button className="text-button" onClick={() => setSearchSale("")} aria-label="Clear search">
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Items Breakdown</th>
                      <th>Date &amp; Time</th>
                      <th>Source</th>
                      <th className="amount-col">Total Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr key={sale.id}>
                        <td>
                          <strong className="order-id">#{String(sale.id).padStart(5, "0")}</strong>
                        </td>
                        <td>
                          <span className="sale-items">
                            {sale.items.slice(0, 2).map((item) => `${item.quantity}× ${item.product_name}`).join(", ")}
                            {sale.items.length > 2 ? ` +${sale.items.length - 2} more` : ""}
                          </span>
                        </td>
                        <td>
                          <span className="sale-time">
                            <Icon name="clock" size={14} />
                            {new Intl.DateTimeFormat("en", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone: business?.timezone,
                            }).format(new Date(sale.created_at))}
                          </span>
                        </td>
                        <td>
                          <span className="status-pill">
                            <i />
                            {sale.external_reference ? "CSV Import" : "Manual Sale"}
                          </span>
                        </td>
                        <td className="amount-col">
                          <strong>{money(sale.total_minor, sale.currency)}</strong>
                        </td>
                        <td>
                          <div className="record-actions">
                            <button type="button" onClick={() => setSelectedSale(sale)}>
                              View
                            </button>
                            <button type="button" onClick={() => setEditingSale(sale)}>
                              Edit
                            </button>
                            {canManageProducts && (
                              <button
                                type="button"
                                className="danger-action"
                                onClick={() => void removeSale(sale)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {loading ? (
                  <Empty text="Loading sales records…" />
                ) : !filteredSales.length ? (
                  <Empty text="No sales recorded in this period." />
                ) : null}
              </div>
            </section>
          )}

          {/* Customers Directory */}
          {activeSection === "customers" && (
            <section className="panel recent-panel">
              <div className="panel-header">
                <div>
                  <h2>Customer Directory</h2>
                  <p>{customers.length} verified customer profiles for {business?.name || "this workspace"}</p>
                </div>
              </div>

              <div className="table-toolbar">
                <div className="table-search-box">
                  <Icon name="search" size={16} />
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                  />
                  {searchCustomer && (
                    <button className="text-button" onClick={() => setSearchCustomer("")} aria-label="Clear search">
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email Address</th>
                      <th>Phone Number</th>
                      {canManageProducts && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="customer-clickable-row"
                        onClick={() => void openCustomerDrawer(customer)}
                        title="Click to view customer lifetime spend & purchase history"
                      >
                        <td>
                          <strong>{customer.name}</strong>
                        </td>
                        <td>{customer.email || "—"}</td>
                        <td>{customer.phone || "—"}</td>
                        <td>
                          <div className="record-actions">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openCustomerDrawer(customer);
                              }}
                            >
                              Orders
                            </button>
                            {canManageProducts && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCustomer(customer);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="danger-action"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void removeCustomer(customer);
                                  }}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recordsLoading ? (
                  <Empty text="Loading customer profiles…" />
                ) : !filteredCustomers.length ? (
                  <Empty text="No customers found. Add or import customers to populate your directory." />
                ) : null}
              </div>
            </section>
          )}

          {/* Page Footer */}
          <footer className="page-footer">
            <span>© 2026 SmartBiz Technologies · Enterprise Edition</span>
            {(activeSection === "overview" || activeSection === "sales" || activeSection === "analytics") && (
              <span>
                Active range: {dateRange} · Timezone: {business?.timezone || "UTC"}
              </span>
            )}
            <a href={`${API}/docs`} target="_blank" rel="noreferrer">
              Interactive API Reference ↗
            </a>
          </footer>
        </div>
      </main>

      {/* Creation & Import Modal */}
      {entryKind && (
        <DataEntryModal
          kind={entryKind}
          businessId={selectedId || 0}
          currency={business?.currency || "INR"}
          request={request}
          startInImport={entryImportMode}
          onClose={() => setEntryKind(null)}
          onSaved={entrySaved}
        />
      )}

      {/* Product Editor Modal */}
      {editingProduct && (
        <RecordEditor
          kind="product"
          record={editingProduct}
          currency={business?.currency || "INR"}
          request={request}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            addToast("Product updated successfully.", "success");
            void loadWorkspaceRecords();
          }}
        />
      )}

      {/* Customer Editor Modal */}
      {editingCustomer && (
        <RecordEditor
          kind="customer"
          record={editingCustomer}
          currency={business?.currency || "INR"}
          request={request}
          onClose={() => setEditingCustomer(null)}
          onSaved={() => {
            setEditingCustomer(null);
            addToast("Customer record updated.", "success");
            void loadWorkspaceRecords();
          }}
        />
      )}

      {/* Sale Editor Modal */}
      {editingSale && (
        <SaleEditor
          sale={editingSale}
          products={inventory}
          customers={customers}
          currency={editingSale.currency}
          request={request}
          onClose={() => setEditingSale(null)}
          onSaved={() => {
            setEditingSale(null);
            addToast("Sale updated and inventory reconciled.", "success");
            void loadDashboard();
            void loadWorkspaceRecords();
          }}
        />
      )}

      {/* Sale Details Inspection Modal */}
      {selectedSale && (
        <SaleDetails
          sale={selectedSale}
          currency={selectedSale.currency}
          businessName={business?.name || "SmartBiz Workspace"}
          customerName={customers.find((customer) => customer.id === selectedSale.customer_id)?.name}
          onClose={() => setSelectedSale(null)}
        />
      )}

      {/* Account Profile & Settings Slide-over / Modal */}
      {accountPanel && (
        <div
          className="account-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAccountPanel(null);
          }}
        >
          <section
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") setAccountPanel(null);
            }}
          >
            <div className="account-modal-header">
              <div>
                <span className="eyebrow">PREFERENCES</span>
                <h2 id="account-modal-title">
                  {accountPanel === "profile" ? "User Profile" : "Workspace Settings"}
                </h2>
              </div>
              <button
                type="button"
                className="account-close"
                aria-label="Close"
                onClick={() => setAccountPanel(null)}
              >
                ×
              </button>
            </div>

            {accountPanel === "profile" ? (
              <>
                <div className="account-profile-summary">
                  <span className="account-avatar">{initials(auth.user.full_name)}</span>
                  <div>
                    <strong>{auth.user.full_name}</strong>
                    <small>{auth.user.email}</small>
                  </div>
                </div>

                <dl className="account-details">
                  <div>
                    <dt>Workspace</dt>
                    <dd>{business?.name || "No workspace selected"}</dd>
                  </div>
                  <div>
                    <dt>Role Permission</dt>
                    <dd>{auth.memberships.find((item) => item.business.id === selectedId)?.role || "Member"}</dd>
                  </div>
                  <div>
                    <dt>Active Theme</dt>
                    <dd>{theme === "dark" ? "Dark Mode" : "Light Mode"}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  className="secondary-button account-edit-button"
                  onClick={() => {
                    setAccountPanel("settings");
                    setSettingsError("");
                    setSettingsMessage("");
                  }}
                >
                  Edit Account &amp; Security Settings
                </button>
              </>
            ) : (
              <div className="account-settings-content">
                <p className="account-panel-intro">
                  Update your personal profile, credentials, and authentication preferences.
                </p>

                {settingsError && <p className="account-form-error" role="alert">{settingsError}</p>}
                {settingsMessage && <p className="account-form-success" role="status">{settingsMessage}</p>}
                {verificationUrl && (
                  <a className="account-verification-link" href={verificationUrl} onClick={openVerificationLink}>
                    Open email confirmation link
                  </a>
                )}

                <form className="account-settings-form" onSubmit={saveProfile}>
                  <h3>Personal Information</h3>
                  <label>
                    Full name
                    <input name="full_name" defaultValue={auth.user.full_name} required maxLength={160} />
                  </label>
                  <button className="primary-button" type="submit">Save profile</button>
                </form>

                <form className="account-settings-form" onSubmit={changeAccountEmail}>
                  <h3>Change Email Address</h3>
                  <p>Current address: {auth.user.email}</p>
                  <label>
                    New email address
                    <input name="email" type="email" required autoComplete="email" />
                  </label>
                  <label>
                    Current password
                    <input name="current_password" type="password" required autoComplete="current-password" />
                  </label>
                  <button className="secondary-button" type="submit">Send confirmation email</button>
                </form>

                <form className="account-settings-form" onSubmit={changeAccountPassword}>
                  <h3>Security &amp; Password</h3>
                  <label>
                    Current password
                    <input name="current_password" type="password" required autoComplete="current-password" />
                  </label>
                  <label>
                    New password
                    <input name="new_password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" />
                  </label>
                  <button className="secondary-button" type="submit">Update password</button>
                </form>

                <dl className="account-details">
                  <div>
                    <dt>Workspace</dt>
                    <dd>{business?.name || "No workspace selected"}</dd>
                  </div>
                  <div>
                    <dt>Base Currency</dt>
                    <dd>{business?.currency || "—"}</dd>
                  </div>
                  <div>
                    <dt>Timezone</dt>
                    <dd>{business?.timezone || "—"}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Customer Detail Drawer & Lifetime Purchase Drill-down */}
      {viewingCustomer && (
        <div
          className="customer-drawer-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-drawer-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingCustomer(null);
          }}
        >
          <div className="customer-drawer">
            <header className="customer-drawer-header">
              <div>
                <span className="eyebrow">CUSTOMER PROFILE &amp; LEDGER</span>
                <h2 id="customer-drawer-title">{viewingCustomer.name}</h2>
                <div className="customer-drawer-meta">
                  {viewingCustomer.email && <span>✉ {viewingCustomer.email}</span>}
                  {viewingCustomer.phone && <span>📞 {viewingCustomer.phone}</span>}
                </div>
              </div>
              <button
                type="button"
                className="entry-close"
                onClick={() => setViewingCustomer(null)}
                aria-label="Close drawer"
              >
                ×
              </button>
            </header>

            {customerStatsLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                Loading customer order history &amp; lifetime spend…
              </div>
            ) : customerStats ? (
              <>
                <div className="customer-drawer-stats">
                  <div className="drawer-stat-card">
                    <span>Lifetime Spend</span>
                    <strong>{money(customerStats.total_spend_minor, business?.currency || "INR")}</strong>
                  </div>
                  <div className="drawer-stat-card">
                    <span>Total Orders</span>
                    <strong>{customerStats.order_count}</strong>
                  </div>
                  <div className="drawer-stat-card">
                    <span>Avg Order</span>
                    <strong>{money(customerStats.average_order_minor, business?.currency || "INR")}</strong>
                  </div>
                </div>

                <div className="customer-drawer-body">
                  <h3>Purchase History ({customerStats.recent_sales.length} orders)</h3>
                  {customerStats.recent_sales.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No orders recorded for this customer yet.</p>
                  ) : (
                    <div className="customer-history-list">
                      {customerStats.recent_sales.map((order) => (
                        <div
                          key={order.id}
                          className="customer-history-item"
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedSale(order)}
                          title="Click to view and print the sales receipt"
                        >
                          <div>
                            <strong style={{ display: "block", color: "var(--primary)" }}>
                              Order #{String(order.id).padStart(5, "0")}
                            </strong>
                            <small style={{ color: "var(--text-muted)" }}>
                              {new Intl.DateTimeFormat("en", {
                                dateStyle: "medium",
                                timeStyle: "short",
                                timeZone: business?.timezone,
                              }).format(new Date(order.created_at))}
                            </small>
                            <div style={{ fontSize: "12px", marginTop: "4px" }}>
                              {order.items.map((it) => `${it.quantity}× ${it.product_name}`).join(", ")}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <strong style={{ display: "block", fontSize: "14px" }}>
                              {money(order.total_minor, order.currency || business?.currency || "INR")}
                            </strong>
                            <span style={{ fontSize: "11px", color: "var(--primary)" }}>View Receipt ↗</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Command Palette (Ctrl+K / Cmd+K) */}
      {commandOpen && (
        <div
          className="command-palette-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCommandOpen(false);
          }}
        >
          <div className="command-palette">
            <div className="command-palette-input-wrap">
              <Icon name="search" size={18} />
              <input
                type="text"
                className="command-palette-input"
                placeholder="Type a command, product, or customer..."
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
              />
              <span className="command-palette-badge">ESC to close</span>
            </div>

            <div className="command-palette-results">
              {/* Quick Navigation Commands */}
              <div className="command-palette-group-title">Navigation &amp; Views</div>
              {[
                { label: "Go to Executive Dashboard Overview", section: "overview", icon: "grid" },
                { label: "Go to Sales Ledger", section: "sales", icon: "bag" },
                { label: "Go to Product Inventory & Stock", section: "products", icon: "box" },
                { label: "Go to Customer Directory", section: "customers", icon: "people" },
                { label: "Go to Revenue Analytics & Trends", section: "analytics", icon: "chart" },
              ]
                .filter((item) => !commandQuery || item.label.toLowerCase().includes(commandQuery.toLowerCase()))
                .map((cmd) => (
                  <button
                    key={cmd.section}
                    type="button"
                    className="command-palette-item"
                    onClick={() => {
                      setActiveSection(cmd.section);
                      setCommandOpen(false);
                      setCommandQuery("");
                    }}
                  >
                    <span className="command-palette-item-left">
                      <Icon name={cmd.icon} size={16} />
                      <span>{cmd.label}</span>
                    </span>
                    <span className="command-palette-badge">Jump</span>
                  </button>
                ))}

              {/* Quick Actions */}
              <div className="command-palette-group-title">Actions &amp; Tasks</div>
              {[
                {
                  label: "Record new sale (POS Checkout)",
                  action: () => openEntry("sale"),
                  icon: "bag",
                },
                {
                  label: "Add new product to catalog",
                  action: () => openEntry("product"),
                  icon: "box",
                },
                {
                  label: "Add new customer profile",
                  action: () => openEntry("customer"),
                  icon: "people",
                },
                {
                  label: `Switch theme to ${theme === "light" ? "Dark Mode" : "Light Mode"}`,
                  action: () => toggleTheme(),
                  icon: theme === "light" ? "moon" : "sun",
                },
                {
                  label: "Export sales CSV report",
                  action: () => void downloadCsv(),
                  icon: "download",
                },
              ]
                .filter((item) => !commandQuery || item.label.toLowerCase().includes(commandQuery.toLowerCase()))
                .map((act, i) => (
                  <button
                    key={i}
                    type="button"
                    className="command-palette-item"
                    onClick={() => {
                      setCommandOpen(false);
                      setCommandQuery("");
                      act.action();
                    }}
                  >
                    <span className="command-palette-item-left">
                      <Icon name={act.icon} size={16} />
                      <span>{act.label}</span>
                    </span>
                    <span className="command-palette-badge">Run</span>
                  </button>
                ))}

              {/* Matching Products */}
              {commandQuery && (
                <>
                  <div className="command-palette-group-title">Matching Products</div>
                  {inventory
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(commandQuery.toLowerCase()) ||
                        p.sku.toLowerCase().includes(commandQuery.toLowerCase())
                    )
                    .slice(0, 5)
                    .map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        className="command-palette-item"
                        onClick={() => {
                          setEditingProduct(prod);
                          setCommandOpen(false);
                          setCommandQuery("");
                        }}
                      >
                        <span className="command-palette-item-left">
                          <Icon name="box" size={16} />
                          <span>
                            <strong>{prod.name}</strong>{" "}
                            <small style={{ color: "var(--text-muted)" }}>({prod.sku})</small>
                          </span>
                        </span>
                        <span>
                          {money(prod.price_minor, business?.currency || "INR")} · {prod.stock_quantity} in stock
                        </span>
                      </button>
                    ))}

                  {/* Matching Customers */}
                  <div className="command-palette-group-title">Matching Customers</div>
                  {customers
                    .filter(
                      (c) =>
                        c.name.toLowerCase().includes(commandQuery.toLowerCase()) ||
                        (c.email && c.email.toLowerCase().includes(commandQuery.toLowerCase()))
                    )
                    .slice(0, 5)
                    .map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        className="command-palette-item"
                        onClick={() => {
                          setCommandOpen(false);
                          setCommandQuery("");
                          void openCustomerDrawer(cust);
                        }}
                      >
                        <span className="command-palette-item-left">
                          <Icon name="people" size={16} />
                          <span>{cust.name}</span>
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {cust.email || cust.phone || "View drilldown"}
                        </span>
                      </button>
                    ))}
                </>
              )}
            </div>

            <footer className="command-palette-footer">
              <span>Navigate or click any action</span>
              <span>SmartBiz Quick Commands</span>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  title,
  value,
  note,
  icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: string;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-note">
        <span className="note-dot" />
        {note}
      </div>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="box" size={22} />
      </span>
      <span>{text}</span>
    </div>
  );
}

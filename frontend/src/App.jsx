import { useEffect, useState, useMemo } from "react";
import { Navigate, Route, Routes, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { BarChart3, Bell, Box, Building2, Check, ChevronRight, CircleDollarSign, ClipboardCheck, FileText, KeyRound, LayoutDashboard, LogOut, Menu, PackageCheck, Plus, Search, Send, ShoppingCart, Sparkles, Tag, Trash2, Truck, Users, X, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import api from "./api/client";
import { useAuth } from "./store/auth.jsx";

const money = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v || 0));
const date = (v) => v ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(v)) : "-";
const titleCase = (v = "") => v.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const roles = { ADMIN: "Administrator", PROCUREMENT_OFFICER: "Procurement Officer", FINANCE_OFFICER: "Finance Officer", VENDOR: "Vendor" };
const statusStyle = {
  APPROVED: "green", DELIVERED: "green", COMPLETED: "green", ACTIVE: "green", PAID: "green", RECEIVED: "green",
  REJECTED: "red", CANCELLED: "red", BLACKLISTED: "red", OVERDUE: "red",
  PENDING: "amber", APPROVAL_PENDING: "amber", UNPAID: "amber", PARTIALLY_PAID: "amber",
  SENT: "blue", SUBMITTED: "blue", GENERATED: "blue", DISPATCHED: "blue", SHIPPED: "blue", ON_THE_WAY: "blue", PO_GENERATED: "teal", QUOTATIONS_RECEIVED: "teal", SENT_TO_VENDOR: "teal",
  DRAFT: "gray", INACTIVE: "gray", CLOSED: "gray", UNDER_REVIEW: "violet", SELECTED: "violet",
};
const defaultDeadline = () => { const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); return d.toISOString().slice(0, 16); };
const employeeRoles = ["ADMIN", "PROCUREMENT_OFFICER", "FINANCE_OFFICER"];

function Status({ value }) { return <span className={`status ${statusStyle[value] || "gray"}`}><i />{titleCase(value)}</span>; }
function Button({ children, icon: Icon, secondary, danger, ...props }) { return <button className={`button ${secondary ? "secondary" : ""} ${danger ? "danger" : ""}`} {...props}>{Icon && <Icon size={15} />}{children}</button>; }
function ErrorBox({ error }) { return error ? <div className="error">{error.response?.data?.message || error.message}</div> : null; }
function Empty({ text = "No records found" }) { return <div className="empty"><Search size={26} /><p>{text}</p></div>; }
function PageTitle({ title, subtitle, action }) { return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Table({ headers, children, empty }) { return <div className="table-wrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table>{empty && <Empty />}</div>; }

function useLoad(path, deps = []) {
  const [data, setData] = useState(null); const [error, setError] = useState(null); const [tick, setTick] = useState(0);
  useEffect(() => { let mounted = true; setError(null); api.get(path).then((r) => mounted && setData(r.data)).catch((e) => mounted && setError(e)); return () => { mounted = false; }; }, [path, tick, ...deps]);
  return { data, error, reload: () => setTick((v) => v + 1) };
}
function useList(path, deps = []) { const result = useLoad(path, deps); return { ...result, data: Array.isArray(result.data) ? result.data : [] }; }
async function action(method, path, payload, done) {
  try { const { data } = await api[method](path, payload); toast.success("Action completed"); done?.(data); return data; }
  catch (e) { toast.error(e.response?.data?.message || e.message); }
}

// ─── Sidebar Menu ───────────────────────────────────────────────────────────

const menu = {
  ADMIN: [[LayoutDashboard, "Dashboard", "/dashboard"], [Users, "Employees", "/users"], [Building2, "Vendors", "/vendors"], [Box, "Products", "/products"], [Tag, "Categories", "/vendor-categories"], [KeyRound, "Reset Requests", "/requests"], [ShoppingCart, "RFQs", "/rfqs"], [PackageCheck, "Purchase orders", "/purchase-orders"], [FileText, "Invoices", "/invoices"], [BarChart3, "Reports", "/reports"], [ClipboardCheck, "Activity logs", "/activity-logs"]],
  PROCUREMENT_OFFICER: [[LayoutDashboard, "Dashboard", "/dashboard"], [ShoppingCart, "RFQs", "/rfqs"], [ClipboardCheck, "Approvals", "/approvals"], [PackageCheck, "Purchase orders", "/purchase-orders"], [FileText, "Invoices", "/invoices"], [ClipboardCheck, "Activity logs", "/activity-logs"]],
  FINANCE_OFFICER: [[LayoutDashboard, "Dashboard", "/dashboard"], [ClipboardCheck, "Approvals", "/approvals"], [PackageCheck, "Purchase orders", "/purchase-orders"], [FileText, "Invoices", "/invoices"], [BarChart3, "Reports", "/reports"]],
  VENDOR: [[LayoutDashboard, "Dashboard", "/dashboard"], [ShoppingCart, "Assigned RFQs", "/rfqs"], [PackageCheck, "Purchase orders", "/purchase-orders"], [FileText, "Invoices", "/invoices"]],
};

function Shell() {
  const { user, logout } = useAuth(); const [open, setOpen] = useState(false); const location = useLocation();
  return <div className="shell">
    <aside className={open ? "open" : ""}>
      <div className="brand"><span>VB</span><div><strong>VendorBridge</strong><small>Procurement ERP</small></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <nav>{menu[user.role].map(([Icon, label, path]) => <NavLink to={path} key={path} onClick={() => setOpen(false)} className={({ isActive }) => isActive || location.pathname.startsWith(`${path}/`) ? "active" : ""}><Icon size={17} />{label}<ChevronRight size={14} /></NavLink>)}</nav>
      <div className="side-user"><div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div><div><strong>{user.name}</strong><small>{roles[user.role]}</small></div><button title="Log out" onClick={logout}><LogOut size={17} /></button></div>
      <button className="button secondary" style={{ margin: "0 14px 14px", width: "calc(100% - 28px)", fontSize: 11 }} onClick={() => { action("post", "/password-reset-requests", { message: "Please reset my password" }); toast.success("Password reset request sent to admin"); }}><KeyRound size={14} /> Request Password Reset</button>
    </aside>
    <main><header><button className="menu-button" onClick={() => setOpen(true)}><Menu size={20} /></button><div className="context">Workspace <ChevronRight size={13} /> <strong>{roles[user.role]}</strong></div><NavLink to="/notifications" className="icon-button"><Bell size={18} /></NavLink></header><div className="content"><AppRoutes /></div></main>
  </div>;
}

// ─── Login ──────────────────────────────────────────────────────────────────

function Login() {
  const { login } = useAuth(); const nav = useNavigate(); const [error, setError] = useState(); const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false); const [resetEmail, setResetEmail] = useState(""); const [resetLoading, setResetLoading] = useState(false); const [resetDone, setResetDone] = useState(false);
  const submit = async (e) => { e.preventDefault(); setLoading(true); setError(); const form = new FormData(e.currentTarget); try { await login(form.get("email"), form.get("password")); nav("/dashboard"); } catch (err) { setError(err); } finally { setLoading(false); } };
  const submitReset = async (e) => { e.preventDefault(); setResetLoading(true); try { await api.post("/password-reset-requests/public", { email: resetEmail }); setResetDone(true); toast.success("Password reset request submitted to admin"); } catch (err) { toast.error(err.response?.data?.message || "Failed to submit request"); } finally { setResetLoading(false); } };
  return <div className="login"><section><div className="login-brand"><span>VB</span><strong>VendorBridge</strong></div><div className="login-copy"><small>PROCUREMENT CONTROL CENTER</small><h1>One clear path from request to delivery.</h1><p>Manage vendor sourcing, approvals, purchase orders, invoices, and fulfillment in a single operational workspace.</p><div className="flow"><span>RFQ</span><i /><span>Quote</span><i /><span>Approve</span><i /><span>Deliver</span></div></div><footer>Secure role-based procurement operations</footer></section>{!showReset ? <form onSubmit={submit}><div><h2>Sign in</h2><p>Enter your credentials to access VendorBridge.</p><ErrorBox error={error} /><label>Email<input name="email" type="email" placeholder="you@company.com" required /></label><label>Password<input name="password" type="password" placeholder="••••••••" required /></label><Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button><button type="button" className="reset-link" onClick={() => { setShowReset(true); setResetDone(false); setResetEmail(""); }}>Forgot password?</button></div></form> : <form onSubmit={submitReset}><div><h2>Reset Password</h2><p>Enter your email to request a password reset from the administrator.</p>{resetDone ? <div className="reset-success"><Check size={28} /><span>Your request has been submitted. The administrator will review it and email you a new password.</span><button type="button" className="reset-link" onClick={() => setShowReset(false)}>← Back to Sign in</button></div> : <><label>Email<input type="email" placeholder="you@company.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required /></label><Button type="submit" disabled={resetLoading}>{resetLoading ? "Submitting..." : "Request Password Reset"}</Button><button type="button" className="reset-link" onClick={() => setShowReset(false)}>← Back to Sign in</button></>}</div></form>}</div>;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

function Dashboard() {
  const { user } = useAuth(); const { data, error } = useLoad("/reports/dashboard-summary"); const spend = useLoad("/reports/monthly-spend");
  const cards = user.role === "VENDOR" ? [["Assigned RFQs", data?.rfqs, ShoppingCart], ["Quotations", data?.quotations, ClipboardCheck], ["Purchase orders", data?.purchaseOrders, PackageCheck], ["Invoices", data?.invoices, FileText]]
    : [["Active RFQs", data?.rfqs, ShoppingCart], ["Pending approvals", data?.approvals, ClipboardCheck], ["Purchase orders", data?.purchaseOrders, PackageCheck], ["Procurement value", money(data?.totalSpend), CircleDollarSign]];
  return <><PageTitle title={`Good day, ${user.name.split(" ")[0]}`} subtitle="Here is the current state of your procurement workflow." action={user.role === "PROCUREMENT_OFFICER" && <Button icon={Plus} onClick={() => location.href = "/rfqs/create"}>Create RFQ</Button>} /><ErrorBox error={error} /><div className="stats">{cards.map(([label, value, Icon]) => <div className="stat" key={label}><div><span>{label}</span><strong>{value ?? "-"}</strong></div><Icon size={20} /></div>)}</div><div className="dashboard-grid"><section className="panel chart"><div className="panel-head"><div><h2>Monthly procurement spend</h2><p>Approved purchase order value</p></div></div><ResponsiveContainer width="100%" height={260}><BarChart data={spend.data || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis tickFormatter={(v) => `${v / 1000}k`} /><Tooltip formatter={money} /><Bar dataKey="total" fill="#167d71" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></section><QuickActions role={user.role} /></div></>;
}
function QuickActions({ role }) {
  const nav = useNavigate(); const options = role === "PROCUREMENT_OFFICER" ? [["Create RFQ", "/rfqs/create"], ["Review approvals", "/approvals"], ["View purchase orders", "/purchase-orders"]]
    : role === "FINANCE_OFFICER" ? [["Review approvals", "/approvals"], ["View reports", "/reports"], ["Track invoices", "/invoices"]]
      : role === "ADMIN" ? [["Manage users", "/users"], ["Manage vendors", "/vendors"], ["Products", "/products"], ["Activity logs", "/activity-logs"]] : [["View assigned RFQs", "/rfqs"], ["Track deliveries", "/purchase-orders"], ["View invoices", "/invoices"]];
  return <section className="panel"><div className="panel-head"><div><h2>Quick actions</h2><p>Common tasks for your role</p></div></div><div className="quick">{options.map(([label, path]) => <button key={path} onClick={() => nav(path)}><span>{label}</span><ChevronRight size={16} /></button>)}</div></section>;
}

// ─── Products (Admin) ───────────────────────────────────────────────────────

function Products() {
  const { data, error, reload } = useList("/products"); const categories = useList("/vendor-categories"); const [show, setShow] = useState(false);
  const create = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); await action("post", "/products", { ...f, defaultGstPct: Number(f.defaultGstPct || 18) }, () => { setShow(false); reload(); }); };
  return <><PageTitle title="Products" subtitle="Master product catalog for RFQ line items." action={<Button icon={Plus} onClick={() => setShow(true)}>Add product</Button>} /><ErrorBox error={error} />{show && <section className="panel inline-form"><div className="panel-head"><h2>Add product</h2><button onClick={() => setShow(false)}><X size={18} /></button></div><form onSubmit={create} className="fields"><label>Product name<input name="name" required placeholder="e.g. A4 Paper Ream" /></label><label>Category<select name="categoryId" required><option value="">Select category…</option>{categories.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Unit<input name="unit" defaultValue="pieces" placeholder="e.g. kg, pieces, liters" /></label><label>Default GST %<input name="defaultGstPct" type="number" min="0" max="100" step="0.01" defaultValue="18" /></label><label className="full">Description<textarea name="description" rows="2" placeholder="Optional product description" /></label><div className="form-actions"><Button type="submit">Create product</Button></div></form></section>}<Table headers={["#", "Product", "Category", "Unit", "GST %", "Status", "Actions"]} empty={!data.length}>{data.map((p, i) => <tr key={p.id}><td>{i + 1}</td><td><strong>{p.name}</strong><small>{p.description}</small></td><td>{p.category?.name || "-"}</td><td>{p.unit}</td><td>{Number(p.defaultGstPct)}%</td><td><Status value={p.status} /></td><td><div className="actions"><Button secondary danger onClick={() => action("delete", `/products/${p.id}`, null, reload)}>Deactivate</Button></div></td></tr>)}</Table></>;
}

// ─── Vendor Categories ──────────────────────────────────────────────────────

function VendorCategories() {
  const { data, error, reload } = useList("/vendor-categories"); const [show, setShow] = useState(false);
  const create = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); await action("post", "/vendor-categories", { ...f, defaultGstPercent: Number(f.defaultGstPercent || 18) }, () => { setShow(false); reload(); }); };
  return <><PageTitle title="Vendor Categories" subtitle="Product categories with default GST settings." action={<Button icon={Plus} onClick={() => setShow(true)}>Add category</Button>} /><ErrorBox error={error} />{show && <section className="panel inline-form"><div className="panel-head"><h2>Add category</h2><button onClick={() => setShow(false)}><X size={18} /></button></div><form onSubmit={create} className="fields"><label>Category name<input name="name" required /></label><label>Default GST %<input name="defaultGstPercent" type="number" min="0" max="100" step="0.01" defaultValue="18" /></label><label className="full">Description<textarea name="description" rows="2" /></label><div className="form-actions"><Button type="submit">Create category</Button></div></form></section>}<Table headers={["Category", "Default GST %", "Vendors", "Products", "Actions"]} empty={!data.length}>{data.map((c) => <tr key={c.id}><td><strong>{c.name}</strong><small>{c.description}</small></td><td>{Number(c.defaultGstPercent)}%</td><td>{c._count?.vendors ?? 0}</td><td>{c._count?.products ?? 0}</td><td><Button secondary danger onClick={() => action("delete", `/vendor-categories/${c.id}`, null, reload)}>Delete</Button></td></tr>)}</Table></>;
}

// ─── RFQ List ───────────────────────────────────────────────────────────────

function RfqList() {
  const { user } = useAuth(); const { data, error } = useList("/rfqs"); const nav = useNavigate();
  return <><PageTitle title={user.role === "VENDOR" ? "Assigned RFQs" : "Requests for Quotation"} subtitle="Track sourcing requests and vendor participation." action={user.role === "PROCUREMENT_OFFICER" && <Button icon={Plus} onClick={() => nav("/rfqs/create")}>Create RFQ</Button>} /><ErrorBox error={error} /><Table headers={["RFQ", "Title", "Deadline", "Items", "Quotes", "Status", ""]} empty={!data.length}>{data.map((r) => <tr key={r.id}><td className="mono">{r.rfqNumber}</td><td><strong>{r.title}</strong><small>{r.creator?.name}</small></td><td>{date(r.deadline)}</td><td>{r._count?.items ?? "-"}</td><td>{r._count?.quotations ?? "-"}</td><td><Status value={r.status} /></td><td><Button secondary onClick={() => nav(`/rfqs/${r.id}`)}>Open</Button></td></tr>)}</Table></>;
}

// ─── Create RFQ (2-Step Flow) ───────────────────────────────────────────────

function CreateRfq() {
  const nav = useNavigate();
  const products = useList("/products");
  const vendors = useList("/vendors");
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);

  // Step 1: Product Selection
  const filteredProducts = useMemo(() => products.data.filter((p) => p.status === "ACTIVE" && (p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.name?.toLowerCase().includes(search.toLowerCase()))), [products.data, search]);
  const toggleProduct = (p) => { setSelected((prev) => prev.some((s) => s.id === p.id) ? prev.filter((s) => s.id !== p.id) : [...prev, p]); };

  const proceedToStep2 = () => {
    if (!selected.length) { toast.error("Select at least one product"); return; }
    setItems(selected.map((p) => ({ productId: p.id, name: p.name, description: p.description, unit: p.unit, category: p.category?.name, gstPct: Number(p.defaultGstPct), quantity: 1, vendorIds: [], deadline: defaultDeadline() })));
    setStep(2);
  };

  const updateItem = (index, field, value) => setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  const toggleVendor = (index, vendorId) => setItems((prev) => prev.map((item, i) => {
    if (i !== index) return item;
    const has = item.vendorIds.includes(vendorId);
    return { ...item, vendorIds: has ? item.vendorIds.filter((v) => v !== vendorId) : [...item.vendorIds, vendorId] };
  }));

  const submit = async (e) => {
    e.preventDefault();
    // Validation
    for (const [i, item] of items.entries()) {
      if (!item.quantity || item.quantity <= 0) { toast.error(`Item ${i + 1}: Quantity must be > 0`); return; }
      if (!item.vendorIds.length) { toast.error(`Item ${i + 1}: Select at least one vendor`); return; }
      if (new Date(item.deadline) <= new Date()) { toast.error(`Item ${i + 1}: Due date must be in the future`); return; }
    }
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const { data } = await api.post("/rfqs", {
        title: form.get("title"),
        description: form.get("description") || null,
        items: items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity), vendorIds: item.vendorIds, deadline: new Date(item.deadline).toISOString() })),
      });
      toast.success("RFQ created and sent to vendors!");
      nav(`/rfqs/${data.id}`);
    } catch (err) { setError(err); } finally { setLoading(false); }
  };

  if (step === 1) {
    return <><PageTitle title="Create RFQ — Select Products" subtitle="Choose products from the catalog to include in this RFQ." /><div className="panel" style={{ padding: "16px", marginBottom: 16 }}><input placeholder="Search products by name or category…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", maxWidth: 400 }} /></div><Table headers={["", "#", "Product", "Category", "Unit", "GST %"]} empty={!filteredProducts.length}>{filteredProducts.map((p, i) => <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => toggleProduct(p)}><td><input type="checkbox" checked={selected.some((s) => s.id === p.id)} onChange={() => toggleProduct(p)} /></td><td>{i + 1}</td><td><strong>{p.name}</strong><small>{p.description}</small></td><td>{p.category?.name || "-"}</td><td>{p.unit}</td><td>{Number(p.defaultGstPct)}%</td></tr>)}</Table><div className="form-actions" style={{ marginTop: 16 }}><Button secondary onClick={() => nav("/rfqs")}>Cancel</Button><Button icon={Check} onClick={proceedToStep2} disabled={!selected.length}>Done — {selected.length} item(s) selected</Button></div></>;
  }

  // Step 2: Finalization
  return <><PageTitle title="Create RFQ — Finalize" subtitle="Set quantities, assign vendors per item, and submit." /><form className="form-layout" onSubmit={submit}><section className="panel form-section"><h2>RFQ Details</h2><ErrorBox error={error} /><div className="fields"><label>Title<input name="title" required placeholder="e.g. Monthly office supplies order" /></label><label className="full">Description<textarea name="description" rows="2" placeholder="Describe the procurement need (optional)" /></label></div></section><section className="panel form-section"><div className="panel-head"><h2>Line Items</h2><Button type="button" secondary onClick={() => { setStep(1); }}>← Change products</Button></div>
    <div className="table-wrap"><table style={{ minWidth: 700 }}><thead><tr><th>#</th><th>Name</th><th>Qty</th><th>Vendor(s)</th><th>Due Date</th></tr></thead><tbody>{items.map((item, i) => <tr key={item.productId}><td style={{ fontWeight: 700 }}>{i + 1}</td><td><strong>{item.name}</strong><small>{item.category} · {item.unit}</small></td><td><input type="number" min="1" step="0.01" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} required style={{ width: 80 }} /></td><td>
      <div style={{ position: "relative" }}><VendorMultiSelect vendors={vendors.data} selected={item.vendorIds} onToggle={(vid) => toggleVendor(i, vid)} /></div>
    </td><td><input type="datetime-local" value={item.deadline} onChange={(e) => updateItem(i, "deadline", e.target.value)} required style={{ width: 180 }} /></td></tr>)}</tbody></table></div>
  </section><div className="form-actions"><Button type="button" secondary onClick={() => nav("/rfqs")}>Cancel</Button><Button type="submit" icon={Send} disabled={loading}>{loading ? "Submitting…" : "Submit RFQ"}</Button></div></form></>;
}

function VendorMultiSelect({ vendors, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  return <div><button type="button" className="button secondary" onClick={() => setOpen(!open)} style={{ fontSize: 11, minHeight: 30 }}>{selected.length ? `${selected.length} vendor(s)` : "Select vendors…"}</button>{open && <div style={{ position: "absolute", zIndex: 50, background: "#fff", border: "1px solid #dfe7e6", borderRadius: 5, padding: 6, maxHeight: 200, overflow: "auto", width: 260, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>{vendors.map((v) => <label key={v.id} style={{ display: "flex", gap: 8, padding: "5px 6px", fontSize: 11, cursor: "pointer", borderBottom: "1px solid #eef2f1", alignItems: "center" }}><input type="checkbox" checked={selected.includes(v.id)} onChange={() => onToggle(v.id)} /><span style={{ display: "grid" }}><strong>{v.companyName}</strong><small style={{ color: "#8fa6a5", fontWeight: 400 }}>{v.category?.name || "Uncategorized"}</small></span></label>)}<button type="button" onClick={() => setOpen(false)} style={{ width: "100%", padding: 4, fontSize: 10, border: 0, background: "#f7f9f9", cursor: "pointer", marginTop: 4 }}>Close</button></div>}</div>;
}

// ─── RFQ Detail ─────────────────────────────────────────────────────────────

function RfqDetail() {
  const { id } = useParams(); const { user } = useAuth(); const { data: r, error, reload } = useLoad(`/rfqs/${id}`); const nav = useNavigate();
  if (!r) return <ErrorBox error={error} />;
  const hasQuoted = r.quotations?.some((q) => q.vendorId === user.vendorId);
  return <><PageTitle title={r.rfqNumber} subtitle={r.title} action={<div className="actions">{user.role === "PROCUREMENT_OFFICER" && r.status === "DRAFT" && <Button icon={Send} onClick={() => action("post", `/rfqs/${id}/send`, {}, reload)}>Send RFQ</Button>}{user.role === "PROCUREMENT_OFFICER" && ["QUOTATIONS_RECEIVED", "UNDER_REVIEW", "SENT"].includes(r.status) && <Button onClick={() => nav(`/rfqs/${id}/compare`)}>Compare quotations</Button>}{user.role === "VENDOR" && ["SENT", "QUOTATIONS_RECEIVED"].includes(r.status) && !hasQuoted && <Button onClick={() => nav(`/rfqs/${id}/quote`)}>Submit quotation</Button>}</div>} /><div className="detail-grid"><section className="panel"><div className="detail-head"><Status value={r.status} /><span>Deadline {date(r.deadline)}</span></div><p>{r.description}</p><h3>Requested Items</h3><div className="table-wrap"><table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit</th><th>Due Date</th>{user.role !== "VENDOR" && <th>Vendors</th>}</tr></thead><tbody>{r.items.map((item, i) => <tr key={item.id}><td style={{ fontWeight: 700 }}>{i + 1}</td><td><strong>{item.itemName}</strong><small>{item.description}</small></td><td>{Number(item.quantity)}</td><td>{item.unit}</td><td>{date(item.deadline)}</td>{user.role !== "VENDOR" && <td>{item.itemVendors?.map((iv) => <span key={iv.id} className={`status ${statusStyle[iv.status] || "gray"}`} style={{ marginRight: 4 }}>{iv.vendor?.companyName}</span>) || "-"}</td>}</tr>)}</tbody></table></div></section><section className="panel"><h2>Summary</h2><div className="list">{r.invites?.map((invite) => <div key={invite.id}><div><strong>{invite.vendor.companyName}</strong><small>{invite.vendor.category?.name || invite.vendor.email}</small></div><Status value={invite.status} /></div>) || <p>No vendors assigned</p>}</div></section></div></>;
}

// ─── Vendor Quote Form ──────────────────────────────────────────────────────

function QuoteForm() {
  const { id } = useParams(); const { data: r, error } = useLoad(`/rfqs/${id}`); const nav = useNavigate();
  const [prices, setPrices] = useState({});
  const [deliveryDays, setDeliveryDays] = useState(7);
  if (!r) return <ErrorBox error={error} />;

  const getItemTotal = (item) => {
    const p = prices[item.id] || {};
    const qty = Number(item.quantity);
    const up = Number(p.price || 0);
    const gst = Number(p.gst ?? Number(item.product?.defaultGstPct || 18));
    const base = up * qty;
    return { base, tax: base * gst / 100, total: base + base * gst / 100, gst };
  };
  const grandTotal = r.items.reduce((sum, item) => sum + getItemTotal(item).total, 0);

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const items = r.items.map((item) => {
      const p = prices[item.id] || {};
      return { rfqItemId: item.id, unitPrice: Number(p.price || 0), gstPercent: Number(p.gst ?? Number(item.product?.defaultGstPct || 18)) };
    });
    await action("post", "/quotations", { rfqId: id, deliveryDays: Number(deliveryDays), paymentTerms: f.get("paymentTerms"), notes: f.get("notes"), items }, () => nav("/rfqs"));
  };

  return <><PageTitle title="Submit Quotation" subtitle={`${r.rfqNumber} · ${r.title}`} /><form className="form-layout" onSubmit={submit}><section className="panel form-section"><h2>Item Pricing</h2><div className="table-wrap"><table><thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price (₹)</th><th>GST %</th><th>Total</th></tr></thead><tbody>{r.items.map((item, i) => { const calc = getItemTotal(item); return <tr key={item.id}><td style={{ fontWeight: 700 }}>{i + 1}</td><td><strong>{item.itemName}</strong><small>{item.unit}</small></td><td>{Number(item.quantity)}</td><td><input type="number" min="0.01" step="0.01" required style={{ width: 110 }} onChange={(e) => setPrices({ ...prices, [item.id]: { ...prices[item.id], price: e.target.value } })} /></td><td><input type="number" min="0" max="100" step="0.01" defaultValue={Number(item.product?.defaultGstPct || 18)} style={{ width: 70 }} onChange={(e) => setPrices({ ...prices, [item.id]: { ...prices[item.id], gst: e.target.value } })} /></td><td><strong>{money(calc.total)}</strong><small>Tax: {money(calc.tax)}</small></td></tr>; })}</tbody></table></div><div style={{ textAlign: "right", padding: "12px 14px", background: "#f7f9f9", borderRadius: 5, marginTop: 8 }}><span style={{ fontSize: 12, color: "#637775" }}>Grand Total: </span><strong style={{ fontSize: 18, color: "#167d71" }}>{money(grandTotal)}</strong></div></section><section className="panel form-section"><h2>Delivery & Terms</h2><div className="fields"><label>Delivery Days<input type="number" min="1" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} required /><small style={{ color: "#718180", marginTop: 4 }}>Delivery date: {date(new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000))}</small></label><label>Payment Terms<input name="paymentTerms" placeholder="e.g. Net 30" /></label><label className="full">Notes<textarea name="notes" rows="3" /></label></div></section><div className="form-actions"><Button secondary type="button" onClick={() => nav(-1)}>Cancel</Button><Button type="submit" icon={Send}>Submit Quotation</Button></div></form></>;
}

// ─── Quotation Comparison & Best Quote ──────────────────────────────────────

function Compare() {
  const { id } = useParams(); const { data, error } = useLoad(`/rfqs/${id}/quotations/compare`);
  const [bestQuote, setBestQuote] = useState(null); const [loadingBest, setLoadingBest] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]); const [expandedItem, setExpandedItem] = useState(null);
  const nav = useNavigate();

  const fetchBestQuote = async () => {
    setLoadingBest(true);
    try {
      const { data: best } = await api.post(`/rfqs/${id}/best-quote`);
      setBestQuote(best);
      setSelectedItems(best.items.map((i) => ({ rfqItemId: i.rfqItemId, quotationItemId: i.quotationItemId })));
    } catch (e) { toast.error(e.response?.data?.message || e.message); } finally { setLoadingBest(false); }
  };

  const overrideItem = (rfqItemId, quotationItemId) => {
    setSelectedItems((prev) => prev.map((s) => s.rfqItemId === rfqItemId ? { ...s, quotationItemId } : s));
  };

  const submitSelection = async () => {
    if (!selectedItems.length) { toast.error("No items selected"); return; }
    await action("post", `/rfqs/${id}/approve-selection`, { selectedItems }, () => { toast.success("Sent for finance approval!"); nav("/approvals"); });
  };

  if (!data) return <ErrorBox error={error} />;
  const comp = data;

  return <><PageTitle title="Quotation Comparison" subtitle={`${comp.rfqNumber} · ${comp.respondedVendors} of ${comp.totalVendors} vendors responded`} /><ErrorBox error={error} /><div style={{ display: "flex", gap: 10, marginBottom: 20 }}><Button icon={Sparkles} onClick={fetchBestQuote} disabled={loadingBest}>{loadingBest ? "Calculating…" : `Get Best Quote (${comp.respondedVendors}/${comp.totalVendors} responded)`}</Button>{selectedItems.length > 0 && <Button icon={Send} onClick={submitSelection}>Approve & Send to Finance</Button>}</div>

    {bestQuote && <section className="panel" style={{ marginBottom: 20, borderLeft: "3px solid #167d71" }}><div className="panel-head"><div><h2 style={{ color: "#167d71" }}>✨ Best Quote Combination</h2><p>Cheapest option per line item — Total: <strong style={{ color: "#167d71", fontSize: 16 }}>{money(bestQuote.bestTotal)}</strong></p></div></div><div className="table-wrap"><table><thead><tr><th>#</th><th>Item</th><th>Best Vendor</th><th>Unit Price</th><th>GST %</th><th>Total</th><th>Delivery</th></tr></thead><tbody>{bestQuote.items.map((item, i) => <tr key={item.rfqItemId} style={{ background: "#e9f9f1" }}><td style={{ fontWeight: 700 }}>{i + 1}</td><td><strong>{item.itemName}</strong></td><td>{item.vendorName}</td><td>{money(item.unitPrice)}</td><td>{item.gstPercent}%</td><td><strong>{money(item.totalAmount)}</strong></td><td>{item.deliveryDays} days</td></tr>)}</tbody></table></div></section>}

    <h3>Per-Item Vendor Quotes</h3>
    {comp.items?.map((item, i) => <section className="panel" key={item.rfqItemId} style={{ marginBottom: 12 }}><div className="panel-head" style={{ cursor: "pointer" }} onClick={() => setExpandedItem(expandedItem === item.rfqItemId ? null : item.rfqItemId)}><div><h3 style={{ margin: 0 }}>#{i + 1} {item.itemName}</h3><small style={{ color: "#718180" }}>Qty: {item.quantity} {item.unit} · {item.respondedCount}/{item.vendorCount} vendors quoted</small></div><ChevronRight size={16} style={{ transform: expandedItem === item.rfqItemId ? "rotate(90deg)" : "none", transition: ".2s" }} /></div>{(expandedItem === item.rfqItemId || bestQuote) && <div className="table-wrap" style={{ marginTop: 8 }}><table><thead><tr><th>Vendor</th><th>Unit Price</th><th>GST %</th><th>Tax</th><th>Total</th><th>Delivery</th><th></th></tr></thead><tbody>{item.quotes.map((q) => { const isSelected = selectedItems.some((s) => s.rfqItemId === item.rfqItemId && s.quotationItemId === q.quotationItemId); return <tr key={q.quotationItemId} style={{ background: q.isLowest ? "#e9f9f1" : isSelected ? "#eaf3fb" : "#fff" }}><td><strong>{q.vendorName}</strong><small style={{ color: "#8fa6a5" }}>{q.vendorCategory}</small></td><td>{money(q.unitPrice)}</td><td>{q.gstPercent}%</td><td>{money(q.taxAmount)}</td><td><strong style={{ color: q.isLowest ? "#167d71" : "#172033" }}>{money(q.totalAmount)}</strong>{q.isLowest && <small style={{ color: "#167d71" }}> ★ Lowest</small>}</td><td>{q.deliveryDays} days</td><td>{selectedItems.length > 0 && <Button secondary style={{ fontSize: 10, padding: "3px 6px", minHeight: 24 }} onClick={() => overrideItem(item.rfqItemId, q.quotationItemId)}>{isSelected ? "✓ Selected" : "Select"}</Button>}</td></tr>; })}</tbody></table></div>}</section>)}
  </>;
}

// ─── Approvals ──────────────────────────────────────────────────────────────

function Approvals() {
  const { user } = useAuth(); const { data, error, reload } = useList("/approvals"); const nav = useNavigate();
  return <><PageTitle title="Approval Requests" subtitle="Finance review queue and procurement decisions." /><ErrorBox error={error} /><Table headers={["RFQ", "Requested By", "Items", "Total", "Status", "Remarks", "Actions"]} empty={!data.length}>{data.map((a) => {
    const items = a.selectedItems || [];
    const total = items.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    return <tr key={a.id}><td><strong>{a.rfq?.rfqNumber}</strong><small>{a.rfq?.title}</small></td><td>{a.requester?.name}</td><td>{items.length}</td><td>{money(total)}</td><td><Status value={a.status} /></td><td>{a.remarks || "-"}</td><td><div className="actions"><Button secondary onClick={() => nav(`/approvals/${a.id}`)}>View</Button>{user.role === "FINANCE_OFFICER" && a.status === "PENDING" && <><Button icon={Check} onClick={() => action("put", `/approvals/${a.id}/approve`, { remarks: "Approved" }, reload)}>Approve</Button><Button danger icon={X} onClick={() => action("put", `/approvals/${a.id}/reject`, { remarks: "Rejected" }, reload)}>Reject</Button></>}{user.role === "PROCUREMENT_OFFICER" && a.status === "APPROVED" && <Button onClick={() => action("post", "/purchase-orders/generate", { approvalId: a.id }, reload)}>Generate PO</Button>}</div></td></tr>;
  })}</Table></>;
}

function ApprovalDetail() {
  const { id } = useParams(); const { user } = useAuth(); const { data: a, error, reload } = useLoad(`/approvals/${id}`);
  const [expandedItem, setExpandedItem] = useState(null); const [overrides, setOverrides] = useState([]);
  const nav = useNavigate();

  if (!a) return <ErrorBox error={error} />;
  const items = a.selectedItems || [];
  const total = items.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const rfq = a.rfq;

  const overrideItem = (rfqItemId, quotationItemId) => {
    setOverrides((prev) => { const existing = prev.find((o) => o.rfqItemId === rfqItemId); if (existing) return prev.map((o) => o.rfqItemId === rfqItemId ? { ...o, quotationItemId } : o); return [...prev, { rfqItemId, quotationItemId }]; });
  };

  const approveWithOverrides = () => {
    const payload = overrides.length ? { selectedItems: overrides, remarks: "Approved with modifications" } : { remarks: "Approved" };
    action("put", `/approvals/${id}/approve`, payload, () => { toast.success("Approved!"); reload(); });
  };

  return <><PageTitle title={`Approval: ${rfq?.rfqNumber}`} subtitle={rfq?.title} action={<div className="actions">{user.role === "FINANCE_OFFICER" && a.status === "PENDING" && <><Button icon={Check} onClick={approveWithOverrides}>Approve{overrides.length ? " (Modified)" : ""}</Button><Button danger icon={X} onClick={() => action("put", `/approvals/${id}/reject`, { remarks: "Rejected" }, reload)}>Reject</Button></>}{user.role === "PROCUREMENT_OFFICER" && a.status === "APPROVED" && <Button onClick={() => action("post", "/purchase-orders/generate", { approvalId: a.id }, () => nav("/purchase-orders"))}>Generate PO</Button>}</div>} /><ErrorBox error={error} /><div className="detail-grid"><section className="panel"><h2>Selected Items</h2><div style={{ textAlign: "right", marginBottom: 12 }}><span style={{ fontSize: 12, color: "#637775" }}>Total: </span><strong style={{ fontSize: 18, color: "#167d71" }}>{money(total)}</strong></div><div className="table-wrap"><table><thead><tr><th>#</th><th>Item</th><th>Vendor</th><th>Unit Price</th><th>GST</th><th>Total</th></tr></thead><tbody>{items.map((item, i) => <tr key={i} style={{ cursor: "pointer" }} onClick={() => setExpandedItem(expandedItem === item.rfqItemId ? null : item.rfqItemId)}><td style={{ fontWeight: 700 }}>{i + 1}</td><td>{item.itemName}</td><td>{item.vendorName}</td><td>{money(item.unitPrice)}</td><td>{item.gstPercent}%</td><td><strong>{money(item.totalAmount)}</strong></td></tr>)}</tbody></table></div>

    {expandedItem && rfq?.quotations && <div className="panel" style={{ marginTop: 12, background: "#f7f9f9" }}><h3>All Quotes for: {items.find((i) => i.rfqItemId === expandedItem)?.itemName}</h3><div className="table-wrap"><table><thead><tr><th>Vendor</th><th>Unit Price</th><th>GST</th><th>Total</th><th></th></tr></thead><tbody>{rfq.quotations.flatMap((q) => q.items.filter((qi) => qi.rfqItemId === expandedItem).map((qi) => { const isLowest = rfq.quotations.flatMap((qq) => qq.items.filter((qqi) => qqi.rfqItemId === expandedItem)).every((c) => Number(qi.totalAmount) <= Number(c.totalAmount)); const isOverridden = overrides.some((o) => o.rfqItemId === expandedItem && o.quotationItemId === qi.id); return <tr key={qi.id} style={{ background: isLowest ? "#e9f9f1" : isOverridden ? "#eaf3fb" : "#fff" }}><td><strong>{q.vendor?.companyName}</strong></td><td>{money(qi.unitPrice)}</td><td>{Number(qi.gstPercent || qi.taxPercentage)}%</td><td><strong style={{ color: isLowest ? "#167d71" : "#172033" }}>{money(qi.totalAmount)}</strong>{isLowest && <small style={{ color: "#167d71" }}> ★ Lowest</small>}</td><td>{user.role === "FINANCE_OFFICER" && a.status === "PENDING" && <Button secondary style={{ fontSize: 10, padding: "3px 6px", minHeight: 24 }} onClick={(e) => { e.stopPropagation(); overrideItem(expandedItem, qi.id); }}>{isOverridden ? "✓ Selected" : "Override"}</Button>}</td></tr>; }))}</tbody></table></div></div>}
  </section><section className="panel"><h2>Approval Info</h2><div className="list"><div><span>Status</span><Status value={a.status} /></div><div><span>Requested by</span><strong>{a.requester?.name}</strong></div>{a.reviewer && <div><span>Reviewed by</span><strong>{a.reviewer?.name}</strong></div>}{a.remarks && <div><span>Remarks</span><span>{a.remarks}</span></div>}<div><span>Created</span><span>{date(a.createdAt)}</span></div></div></section></div></>;
}

// ─── Purchase Orders with Delivery Tracking ─────────────────────────────────

const deliverySteps = ["PENDING", "SHIPPED", "ON_THE_WAY", "DELIVERED", "RECEIVED"];

function PurchaseOrders() {
  const { user } = useAuth(); const { data, error, reload } = useList("/purchase-orders"); const nav = useNavigate();
  const download = async (id) => { const r = await api.get(`/purchase-orders/${id}/pdf`, { responseType: "blob" }); window.open(URL.createObjectURL(r.data)); };

  const getNextVendorStatus = (po) => {
    const ds = po.deliveryStatus || "PENDING";
    if (ds === "PENDING") return "SHIPPED";
    if (ds === "SHIPPED") return "ON_THE_WAY";
    if (ds === "ON_THE_WAY") return "DELIVERED";
    return null;
  };

  return <><PageTitle title="Purchase Orders" subtitle="Approved commitments and delivery progress." /><ErrorBox error={error} /><Table headers={["PO #", "Vendor", "RFQ", "Items", "Value", "Created", "Status", "Delivery", "Actions"]} empty={!data.length}>{data.map((p) => { const nextVs = getNextVendorStatus(p); return <tr key={p.id}><td className="mono">{p.poNumber}</td><td>{p.vendor?.companyName}</td><td className="mono">{p.rfq?.rfqNumber}</td><td>{p.items?.length || 0}</td><td>{money(p.grandTotal)}</td><td>{date(p.createdAt)}</td><td><Status value={p.status} /></td><td><Status value={p.deliveryStatus || "PENDING"} /></td><td><div className="actions"><Button secondary onClick={() => download(p.id)}>PDF</Button><Button secondary onClick={() => nav(`/purchase-orders/${p.id}`)}>View</Button>{user.role === "VENDOR" && nextVs && <Button icon={Truck} onClick={() => action("put", `/purchase-orders/${p.id}/status`, { status: nextVs }, reload)}>Mark {titleCase(nextVs)}</Button>}{user.role === "PROCUREMENT_OFFICER" && p.deliveryStatus === "DELIVERED" && <Button icon={Check} onClick={() => action("put", `/purchase-orders/${p.id}/status`, { status: "RECEIVED" }, reload)}>Mark Received</Button>}</div></td></tr>; })}</Table></>;
}

function PoDetail() {
  const { id } = useParams(); const { user } = useAuth(); const { data: po, error, reload } = useLoad(`/purchase-orders/${id}`);
  if (!po) return <ErrorBox error={error} />;
  const currentStep = deliverySteps.indexOf(po.deliveryStatus || "PENDING");

  return <><PageTitle title={po.poNumber} subtitle={`Purchase order for ${po.vendor?.companyName}`} /><ErrorBox error={error} /><section className="panel" style={{ marginBottom: 20 }}><h3 style={{ marginBottom: 12 }}>Delivery Progress</h3><div style={{ display: "flex", gap: 0, alignItems: "center" }}>{deliverySteps.map((step, i) => <div key={step} style={{ flex: 1, textAlign: "center" }}><div style={{ width: 28, height: 28, borderRadius: "50%", margin: "0 auto 6px", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, background: i <= currentStep ? "#167d71" : "#e4ebea", color: i <= currentStep ? "#fff" : "#748582" }}>{i < currentStep ? "✓" : i + 1}</div><small style={{ fontSize: 9, color: i <= currentStep ? "#167d71" : "#748582" }}>{titleCase(step)}</small>{i < deliverySteps.length - 1 && <div style={{ height: 2, background: i < currentStep ? "#167d71" : "#e4ebea", margin: "0 -8px" }} />}</div>)}</div></section><div className="detail-grid"><section className="panel"><h2>Items</h2><div className="table-wrap"><table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit Price</th><th>GST %</th><th>Tax</th><th>Total</th></tr></thead><tbody>{po.items?.map((item, i) => <tr key={item.id}><td style={{ fontWeight: 700 }}>{i + 1}</td><td>{item.itemName}</td><td>{Number(item.quantity)}</td><td>{money(item.unitPrice)}</td><td>{Number(item.gstPercent || 18)}%</td><td>{money(item.taxAmount)}</td><td><strong>{money(item.totalAmount)}</strong></td></tr>)}</tbody></table></div><div style={{ textAlign: "right", marginTop: 12 }}><p>Subtotal: {money(po.subtotal)} · Tax: {money(po.taxAmount)}</p><strong style={{ fontSize: 18, color: "#167d71" }}>{money(po.grandTotal)}</strong></div></section><section className="panel"><h2>Details</h2><div className="list"><div><span>Status</span><Status value={po.status} /></div><div><span>Delivery</span><Status value={po.deliveryStatus || "PENDING"} /></div><div><span>Vendor</span><strong>{po.vendor?.companyName}</strong></div><div><span>Created</span><span>{date(po.createdAt)}</span></div></div>{user.role === "VENDOR" && po.deliveryStatus !== "DELIVERED" && po.deliveryStatus !== "RECEIVED" && <Button icon={Truck} style={{ marginTop: 12, width: "100%" }} onClick={() => { const next = po.deliveryStatus === "PENDING" ? "SHIPPED" : po.deliveryStatus === "SHIPPED" ? "ON_THE_WAY" : "DELIVERED"; action("put", `/purchase-orders/${po.id}/status`, { status: next }, reload); }}>Mark {titleCase(po.deliveryStatus === "PENDING" ? "SHIPPED" : po.deliveryStatus === "SHIPPED" ? "ON_THE_WAY" : "DELIVERED")}</Button>}{user.role === "PROCUREMENT_OFFICER" && po.deliveryStatus === "DELIVERED" && <Button icon={Check} style={{ marginTop: 12, width: "100%" }} onClick={() => action("put", `/purchase-orders/${po.id}/status`, { status: "RECEIVED" }, reload)}>Mark Received (Auto-generates Invoice)</Button>}</section></div></>;
}

// ─── Invoices ───────────────────────────────────────────────────────────────

function Invoices() {
  const { user } = useAuth(); const { data, error, reload } = useList("/invoices");
  return <><PageTitle title="Invoices" subtitle="Generated documents and payment tracking." /><ErrorBox error={error} /><Table headers={["Invoice", "Vendor", "PO", "Due Date", "Value", "Payment", "Actions"]} empty={!data.length}>{data.map((i) => <tr key={i.id}><td className="mono">{i.invoiceNumber}</td><td>{i.vendor?.companyName}</td><td className="mono">{i.purchaseOrder?.poNumber}</td><td>{date(i.dueDate)}</td><td>{money(i.grandTotal)}</td><td><Status value={i.paymentStatus} /></td><td><div className="actions"><Button secondary onClick={async () => { const r = await api.get(`/invoices/${i.id}/pdf`, { responseType: "blob" }); window.open(URL.createObjectURL(r.data)); }}>PDF</Button>{user.role === "FINANCE_OFFICER" && i.paymentStatus !== "PAID" && <Button onClick={() => action("put", `/invoices/${i.id}/payment-status`, { paymentStatus: "PAID" }, reload)}>Mark paid</Button>}</div></td></tr>)}</Table></>;
}

// ─── Shared Pages ───────────────────────────────────────────────────────────

function Vendors() {
  const { user } = useAuth();
  const { data, error, reload } = useList("/vendors"); const categories = useList("/vendor-categories"); const [show, setShow] = useState(false); const [selected, setSelected] = useState(null);
  useEffect(() => { if (!selected) return; const fresh = data.find((v) => v.id === selected.id); if (fresh) setSelected(fresh); }, [data]);
  const create = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); await action("post", "/vendors", f, () => { setShow(false); reload(); }); };
  const update = async (e) => { e.preventDefault(); const payload = Object.fromEntries(new FormData(e.currentTarget)); const updated = await action("put", `/vendors/${selected.id}`, payload); if (updated) { setSelected(null); reload(); } };
  const deactivate = async () => { if (!selected || !confirm(`Deactivate ${selected.companyName}?`)) return; const updated = await action("delete", `/vendors/${selected.id}`, {}); if (updated) { setSelected((cur) => ({ ...cur, ...updated })); reload(); } };
  const isAdmin = user.role === "ADMIN";
  return <><PageTitle title="Vendors" subtitle="Supplier master data, category, rating, and status." action={isAdmin && <Button icon={Plus} onClick={() => { setShow(true); setSelected(null); }}>Add vendor</Button>} /><ErrorBox error={error} />{show && <section className="panel inline-form"><div className="panel-head"><h2>Add vendor</h2><button onClick={() => setShow(false)}><X size={18} /></button></div><form onSubmit={create} className="fields"><label>Company name<input name="companyName" required maxLength="160" /></label><label>Contact person<input name="contactPerson" maxLength="120" /></label><label>Email<input name="email" type="email" required /></label><label>Phone<input name="phone" type="tel" maxLength="15" /></label><label>Category<select name="categoryId"><option value="">No category</option>{categories.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>GST number<input name="gstNumber" maxLength="40" /></label><label className="full">Address<textarea name="address" rows="2" maxLength="500" /></label><label>Initial password<input name="password" type="password" minLength="8" required /></label><div className="form-actions"><Button type="submit">Create vendor</Button></div></form></section>}{isAdmin && selected && <section className="panel inline-form"><div className="panel-head"><div><h2>Edit vendor</h2><p>{selected.email}</p></div><button onClick={() => setSelected(null)}><X size={18} /></button></div><form key={selected.id} onSubmit={update} className="fields"><label>Company name<input name="companyName" defaultValue={selected.companyName} required maxLength="160" /></label><label>Contact person<input name="contactPerson" defaultValue={selected.contactPerson || ""} maxLength="120" /></label><label>Email<input name="email" type="email" defaultValue={selected.email} required /></label><label>Phone<input name="phone" type="tel" defaultValue={selected.phone || ""} maxLength="15" /></label><label>Category<select name="categoryId" defaultValue={selected.categoryId || ""}><option value="">No category</option>{categories.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>GST number<input name="gstNumber" defaultValue={selected.gstNumber || ""} maxLength="40" /></label><label>Status<select name="status" defaultValue={selected.status}>{["ACTIVE", "INACTIVE", "BLACKLISTED", "UNDER_REVIEW"].map((s) => <option key={s}>{s}</option>)}</select></label><label className="full">Address<textarea name="address" rows="2" defaultValue={selected.address || ""} maxLength="500" /></label><div className="form-actions full"><Button type="button" danger icon={Trash2} onClick={deactivate}>Deactivate vendor</Button><Button type="submit">Save changes</Button></div></form></section>}<Table headers={["Company", "Category", "Contact", "GST", "Rating", "Status", ...(isAdmin ? ["Actions"] : [])]} empty={!data.length}>{data.map((v) => <tr key={v.id} className={isAdmin ? `user-row ${selected?.id === v.id ? "selected-row" : ""}` : ""} onClick={() => { if (isAdmin) { setSelected(v); setShow(false); } }}><td><strong>{v.companyName}</strong><small>{v.email}</small></td><td>{v.category?.name || "-"}</td><td>{v.contactPerson || "-"}<small>{v.phone}</small></td><td>{v.gstNumber || "-"}</td><td>{v.rating} / 5</td><td><Status value={v.status} /></td>{isAdmin && <td><Button secondary type="button" onClick={(e) => { e.stopPropagation(); setSelected(v); setShow(false); }}>Edit</Button></td>}</tr>)}</Table></>;
}
function EmployeesPage() {
  const { data, error, reload } = useList("/users"); const [show, setShow] = useState(false); const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (!selected) return;
    const fresh = data.find((user) => user.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [data]);
  const create = async (e) => { e.preventDefault(); await action("post", "/users", Object.fromEntries(new FormData(e.currentTarget)), () => { setShow(false); reload(); }); };
  const update = async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    if (!payload.password) delete payload.password;
    const updated = await action("put", `/users/${selected.id}`, payload);
    if (updated) { setSelected(null); reload(); }
  };
  const remove = async () => {
    if (!selected || !confirm(`Deactivate ${selected.name}?`)) return;
    const updated = await action("delete", `/users/${selected.id}`, {});
    if (updated) { setSelected((current) => ({ ...current, ...updated })); reload(); }
  };
  return <><PageTitle title="Employees" subtitle="Internal account access for managers and procurement officers." action={<Button icon={Plus} onClick={() => { setShow(true); setSelected(null); }}>Add employee</Button>} /><ErrorBox error={error} />{show && <section className="panel inline-form"><div className="panel-head"><h2>Add employee</h2><button onClick={() => setShow(false)}><X size={18} /></button></div><form onSubmit={create} className="fields"><label>Name<input name="name" required maxLength="120" /></label><label>Email<input name="email" type="email" required /></label><label>Phone<input name="phone" type="tel" maxLength="15" /></label><label>Role<select name="role" required>{employeeRoles.map((r) => <option key={r} value={r}>{roles[r]}</option>)}</select></label><label>Status<select name="status" defaultValue="ACTIVE" required>{["ACTIVE", "INACTIVE"].map((s) => <option key={s}>{s}</option>)}</select></label><label>Password<input name="password" type="password" minLength="8" maxLength="128" required /></label><div className="form-actions"><Button type="submit">Create employee</Button></div></form></section>}{selected && <section className="panel inline-form"><div className="panel-head"><div><h2>Edit employee</h2><p>{selected.email}</p></div><button onClick={() => setSelected(null)}><X size={18} /></button></div><form key={selected.id} onSubmit={update} className="fields"><label>Name<input name="name" defaultValue={selected.name} required maxLength="120" /></label><label>Email<input name="email" type="email" defaultValue={selected.email} required /></label><label>Phone<input name="phone" type="tel" maxLength="15" defaultValue={selected.phone || ""} /></label><label>Role<select name="role" defaultValue={employeeRoles.includes(selected.role) ? selected.role : "PROCUREMENT_OFFICER"} required>{employeeRoles.map((r) => <option key={r} value={r}>{roles[r]}</option>)}</select></label><label>Status<select name="status" defaultValue={selected.status} required>{["ACTIVE", "INACTIVE"].map((s) => <option key={s}>{s}</option>)}</select></label><label>New password<input name="password" type="password" minLength="8" maxLength="128" placeholder="Leave blank to keep current" /></label><div className="form-actions full"><Button type="button" danger icon={Trash2} onClick={remove}>Deactivate employee</Button><Button type="submit">Save changes</Button></div></form></section>}<Table headers={["Name", "Email", "Role", "Status", "Created", "Actions"]} empty={!data.length}>{data.map((u) => <tr key={u.id} className={`user-row ${selected?.id === u.id ? "selected-row" : ""}`} onClick={() => { setSelected(u); setShow(false); }}><td><strong>{u.name}</strong><small>Click to edit</small></td><td>{u.email}</td><td>{roles[u.role]}</td><td><Status value={u.status} /></td><td>{date(u.createdAt)}</td><td><Button secondary type="button" onClick={(e) => { e.stopPropagation(); setSelected(u); setShow(false); }}>Edit</Button></td></tr>)}</Table></>;
}
function Reports() {
  const vendors = useLoad("/reports/vendor-performance"); const rfqs = useLoad("/reports/rfq-summary");
  return <><PageTitle title="Reports & Analytics" subtitle="Procurement health, supplier performance, and export." action={<Button onClick={async () => { const r = await api.get("/reports/export/procurement-summary", { responseType: "blob" }); const a = document.createElement("a"); a.href = URL.createObjectURL(r.data); a.download = "procurement-summary.csv"; a.click(); }}>Export CSV</Button>} /><div className="detail-grid"><section className="panel"><h2>Vendor Performance</h2><div className="list">{vendors.data?.map((v) => <div key={v.id}><div><strong>{v.companyName}</strong><small>{v._count.purchaseOrders} purchase orders · {v._count.quotations} quotes</small></div><strong>{v.rating}/5</strong></div>)}</div></section><section className="panel"><h2>RFQ Status Summary</h2><div className="list">{rfqs.data?.map((r) => <div key={r.status}><Status value={r.status} /><strong>{r._count.status}</strong></div>)}</div></section></div></>;
}
function Activity() { const { data, error } = useList("/activity-logs"); return <><PageTitle title="Activity Logs" subtitle="Audit trail for major procurement actions." /><ErrorBox error={error} /><Table headers={["Action", "Description", "User", "Entity", "Time"]} empty={!data.length}>{data.map((l) => <tr key={l.id}><td className="mono">{l.action}</td><td>{l.description}</td><td>{l.user?.name || "System"}</td><td>{titleCase(l.entityType)}</td><td>{date(l.createdAt)}</td></tr>)}</Table></>; }
function Notifications() { const { data, error, reload } = useList("/notifications"); return <><PageTitle title="Notifications" subtitle="Updates relevant to your role and workflow." action={<Button secondary onClick={() => action("put", "/notifications/read-all", {}, reload)}>Mark all read</Button>} /><ErrorBox error={error} /><div className="notifications">{data.map((n) => <button className={n.isRead ? "" : "unread"} key={n.id} onClick={() => action("put", `/notifications/${n.id}/read`, {}, reload)}><Bell size={17} /><div><strong>{n.title}</strong><p>{n.message}</p><small>{date(n.createdAt)}</small></div></button>)}</div>{!data.length && <Empty />}</>; }

// ─── Reset Requests (Admin) ─────────────────────────────────────────────────

function ResetRequests() {
  const { data, error, reload } = useList("/password-reset-requests");
  const [approvingId, setApprovingId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const pending = data.filter((r) => r.status === "PENDING");
  const resolved = data.filter((r) => r.status !== "PENDING");
  const approveWithPassword = async (id) => {
    if (!newPassword || newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    await action("put", `/password-reset-requests/${id}`, { action: "approve", password: newPassword }, () => { setApprovingId(null); setNewPassword(""); reload(); });
  };
  return <><PageTitle title="Password Reset Requests" subtitle="Review and resolve user password reset requests." /><ErrorBox error={error} />{pending.length > 0 && <section className="panel" style={{ marginBottom: 16 }}><h2 style={{ marginBottom: 12 }}>Pending Requests ({pending.length})</h2>{pending.map((r) => <div key={r.id} style={{ padding: "12px 0", borderBottom: "1px solid #e7edec" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><strong>{r.user?.name}</strong><small style={{ display: "block", color: "#748582", fontSize: 11 }}>{r.user?.email} · {roles[r.user?.role]} · {date(r.createdAt)}</small>{r.message && <small style={{ display: "block", color: "#536765", marginTop: 4, fontStyle: "italic" }}>"{r.message}"</small>}</div><div className="actions">{approvingId !== r.id ? <><Button onClick={() => { setApprovingId(r.id); setNewPassword(""); }}>Reset & Email</Button><Button secondary danger onClick={() => action("put", `/password-reset-requests/${r.id}`, { action: "reject" }, reload)}>Reject</Button></> : <Button secondary onClick={() => setApprovingId(null)}>Cancel</Button>}</div></div>{approvingId === r.id && <div style={{ marginTop: 10, padding: "12px 14px", background: "#f7f9f9", borderRadius: 5, display: "flex", gap: 10, alignItems: "end" }}><label style={{ flex: 1 }}>New password for {r.user?.name}<input type="text" placeholder="Min 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus style={{ marginTop: 6 }} /></label><Button onClick={() => approveWithPassword(r.id)} disabled={newPassword.length < 8}>Confirm & Email Password</Button></div>}</div>)}</section>}{resolved.length > 0 && <Table headers={["User", "Status", "Requested", "Resolved"]} empty={false}>{resolved.map((r) => <tr key={r.id}><td><strong>{r.user?.name}</strong><small>{r.user?.email}</small></td><td><Status value={r.status} /></td><td>{date(r.createdAt)}</td><td>{r.resolvedAt ? date(r.resolvedAt) : "-"}</td></tr>)}</Table>}{!data.length && <Empty />}</>;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/rfqs" element={<RfqList />} />
    <Route path="/rfqs/create" element={user.role === "PROCUREMENT_OFFICER" ? <CreateRfq /> : <Navigate to="/rfqs" />} />
    <Route path="/rfqs/:id" element={<RfqDetail />} />
    <Route path="/rfqs/:id/quote" element={user.role === "VENDOR" ? <QuoteForm /> : <Navigate to="/rfqs" />} />
    <Route path="/rfqs/:id/compare" element={<Compare />} />
    <Route path="/approvals" element={<Approvals />} />
    <Route path="/approvals/:id" element={<ApprovalDetail />} />
    <Route path="/purchase-orders" element={<PurchaseOrders />} />
    <Route path="/purchase-orders/:id" element={<PoDetail />} />
    <Route path="/invoices" element={<Invoices />} />
    <Route path="/vendors" element={<Vendors />} />
    <Route path="/users" element={<EmployeesPage />} />
    <Route path="/requests" element={user.role === "ADMIN" ? <ResetRequests /> : <Navigate to="/dashboard" />} />
    <Route path="/products" element={<Products />} />
    <Route path="/vendor-categories" element={<VendorCategories />} />
    <Route path="/reports" element={<Reports />} />
    <Route path="/activity-logs" element={<Activity />} />
    <Route path="/notifications" element={<Notifications />} />
    <Route path="*" element={<Navigate to="/dashboard" />} />
  </Routes>;
}
export default function App() { const { user } = useAuth(); return user ? <Shell /> : <Routes><Route path="*" element={<Login />} /></Routes>; }

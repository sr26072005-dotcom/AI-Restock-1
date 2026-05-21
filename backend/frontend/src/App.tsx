import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Box,
  CheckSquare,
  Square,
  User,
  Lock,
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  Bell,
  Info,
  Store,
  Package,
  Plus,
  LogOut,
} from 'lucide-react';

import { clsx } from 'clsx';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type Step = 1 | 2 | 3 | 4;
type View = 'dashboard' | 'audit' | 'shops' | 'products' | 'history';

interface AuditData {
  shop_id: string;
  shop_name: string;
  region: string;
  product: string;
  billing_count: number;
  vision_count: number;
  variance: number;
  status: string;
  proof_url: string;
  payment_method: string;
  min_threshold: number;
  restock_qty: number;
  manager_email: string;
  selected: boolean;
}

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [currentStep, setCurrentStep] = useState<Step>(1);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [region, setRegion] = useState('Chennai South');
  const [product, setProduct] = useState('Dove Soap');

  const [auditResults, setAuditResults] = useState<AuditData[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [shopsList, setShopsList] = useState<any[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [syncingHistory, setSyncingHistory] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const regions = ['Chennai South', 'Chennai North'];

  const [newShop, setNewShop] = useState({
    shop_name: '',
    region: 'Chennai South',
    product: 'Dove Soap',
    billing_count: 50,
    min_threshold: 10,
    shelf_image_name: 'test_shelf.jpg',
    manager_email: '',
    default_restock_qty: 30,
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Personal Care',
    detection_id: 39,
    sku: '',
    base_price: 0,
  });

  useEffect(() => {
    if (isLoggedIn) {
      fetchHistory();
      fetchShops();
      fetchProducts();
    }
  }, [isLoggedIn]);

  const fetchShops = async () => {
    console.log(`Fetching shops from ${API_BASE}/shops...`);
    try {
      const res = await fetch(`${API_BASE}/shops`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      console.log('Shops fetched successfully:', data);
      setShopsList(data);
    } catch (err) {
      console.error('Failed to fetch shops:', err);
      alert('Could not connect to backend to fetch shops. Is the Flask server running?');
    }
  };

  const fetchProducts = async () => {
    console.log(`Fetching products from ${API_BASE}/products...`);
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      console.log('Products fetched successfully:', data);
      setProductsCatalog(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchHistory = async () => {
    console.log(`Fetching history from ${API_BASE}/history...`);
    setSyncingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/history`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      console.log('History fetched successfully:', data);
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setSyncingHistory(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Attempting login...');
    if (loginEmail === 'Admin' && loginPassword === 'admin123') {
      setIsLoggedIn(true);
    } else {
      alert('Invalid credentials');
    }
  };

  const startAudit = async () => {
    console.log(`Starting audit for ${region} - ${product}...`);
    setCurrentStep(2);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, product }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log('Audit results received:', data);
      setAuditResults(data.results || []);
      setCurrentStep(3);
    } catch (err: any) {
      console.error('Audit failed:', err);
      alert(`Audit failed: ${err.message}`);
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  const finalizeAudit = async () => {
    const selectedShops = auditResults.filter((a) => a.selected);
    if (!selectedShops.length) {
      alert('Select at least one shop');
      return;
    }
    console.log('Finalizing audit for shops:', selectedShops);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_data: selectedShops }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      console.log('Audit finalized successfully');
      setCurrentStep(4);
      fetchHistory();
    } catch (err) {
      console.error('Finalization failed:', err);
      alert('Failed to finalize audit.');
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (index: number, field: keyof AuditData, value: any) => {
    const updated = [...auditResults];
    updated[index] = { ...updated[index], [field]: value };
    setAuditResults(updated);
  };

  const addShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShop),
      });
      fetchShops();
      setShowForm(false);
      setNewShop({
        shop_name: '',
        region: 'Chennai South',
        product: 'Dove Soap',
        billing_count: 50,
        min_threshold: 10,
        shelf_image_name: 'test_shelf.jpg',
        manager_email: '',
        default_restock_qty: 30,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      fetchProducts();
      setShowForm(false);
      setNewProduct({
        name: '',
        category: 'Personal Care',
        detection_id: 39,
        sku: '',
        base_price: 0,
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-10">
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-3 rounded-xl text-white">
              <Box />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AuditAI</h1>
              <p className="text-slate-500 text-sm">Inventory Intelligence</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm font-semibold block mb-2">Username</label>
              <div className="border rounded-xl px-4 py-3 flex items-center gap-2">
                <User size={18} />
                <input
                  className="outline-none w-full"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Admin"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Password</label>
              <div className="border rounded-xl px-4 py-3 flex items-center gap-2">
                <Lock size={18} />
                <input
                  type="password"
                  className="outline-none w-full"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="admin123"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition"
            >
              Login <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-72 bg-slate-950 text-white p-6 flex flex-col fixed h-full">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Box size={22} />
          </div>
          <h2 className="text-2xl font-bold">AuditAI</h2>
        </div>
        <div className="space-y-2 flex-1">
          <button
            onClick={() => { setView('dashboard'); setShowForm(false); }}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition',
              view === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800'
            )}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button
            onClick={() => { setView('audit'); setShowForm(false); }}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition',
              view === 'audit' ? 'bg-blue-600' : 'hover:bg-slate-800'
            )}
          >
            <ClipboardList size={18} /> Run Audit
          </button>
          <button
            onClick={() => { setView('shops'); setShowForm(false); }}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition',
              view === 'shops' ? 'bg-blue-600' : 'hover:bg-slate-800'
            )}
          >
            <Store size={18} /> Shops
          </button>
          <button
            onClick={() => { setView('products'); setShowForm(false); }}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition',
              view === 'products' ? 'bg-blue-600' : 'hover:bg-slate-800'
            )}
          >
            <Package size={18} /> Products
          </button>
          <button
            onClick={() => { setView('history'); setShowForm(false); }}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition',
              view === 'history' ? 'bg-blue-600' : 'hover:bg-slate-800'
            )}
          >
            <TrendingUp size={18} /> History
          </button>
        </div>
        <button
          onClick={() => setIsLoggedIn(false)}
          className="mt-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 transition rounded-xl py-3 font-semibold"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <main className="flex-1 p-8 ml-72">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {view.charAt(0).toUpperCase() + view.slice(1)} Management
            </h1>
            <p className="text-slate-500 mt-1">AI-powered inventory auditing.</p>
          </div>
          <button
            onClick={fetchHistory}
            className="bg-white border px-5 py-3 rounded-xl flex items-center gap-2 font-semibold shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw size={18} className={clsx(syncingHistory && 'animate-spin')} />
            Refresh Data
          </button>
        </div>

        {view === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <ShoppingBag className="text-blue-600" />
                  <span className="font-semibold text-slate-500">Total Audits</span>
                </div>
                <h2 className="text-3xl font-bold">{history.length}</h2>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="text-red-500" />
                  <span className="font-semibold text-slate-500">Phantom Stock</span>
                </div>
                <h2 className="text-3xl font-bold">{history.filter(h => h.status === 'Phantom Stock').length}</h2>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="text-green-600" />
                  <span className="font-semibold text-slate-500">Healthy Stock</span>
                </div>
                <h2 className="text-3xl font-bold">{history.filter(h => h.status === 'Healthy' || h.status === 'Stock Full').length}</h2>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <Bell className="text-orange-500" />
                  <span className="font-semibold text-slate-500">Restock Needed</span>
                </div>
                <h2 className="text-3xl font-bold">{history.filter(h => h.status === 'Need Stock').length}</h2>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Recent Audit Trends</h3>
                <Info size={18} className="text-slate-400" />
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={[...history].reverse().slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="shop_name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="vision_count" stroke="#2563eb" fill="#93c5fd" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="billing_count" stroke="#94a3b8" fill="#e2e8f0" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {view === 'audit' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Regional Vision Sweep</h2>
              <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-bold text-sm">
                Step {currentStep} / 4
              </div>
            </div>
            {currentStep === 1 && (
              <div className="max-w-xl space-y-6">
                <div>
                  <label className="block mb-2 font-semibold">Target Region</label>
                  <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
                    {regions.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 font-semibold">Product Category</label>
                  <select value={product} onChange={(e) => setProduct(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
                    {productsCatalog.map((p) => <option key={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <button onClick={startAudit} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">
                  Launch AI Scan
                </button>
              </div>
            )}
            {currentStep === 2 && (
              <div className="text-center py-20">
                <RefreshCw className="animate-spin mx-auto mb-6 text-blue-600" size={64} />
                <h3 className="text-2xl font-bold mb-2">Analyzing Shelf Infrastructure</h3>
                <p className="text-slate-500">YOLOv8 vision models are validating stock levels in {region}.</p>
              </div>
            )}
            {currentStep === 3 && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-slate-500 text-sm">
                        <th className="text-left py-4">Action</th>
                        <th className="text-left py-4">Shop Name</th>
                        <th className="text-left py-4">AI Status</th>
                        <th className="text-left py-4">Vision Count</th>
                        <th className="text-left py-4">Restock Qty</th>
                        <th className="text-left py-4">Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditResults.map((entry, i) => (
                        <tr key={i} className={clsx("border-b hover:bg-slate-50 transition", entry.selected && "bg-blue-50/50")}>
                          <td className="py-4">
                            <button onClick={() => updateEntry(i, 'selected', !entry.selected)}>
                              {entry.selected ? <CheckSquare className="text-blue-600" /> : <Square className="text-slate-400" />}
                            </button>
                          </td>
                          <td className="py-4 font-bold text-slate-700">{entry.shop_name}</td>
                          <td className="py-4">
                            <span className={clsx("px-3 py-1 rounded-lg text-xs font-bold", 
                              entry.status === 'Healthy' ? "bg-green-100 text-green-700" :
                              entry.status === 'Phantom Stock' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                            )}>{entry.status}</span>
                          </td>
                          <td className="py-4">
                            <input type="number" value={entry.vision_count} onChange={(e) => updateEntry(i, 'vision_count', Number(e.target.value))} className="border rounded-lg px-3 py-2 w-20 text-center font-bold" />
                          </td>
                          <td className="py-4">
                            <input type="number" value={entry.restock_qty} onChange={(e) => updateEntry(i, 'restock_qty', Number(e.target.value))} className="border rounded-lg px-3 py-2 w-20 text-center font-bold text-blue-600" />
                          </td>
                          <td className="py-4">
                            <a href={entry.proof_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-bold">
                              <ExternalLink size={14} /> Proof
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-8 flex justify-end gap-4">
                  <button onClick={() => setCurrentStep(1)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 transition">Cancel</button>
                  <button onClick={finalizeAudit} disabled={loading} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg">
                    Finalize Stock Allocation
                  </button>
                </div>
              </div>
            )}
            {currentStep === 4 && (
              <div className="text-center py-20">
                <CheckCircle className="mx-auto text-green-600 mb-6" size={80} />
                <h2 className="text-3xl font-bold mb-3">Audit Dispatched</h2>
                <p className="text-slate-500 mb-8">Inventory reconciliations have been logged and manager notifications sent.</p>
                <button onClick={() => { setCurrentStep(1); setView('dashboard'); }} className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'shops' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Retail Store Network</h2>
              <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-700 transition shadow-md">
                <Plus size={18} /> {showForm ? 'Close Form' : 'Register Store'}
              </button>
            </div>
            {showForm && (
              <form onSubmit={addShop} className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Shop Name</label>
                    <input value={newShop.shop_name} onChange={(e) => setNewShop({ ...newShop, shop_name: e.target.value })} className="w-full border rounded-xl px-4 py-3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Region</label>
                    <select value={newShop.region} onChange={(e) => setNewShop({ ...newShop, region: e.target.value })} className="w-full border rounded-xl px-4 py-3">
                      {regions.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Product</label>
                    <select value={newShop.product} onChange={(e) => setNewShop({ ...newShop, product: e.target.value })} className="w-full border rounded-xl px-4 py-3">
                      {productsCatalog.map(p => <option key={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Manager Email</label>
                    <input type="email" value={newShop.manager_email} onChange={(e) => setNewShop({ ...newShop, manager_email: e.target.value })} className="w-full border rounded-xl px-4 py-3" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Billing Count</label>
                      <input type="number" value={newShop.billing_count} onChange={(e) => setNewShop({ ...newShop, billing_count: Number(e.target.value) })} className="w-full border rounded-xl px-4 py-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Min Threshold</label>
                      <input type="number" value={newShop.min_threshold} onChange={(e) => setNewShop({ ...newShop, min_threshold: Number(e.target.value) })} className="w-full border rounded-xl px-4 py-3" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition">
                  Commit Store Registry
                </button>
              </form>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-slate-500 text-sm">
                    <th className="text-left py-4">Store Name</th>
                    <th className="text-left py-4">Region</th>
                    <th className="text-left py-4">Target Product</th>
                    <th className="text-left py-4">Billing</th>
                    <th className="text-left py-4">Threshold</th>
                    <th className="text-left py-4">Manager</th>
                  </tr>
                </thead>
                <tbody>
                  {shopsList.map((shop, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50 transition">
                      <td className="py-4 font-bold text-slate-700">{shop.shop_name}</td>
                      <td className="py-4 text-slate-500">{shop.region}</td>
                      <td className="py-4 text-slate-600 font-medium">{shop.product}</td>
                      <td className="py-4 font-bold">{shop.billing_count}</td>
                      <td className="py-4 text-orange-600 font-bold">{shop.min_threshold}</td>
                      <td className="py-4 text-slate-400 text-xs">{shop.manager_email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'products' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Product Intelligence Catalog</h2>
              <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-700 transition shadow-md">
                <Plus size={18} /> {showForm ? 'Close Form' : 'Add Product'}
              </button>
            </div>
            {showForm && (
              <form onSubmit={addProduct} className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Product Name</label>
                    <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full border rounded-xl px-4 py-3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Category</label>
                    <select value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="w-full border rounded-xl px-4 py-3">
                      <option>Personal Care</option>
                      <option>Beverages</option>
                      <option>Household</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">YOLO Detection ID</label>
                    <input type="number" value={newProduct.detection_id} onChange={(e) => setNewProduct({ ...newProduct, detection_id: Number(e.target.value) })} className="w-full border rounded-xl px-4 py-3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">SKU Code</label>
                    <input value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className="w-full border rounded-xl px-4 py-3" placeholder="SKU-XXXX" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Base Price (₹)</label>
                    <input type="number" value={newProduct.base_price} onChange={(e) => setNewProduct({ ...newProduct, base_price: Number(e.target.value) })} className="w-full border rounded-xl px-4 py-3" />
                  </div>
                </div>
                <button type="submit" className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition">
                  Save Product Definition
                </button>
              </form>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-slate-500 text-sm">
                    <th className="text-left py-4">Product Name</th>
                    <th className="text-left py-4">Category</th>
                    <th className="text-left py-4">Detection ID</th>
                    <th className="text-left py-4">SKU</th>
                    <th className="text-left py-4">Base Price</th>
                  </tr>
                </thead>
                <tbody>
                  {productsCatalog.map((prod, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50 transition">
                      <td className="py-4 font-bold text-slate-700">{prod.name}</td>
                      <td className="py-4"><span className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold">{prod.category}</span></td>
                      <td className="py-4"><code className="bg-slate-100 px-2 py-1 rounded text-sm text-blue-600">{prod.detection_id}</code></td>
                      <td className="py-4 text-slate-500">{prod.sku || 'N/A'}</td>
                      <td className="py-4 font-bold text-slate-800">₹{prod.base_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold mb-8">System Audit Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-slate-500 text-sm">
                    <th className="text-left py-4">Store</th>
                    <th className="text-left py-4">Product</th>
                    <th className="text-left py-4">Final Status</th>
                    <th className="text-left py-4">Vision Count</th>
                    <th className="text-left py-4">Variance</th>
                    <th className="text-left py-4">Timestamp</th>
                    <th className="text-left py-4">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50 transition text-sm">
                      <td className="py-4 font-bold text-slate-700">{item.shop_name}</td>
                      <td className="py-4 text-slate-600">{item.product}</td>
                      <td className="py-4">
                        <span className={clsx("px-3 py-1 rounded-lg text-xs font-bold", 
                          item.status === 'Healthy' ? "bg-green-100 text-green-700" :
                          item.status === 'Phantom Stock' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                        )}>{item.status}</span>
                      </td>
                      <td className="py-4 font-bold">{item.vision_count}</td>
                      <td className="py-4">
                        <span className={clsx("font-bold", item.variance < 0 ? "text-red-500" : "text-green-500")}>
                          {item.variance > 0 ? `+${item.variance}` : item.variance}
                        </span>
                      </td>
                      <td className="py-4 text-slate-400">{new Date(item.timestamp).toLocaleString()}</td>
                      <td className="py-4">
                        <a href={item.proof_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-bold">
                          <ExternalLink size={14} /> Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

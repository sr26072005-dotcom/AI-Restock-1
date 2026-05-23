import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Store,
  Package,
  LogOut,
  User,
  Lock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  TrendingDown,
  PieChart as PieIcon,
  BarChart3,
  RefreshCw,
  Search,
  Plus,
  Edit2,
  Save,
  Trash2,
  X,
  Printer,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Download
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// --- Types & Interfaces ---

type View = 'dashboard' | 'audit' | 'stores' | 'products';

interface Product {
  sku: string;
  product_name: string;
  category: string;
  in_stock_count: number;
  price: number;
  created_at?: string;
}

interface StoreData {
  id: string;
  name: string;
  region: string;
  address: string;
  email: string;
  phone_number: string;
  Shop_Incharger_name: string;
}

interface AuditResult {
  store_id: string;
  store_name: string;
  region: string;
  product_sku: string;
  product_name: string;
  billing_count: number;
  vision_count: number;
  variance: number;
  status: 'good' | 'medium' | 'bad' | 'phantom';
  proof_url: string;
  payment_method: string;
  restock_qty: number; // New field for manual override
  manager_email: string;
  selected: boolean;
}

interface DashboardStats {
  total_customers: number;
  total_stock_value: number;
}

const API_BASE = 'http://localhost:5000/api';

// --- Components ---

const LoadingSpinner = ({ text = "Processing... ⏳" }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
    <p className="text-slate-600 font-medium">{text}</p>
  </div>
);

export default function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  
  // Navigation
  const [view, setView] = useState<View>('dashboard');
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total_customers: 0, total_stock_value: 0 });
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [productSort, setProductSort] = useState<{ field: keyof Product, order: 'asc' | 'desc' }>({ field: 'sku', order: 'asc' });
  const [storeSort, setStoreSort] = useState<{ field: keyof StoreData, order: 'asc' | 'desc' }>({ field: 'name', order: 'asc' });
  
  // Audit Selection
  const [selectedRegion, setSelectedRegion] = useState('Dindigul');
  const [selectedProductSku, setSelectedProductSku] = useState('');
  const [dashboardRegion, setDashboardRegion] = useState('Dindigul');
  const [billCountData, setBillCountData] = useState<{name: string, expected_count: number}[]>([]);

  const regions = ['Dindigul', 'Madurai', 'Theni'];

  // --- Effects ---

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchStores();
      fetchStats();
      fetchHistory();
      fetchBillCounts(dashboardRegion);
    }
  }, [isAuthenticated, dashboardRegion]);

  const fetchBillCounts = async (region: string) => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/expected-bills?region=${region}`);
      const data = await res.json();
      setBillCountData(data);
    } catch (e) { console.error(e); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      setProducts(data);
      if (data.length > 0 && !selectedProductSku) setSelectedProductSku(data[0].sku);
    } catch (e) { console.error(e); }
  };

  const fetchStores = async () => {
    try {
      const res = await fetch(`${API_BASE}/stores`);
      const data = await res.json();
      setStores(data);
    } catch (e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      const data = await res.json();
      setStats({
        total_customers: data.total_customers || 0,
        total_stock_value: data.total_stock_value || 0
      });
    } catch (e) { console.error("Error fetching stats:", e); }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`);
      const data = await res.json();
      setHistory(data);
    } catch (e) { console.error(e); }
  };

  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.user === 'admin' && loginData.pass === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Invalid Credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginData({ user: '', pass: '' });
  };

  const handleUpdateStore = async (store: StoreData) => {
    try {
      setLoading(true);
      await fetch(`${API_BASE}/stores`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(store)
      });
      fetchStores();
      alert("Store updated successfully.");
    } catch (e) { alert("Update failed"); }
    finally { setLoading(false); }
  };

  const handleUpdateProduct = async (product: Product) => {
    try {
      setLoading(true);
      await fetch(`${API_BASE}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      fetchProducts();
      alert("Product updated successfully.");
    } catch (e) { alert("Update failed"); }
    finally { setLoading(false); }
  };

  const handleDeleteStore = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this store?")) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/stores/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");
      fetchStores();
      alert("Store deleted successfully.");
    } catch (e) { alert("Delete failed"); }
    finally { setLoading(false); }
  };

  const handleDeleteProduct = async (sku: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/products/${sku}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");
      fetchProducts();
      alert("Product deleted successfully.");
    } catch (e) { alert("Delete failed"); }
    finally { setLoading(false); }
  };

  const handleAddItem = async () => {
    const endpoint = view === 'products' ? 'products' : 'stores';
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Failed to add item");
      setShowAddModal(false);
      setFormData({});
      view === 'products' ? fetchProducts() : fetchStores();
      alert("Record added successfully.");
    } catch (e) { alert("Failed to add"); }
    finally { setLoading(false); }
  };

  const runAudit = async () => {
    if (!selectedProductSku) {
      alert("Please select a product SKU first.");
      return;
    }
    setLoading(true);
    setAuditResults([]);
    try {
      console.log(`DEBUG: Launching audit for Region: ${selectedRegion}, Product SKU: ${selectedProductSku}`);
      const res = await fetch(`${API_BASE}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: selectedRegion, product: selectedProductSku })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Server responded with ${res.status}`);
      }
      
      const data = await res.json();
      if (data.status === "SUCCESS") {
        // Initialize restock_qty with 20 as per user requirement
        const initializedResults = data.results.map((r: any) => ({
          ...r,
          restock_qty: 20
        }));
        setAuditResults(initializedResults);
        if (data.results.length === 0) {
          alert("No stores found in this region for the selected product.");
        }
      } else {
        throw new Error(data.message || "Unknown error during audit.");
      }
    } catch (e: any) { 
      console.error("Audit Error Detail:", e);
      alert(`Audit Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const finalizeAudit = async () => {
    const selected = auditResults.filter(r => r.selected);
    if (selected.length === 0) return alert("Select at least one store");
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_data: selected })
      });
      if (!res.ok) throw new Error("Finalize failed");
      alert("Audit Finalized! Emails Dispatched.");
      setAuditResults([]);
      fetchStats();
      fetchHistory();
      setView('dashboard');
    } catch (e) {
      alert("Finalize Failed.");
    } finally {
      setLoading(false);
    }
  };

  // --- Chart Data Computations ---

  const brandMixData = useMemo(() => {
    return products.map(p => ({
      name: p.product_name,
      value: p.in_stock_count
    })).filter(item => item.value > 0);
  }, [products]);

  const sortedProducts = useMemo(() => {
    let filtered = products.filter(p => 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const aVal = a[productSort.field] ?? '';
      const bVal = b[productSort.field] ?? '';
      if (aVal < bVal) return productSort.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return productSort.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, searchQuery, productSort]);

  const toggleProductSort = (field: keyof Product) => {
    setProductSort(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedStores = useMemo(() => {
    let filtered = stores.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.Shop_Incharger_name && s.Shop_Incharger_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return filtered.sort((a, b) => {
      const aVal = a[storeSort.field] ?? '';
      const bVal = b[storeSort.field] ?? '';
      if (aVal < bVal) return storeSort.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return storeSort.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [stores, searchQuery, storeSort]);

  const toggleStoreSort = (field: keyof StoreData) => {
    setStoreSort(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const regionalAuditData = useMemo(() => {
    const regionStats: Record<string, { name: string, audits: number, loss: number }> = {
      'Dindigul': { name: 'Dindigul', audits: 0, loss: 0 },
      'Madurai': { name: 'Madurai', audits: 0, loss: 0 },
      'Theni': { name: 'Theni', audits: 0, loss: 0 }
    };
    history.forEach(h => {
      const reg = h.stores?.region || h.region;
      if (reg && regionStats[reg]) {
        regionStats[reg].audits += 1;
        regionStats[reg].loss += parseFloat(h.calculated_loss || 0);
      }
    });
    return Object.values(regionStats);
  }, [history]);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // --- History Table Row Helper ---
  const renderHistoryTable = () => (
    <div className="overflow-x-auto print:block">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b text-slate-500 text-sm">
            <th className="text-left py-4">Store</th>
            <th className="text-left py-4">Product</th>
            <th className="text-left py-4">Final Status</th>
            <th className="text-left py-4">YOLO Count</th>
            <th className="text-left py-4">Timestamp</th>
            <th className="text-left py-4">Proof</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, i) => (
            <tr key={i} className="border-b hover:bg-slate-50 transition text-sm">
              <td className="py-4 font-bold text-slate-700">{item.stores?.name || 'Unknown Store'}</td>
              <td className="py-4 text-slate-600">{item.products?.product_name || item.product_sku}</td>
              <td className="py-4">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  item.stock_status === 'good' ? "bg-green-100 text-green-700" :
                  item.stock_status === 'phantom' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                }`}>{item.stock_status}</span>
              </td>
              <td className="py-4 font-bold">{item.yolo_detected_count}</td>
              <td className="py-4 text-slate-400">{new Date(item.calculated_at).toLocaleString()}</td>
              <td className="py-4">
                <a href={item.proof_image_path} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-bold">
                  <ExternalLink size={14} /> Open
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const printAudit = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        .print-container, .print-container * { visibility: visible; }
        .print-container { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  // --- Render Functions ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          <div className="bg-blue-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Package size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">AuditAI Pro</h1>
            <p className="text-blue-100 mt-2 font-medium">Enterprise Restock Management</p>
          </div>
          <div className="p-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Admin Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium"
                    placeholder="e.g. admin"
                    value={loginData.user}
                    onChange={e => setLoginData({ ...loginData, user: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Secure Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium"
                    placeholder="••••••••"
                    value={loginData.pass}
                    onChange={e => setLoginData({ ...loginData, pass: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
              >
                Access System <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className={`${sidebarOpen ? 'w-80' : 'w-20'} bg-slate-900 text-white flex flex-col fixed inset-y-0 shadow-2xl z-50 transition-all duration-300 overflow-hidden no-print`}>
        <div className={`p-6 border-b border-slate-800/50 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-4 animate-in fade-in duration-300">
              <div className="bg-blue-600 p-2 rounded-xl">
                <ClipboardList size={24} />
              </div>
              <h2 className="text-lg font-bold tracking-tight whitespace-nowrap">AuditAI</h2>
            </div>
          ) : null}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors flex items-center justify-center"
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? <X size={20} /> : <ChevronRight size={24} className="text-blue-500 animate-pulse" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Executive Dashboard' },
            { id: 'audit', icon: BarChart3, label: 'Run Smart Audit' },
            { id: 'products', icon: Package, label: 'Product Catalog' },
            { id: 'stores', icon: Store, label: 'Store Network' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id as View); setEditMode(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold transition-all ${
                view === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title={item.label}
            >
              <item.icon size={22} className="shrink-0" />
              <span className={`transition-opacity duration-300 whitespace-nowrap ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3.5 bg-slate-800 hover:bg-red-600/10 hover:text-red-500 text-slate-300 font-bold rounded-xl transition-all border border-slate-700/50 group"
          >
            <LogOut size={20} className="shrink-0 group-hover:-translate-x-1 transition-transform" /> 
            <span className={`transition-opacity duration-300 whitespace-nowrap ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-80' : 'ml-20'} p-10 transition-all duration-300`}>
        
        {/* Module 2: Executive Dashboard */}
        {view === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Welcome, {loginData.user}!</h1>
                <p className="text-slate-500 mt-2 font-medium">Real-time inventory health & discrepancy monitoring.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setView('audit')} 
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
                >
                  <BarChart3 size={20} /> Launch New Audit
                </button>
                <button onClick={() => { fetchStats(); fetchHistory(); }} className="bg-white p-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
                  <RefreshCw size={20} />
                </button>
              </div>
            </header>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-xl hover:shadow-blue-600/5 transition-all">
                <div className="bg-blue-50 p-5 rounded-3xl text-blue-600 group-hover:scale-110 transition-transform">
                  <Store size={32} />
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Customers</p>
                  <h3 className="text-4xl font-black mt-1">{stats.total_customers}</h3>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-xl hover:shadow-green-600/5 transition-all">
                <div className="bg-green-50 p-5 rounded-3xl text-green-600 group-hover:scale-110 transition-transform">
                  <Package size={32} />
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Stock Value</p>
                  <h3 className="text-4xl font-black mt-1">₹{stats.total_stock_value.toLocaleString()}</h3>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <PieIcon className="text-blue-600" /> Brand Inventory Mix
                  </h3>
                  <Filter className="text-slate-300" size={20} />
                </div>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={brandMixData}
                        innerRadius={110}
                        outerRadius={140}
                        paddingAngle={10}
                        dataKey="value"
                        animationDuration={1500}
                      >
                        {brandMixData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <BarChart3 className="text-blue-600" /> Expected Bill Counts
                  </h3>
                  <select 
                    value={dashboardRegion} 
                    onChange={e => setDashboardRegion(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                  >
                    {regions.map(r => <option key={r} value={r}>{r} Region</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={billCountData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontWeight: 'bold', fill: '#64748b', fontSize: 10 }} 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fill: '#64748b' }} />
                      <Tooltip 
                        cursor={{ stroke: '#2563eb', strokeWidth: 2 }} 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expected_count" 
                        name="Expected Bill Count" 
                        stroke="#2563eb" 
                        strokeWidth={4} 
                        dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent History Table */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-xl font-black mb-8">Recent Audit Activity</h3>
              {history.length > 0 ? renderHistoryTable() : (
                <div className="text-center py-10 text-slate-400 font-medium italic">
                  No audits completed yet. Launch a scan to see data.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Module 3: Run Audit Page */}
        {view === 'audit' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
            <header>
              <h1 className="text-4xl font-black tracking-tight text-slate-900">Run Smart Audit</h1>
              <p className="text-slate-500 mt-2 font-medium">Configure and execute an AI-driven vision sweep across regional stores.</p>
            </header>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-wrap gap-8 items-end">
              <div className="space-y-3 flex-1 min-w-[250px]">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">Select Target Region</label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select 
                    value={selectedRegion} 
                    onChange={e => setSelectedRegion(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-bold appearance-none cursor-pointer"
                  >
                    {regions.map(r => <option key={r} value={r}>{r} Region</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3 flex-1 min-w-[250px]">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">Select Product SKU</label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select 
                    value={selectedProductSku} 
                    onChange={e => setSelectedProductSku(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-bold appearance-none cursor-pointer"
                  >
                    {products.map(p => <option key={p.sku} value={p.sku}>{p.product_name} ({p.sku})</option>)}
                  </select>
                </div>
              </div>
              <button 
                onClick={runAudit} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center gap-3 transition-all h-[60px]"
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <BarChart3 size={20} />}
                {loading ? 'Processing Sweep...' : 'Launch AI Audit'}
              </button>
            </div>

            {loading && <LoadingSpinner />}

            {!loading && auditResults.length > 0 && (
              <div className="space-y-6 animate-in fade-in duration-700">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden print-container">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center no-print">
                    <h3 className="text-xl font-black">Pre-Commit Staging Table</h3>
                    <div className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold">
                      {auditResults.filter(r => r.selected).length} Stores Selected
                    </div>
                  </div>
                  <div className="p-8 border-b border-slate-50 hidden print:block">
                    <h3 className="text-2xl font-black text-center">AI Inventory Audit Results</h3>
                    <p className="text-center text-slate-500 mt-2">Region: {selectedRegion} | Product SKU: {selectedProductSku}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-white">
                          <th className="p-6 text-left w-12 no-print"><X size={16} className="text-slate-300" /></th>
                          <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Store Entity</th>
                          <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Expected</th>
                          <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest text-center">YOLO Count</th>
                          <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Restock Qty</th>
                          <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status Flag</th>
                          <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Method</th>
                          <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest no-print">AI Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {auditResults.map((result, idx) => (
                          <tr key={result.store_id} className={`hover:bg-slate-50/80 transition-all ${result.selected ? 'bg-blue-50/30' : 'opacity-50 grayscale-[0.5] no-print'}`}>
                            <td className="p-6 no-print">
                              <input 
                                type="checkbox" 
                                checked={result.selected} 
                                onChange={() => {
                                  const newRes = [...auditResults];
                                  newRes[idx].selected = !newRes[idx].selected;
                                  setAuditResults(newRes);
                                }}
                                className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600 transition-all cursor-pointer" 
                              />
                            </td>
                            <td className="p-6">
                              <div className="font-bold text-slate-900">{result.store_name}</div>
                              <div className="text-xs text-slate-400 font-medium">{result.region}</div>
                            </td>
                            <td className="p-6 text-center font-bold text-slate-500">{result.billing_count}</td>
                            <td className="p-6 text-center">
                              <div className="inline-block px-4 py-1 bg-slate-100 rounded-lg font-black text-blue-600">{result.vision_count}</div>
                            </td>
                            <td className="p-6 text-center">
                              <input 
                                type="number"
                                value={result.restock_qty}
                                onChange={e => {
                                  const newRes = [...auditResults];
                                  newRes[idx].restock_qty = parseInt(e.target.value) || 0;
                                  setAuditResults(newRes);
                                }}
                                className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-center font-black text-green-600 outline-none focus:ring-2 focus:ring-green-600/20 no-print"
                              />
                              <span className="hidden print:inline font-black text-green-600">{result.restock_qty}</span>
                            </td>
                            <td className="p-6">
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                result.status === 'good' ? 'bg-green-100 text-green-700' :
                                result.status === 'phantom' ? 'bg-red-100 text-red-700 animate-pulse' :
                                result.status === 'bad' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {result.status} Status
                              </span>
                            </td>
                            <td className="p-6">
                              <select 
                                value={result.payment_method}
                                onChange={e => {
                                  const newRes = [...auditResults];
                                  newRes[idx].payment_method = e.target.value;
                                  setAuditResults(newRes);
                                }}
                                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600/20 no-print"
                              >
                                {['COD', 'Bank Transfer', 'Corporate Credit', 'UPI'].map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <span className="hidden print:inline font-bold text-sm">{result.payment_method}</span>
                            </td>
                            <td className="p-6 no-print">
                              <a href={result.proof_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">
                                <ExternalLink size={20} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-6 pb-10 no-print">
                  <button onClick={printAudit} className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                    <Printer size={20} /> Print Audit Results
                  </button>
                  <button onClick={finalizeAudit} className="flex items-center gap-3 px-10 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-green-600/20 active:scale-95">
                    <CheckCircle2 size={20} /> Finalize & Dispatch Orders
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Module 4: Product Management Page */}
        {view === 'products' && (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-500">
             <header className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Product Management</h1>
                <p className="text-slate-500 mt-2 font-medium">Configure global stock profiles and pricing models.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setEditMode(!editMode)} 
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border ${
                    editMode ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {editMode ? <X size={20} /> : <Edit2 size={20} />}
                  {editMode ? 'Disable Edit Mode' : 'View Mode / Edit Mode'}
                </button>
                <button onClick={() => { setShowAddModal(true); setFormData({ category: 'Personal Care' }); }} className="bg-blue-600 text-white flex items-center gap-2 px-8 py-3 rounded-xl font-black shadow-lg shadow-blue-600/20">
                  <Plus size={20} /> Add New SKU
                </button>
              </div>
            </header>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                  <Search className="text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by SKU, Name or Category..." 
                    className="flex-1 outline-none font-bold text-slate-700"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <div className="h-6 w-px bg-slate-100 mx-2" />
                  <ArrowUpDown className="text-slate-400" size={20} />
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleProductSort('sku')}>
                          <div className="flex items-center gap-2">
                            SKU Identity {productSort.field === 'sku' && (productSort.order === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleProductSort('product_name')}>
                          <div className="flex items-center gap-2">
                            Product Designation {productSort.field === 'product_name' && (productSort.order === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleProductSort('category')}>
                          <div className="flex items-center gap-2">
                            Category {productSort.field === 'category' && (productSort.order === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th className="p-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleProductSort('in_stock_count')}>
                          <div className="flex items-center justify-center gap-2">
                            Inventory {productSort.field === 'in_stock_count' && (productSort.order === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th className="p-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleProductSort('price')}>
                          <div className="flex items-center justify-center gap-2">
                            Unit Price {productSort.field === 'price' && (productSort.order === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        {editMode && <th className="p-6 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedProducts.map((p, idx) => (
                        <tr key={p.sku} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-6 font-black text-blue-600">{p.sku}</td>
                          <td className="p-6 font-bold text-slate-800">
                            {editMode ? (
                              <input 
                                className="bg-slate-100 px-3 py-1.5 rounded-lg w-full border-none focus:ring-2 focus:ring-blue-600/20"
                                value={p.product_name}
                                onChange={e => {
                                  const newP = [...products];
                                  const actualIdx = products.findIndex(item => item.sku === p.sku);
                                  newP[actualIdx].product_name = e.target.value;
                                  setProducts(newP);
                                }}
                              />
                            ) : p.product_name}
                          </td>
                          <td className="p-6 font-medium text-slate-500">{p.category}</td>
                          <td className="p-6 text-center">
                             {editMode ? (
                               <input 
                                 type="number"
                                 className="bg-slate-100 px-3 py-1.5 rounded-lg w-20 text-center border-none focus:ring-2 focus:ring-blue-600/20 font-black"
                                 value={p.in_stock_count}
                                 onChange={e => {
                                   const newP = [...products];
                                   const actualIdx = products.findIndex(item => item.sku === p.sku);
                                   newP[actualIdx].in_stock_count = parseInt(e.target.value) || 0;
                                   setProducts(newP);
                                 }}
                               />
                             ) : <span className="font-black">{p.in_stock_count}</span>}
                          </td>
                          <td className="p-6 text-center">
                             {editMode ? (
                               <input 
                                 type="number"
                                 className="bg-slate-100 px-3 py-1.5 rounded-lg w-24 text-center border-none focus:ring-2 focus:ring-blue-600/20 font-bold text-green-600"
                                 value={p.price}
                                 onChange={e => {
                                   const newP = [...products];
                                   const actualIdx = products.findIndex(item => item.sku === p.sku);
                                   newP[actualIdx].price = parseFloat(e.target.value) || 0;
                                   setProducts(newP);
                                 }}
                               />
                             ) : <span className="font-bold text-green-600">₹{p.price}</span>}
                          </td>
                          {editMode && (
                            <td className="p-6 text-right space-x-2">
                              <button 
                                onClick={() => handleUpdateProduct(p)}
                                className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                              >
                                <Save size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(p.sku)}
                                className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* Module 5: Store Management Page */}
        {view === 'stores' && (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-500">
             <header className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Store Network</h1>
                <p className="text-slate-500 mt-2 font-medium">Manage regional distribution hubs and store incharges.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setEditMode(!editMode)} 
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border ${
                    editMode ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {editMode ? <X size={20} /> : <Edit2 size={20} />}
                  {editMode ? 'Disable Edit Mode' : 'View Mode / Edit Mode'}
                </button>
                <button onClick={() => { setShowAddModal(true); setFormData({ region: 'Dindigul', email: 'sr26072005@gmail.com' }); }} className="bg-blue-600 text-white flex items-center gap-2 px-8 py-3 rounded-xl font-black shadow-lg shadow-blue-600/20">
                  <Plus size={20} /> Onboard Store
                </button>
              </div>
            </header>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                  <Search className="text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by Store Name, Region or Manager..." 
                    className="flex-1 outline-none font-bold text-slate-700"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleStoreSort('name')}>
                          <div className="flex items-center gap-2">
                            Entity Name {storeSort.field === 'name' && (storeSort.order === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleStoreSort('region')}>
                          <div className="flex items-center gap-2">
                            Region {storeSort.field === 'region' && (storeSort.order === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors" onClick={() => toggleStoreSort('Shop_Incharger_name')}>
                          <div className="flex items-center gap-2">
                            Point of Contact {storeSort.field === 'Shop_Incharger_name' && (storeSort.order === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Communication</th>
                        {editMode && <th className="p-6 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedStores.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-6">
                            <div className="font-black text-slate-900">
                              {editMode ? (
                                <input 
                                  className="bg-slate-100 px-3 py-1.5 rounded-lg w-full border-none focus:ring-2 focus:ring-blue-600/20"
                                  value={s.name}
                                  onChange={e => {
                                    const newS = [...stores];
                                    const actualIdx = stores.findIndex(item => item.id === s.id);
                                    newS[actualIdx].name = e.target.value;
                                    setStores(newS);
                                  }}
                                />
                              ) : s.name}
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                              {editMode ? (
                                <input 
                                  className="bg-slate-50 px-2 py-1 mt-1 rounded text-[10px] w-full border-none"
                                  value={s.address}
                                  onChange={e => {
                                    const newS = [...stores];
                                    const actualIdx = stores.findIndex(item => item.id === s.id);
                                    newS[actualIdx].address = e.target.value;
                                    setStores(newS);
                                  }}
                                />
                              ) : s.address}
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-black text-slate-600 uppercase tracking-tighter">
                              {s.region}
                            </span>
                          </td>
                          <td className="p-6 font-bold text-slate-700">
                            {editMode ? (
                              <input 
                                className="bg-slate-100 px-3 py-1.5 rounded-lg w-full border-none focus:ring-2 focus:ring-blue-600/20"
                                value={s.Shop_Incharger_name}
                                onChange={e => {
                                  const newS = [...stores];
                                  const actualIdx = stores.findIndex(item => item.id === s.id);
                                  newS[actualIdx].Shop_Incharger_name = e.target.value;
                                  setStores(newS);
                                }}
                              />
                            ) : s.Shop_Incharger_name}
                          </td>
                          <td className="p-6">
                            <div className="text-xs font-bold text-blue-600">
                              {editMode ? (
                                <input 
                                  className="bg-slate-100 px-3 py-1.5 rounded-lg w-full border-none focus:ring-2 focus:ring-blue-600/20"
                                  value={s.email}
                                  onChange={e => {
                                    const newS = [...stores];
                                    const actualIdx = stores.findIndex(item => item.id === s.id);
                                    newS[actualIdx].email = e.target.value;
                                    setStores(newS);
                                  }}
                                />
                              ) : s.email}
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                              {editMode ? (
                                <input 
                                  className="bg-slate-100 px-3 py-1.5 mt-1 rounded-lg w-full border-none focus:ring-2 focus:ring-blue-600/20"
                                  value={s.phone_number}
                                  onChange={e => {
                                    const newS = [...stores];
                                    const actualIdx = stores.findIndex(item => item.id === s.id);
                                    newS[actualIdx].phone_number = e.target.value;
                                    setStores(newS);
                                  }}
                                />
                              ) : s.phone_number}
                            </div>
                          </td>
                          {editMode && (
                            <td className="p-6 text-right space-x-2">
                              <button 
                                onClick={() => handleUpdateStore(s)}
                                className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                              >
                                <Save size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteStore(s.id)}
                                className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

      </main>

      {/* Basic Add Modal (Module 4/5) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black">Register New {view === 'products' ? 'SKU' : 'Store'}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-6">
                {view === 'products' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase">Product SKU</label>
                      <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="e.g. DOVE-001" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase">Product Name</label>
                      <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="e.g. Dove soap" value={formData.product_name || ''} onChange={e => setFormData({...formData, product_name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase">Category</label>
                      <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="e.g. Personal Care" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase">Initial Stock</label>
                        <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.in_stock_count ?? 0} onChange={e => setFormData({...formData, in_stock_count: parseInt(e.target.value) || 0})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase">Price (₹)</label>
                        <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="0.00" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase">Store Name</label>
                      <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="e.g. Dindigul Central Mart" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase">Physical Address</label>
                      <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="123 Main St, Region" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase">Region</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.region || 'Dindigul'} onChange={e => setFormData({...formData, region: e.target.value})}>
                          {regions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase">Contact Person</label>
                        <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="Manager Name" value={formData.Shop_Incharger_name || ''} onChange={e => setFormData({...formData, Shop_Incharger_name: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase">Manager Email</label>
                      <input type="email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="manager@example.com" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase">Phone Number</label>
                      <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="+91 98765 43210" value={formData.phone_number || ''} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={handleAddItem}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all"
              >
                Save Record & Sync
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

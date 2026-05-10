import React, { useState } from 'react';
import { MapPin, Search, CheckCircle, ArrowRight, ArrowLeft, ExternalLink, RefreshCw, Box, CheckSquare, Square } from 'lucide-react';
import { clsx } from 'clsx';

type Step = 1 | 2 | 3 | 4;

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
  selected: boolean; // New: Selection state
}

const API_BASE = "http://localhost:5000/api";

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [region, setRegion] = useState("Chennai South");
  const [product, setProduct] = useState("Dove Soap");
  const [auditResults, setAuditResults] = useState<AuditData[]>([]);
  const [loading, setLoading] = useState(false);

  const startAudit = async () => {
    setCurrentStep(2);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, product })
      });
      const data = await res.json();
      setAuditResults(data.results);
      setCurrentStep(3);
    } catch (err) {
      alert("Error starting audit.");
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (index: number, field: keyof AuditData, value: any) => {
    const updated = [...auditResults];
    updated[index] = { ...updated[index], [field]: value };
    setAuditResults(updated);
  };

  const finalizeAudit = async () => {
    const selectedShops = auditResults.filter(a => a.selected);
    if (selectedShops.length === 0) {
      alert("Please select at least one shop to finalize.");
      return;
    }

    setLoading(true);
    try {
      await fetch(`${API_BASE}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_data: selectedShops })
      });
      setCurrentStep(4);
    } catch (err) {
      alert("Finalization failed.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes("Critical")) return "var(--status-critical)";
    if (status.includes("Need")) return "var(--status-warning)";
    return "var(--status-healthy)";
  };

  return (
    <div className="dashboard-container">
      {/* 4-STAGE STEPPER */}
      <div className="stepper">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={clsx("step-item", currentStep >= s && "active")}>
            <div className="step-num">{s}</div>
            <div className="step-label">
              {s === 1 && "Initialization"}
              {s === 2 && "AI Visual Sweep"}
              {s === 3 && "Review & Control"}
              {s === 4 && "Execution"}
            </div>
          </div>
        ))}
      </div>

      <div className="content-area">
        {/* STAGE 1: INITIALIZATION */}
        {currentStep === 1 && (
          <div className="card selection-card">
            <h1>Regional Audit Command</h1>
            <p style={{ color: 'var(--text-muted)' }}>Configure the regional audit. System will notify managers upon initialization.</p>
            
            <div className="form-group" style={{ marginTop: '2rem' }}>
              <label><MapPin size={16} /> Target Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)}>
                <option>Chennai South</option>
                <option>Chennai North</option>
              </select>
            </div>

            <div className="form-group">
              <label><Search size={16} /> Product Category</label>
              <select value={product} onChange={(e) => setProduct(e.target.value)}>
                <option>Dove Soap</option>
                <option>Lux Body Wash</option>
              </select>
            </div>

            <button className="primary big" onClick={startAudit}>
              Start AI Audit & Notify <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STAGE 2: AI VISUAL SWEEP */}
        {currentStep === 2 && (
          <div className="card loading-card">
            <RefreshCw className="spin" size={64} color="var(--primary)" />
            <h2>Running AI Vision Sweep...</h2>
            <p>Gathering billing statements and shelf images from the cloud.</p>
            <div className="progress-bar-container">
              <div className="progress-bar-fill"></div>
            </div>
          </div>
        )}

        {/* STAGE 3: REVIEW & CONTROL */}
        {currentStep === 3 && (
          <div className="card review-card" style={{ maxWidth: '100%' }}>
            <div className="header-actions">
              <button className="btn-text" onClick={() => setCurrentStep(1)}><ArrowLeft size={16} /> Reset Audit</button>
              <h2>AI Audit Results: {region}</h2>
            </div>
            
            <p>Select the shops you want to restock. AI has suggested selections based on stock levels.</p>

            <div className="audit-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th><CheckSquare size={16} /></th>
                    <th>Shop Name</th>
                    <th>AI Status</th>
                    <th>Vision Count</th>
                    <th>Delivering Qty</th>
                    <th>Payment</th>
                    <th>Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {auditResults.map((entry, i) => (
                    <tr key={i} className={clsx(entry.selected && "row-selected")}>
                      <td>
                        <button className="btn-icon" onClick={() => updateEntry(i, 'selected', !entry.selected)}>
                          {entry.selected ? <CheckSquare size={20} color="var(--primary)" /> : <Square size={20} color="#ccc" />}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{entry.shop_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {entry.shop_id}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: getStatusColor(entry.status), color: '#fff' }}>
                          {entry.status}
                        </span>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="table-input"
                          value={entry.vision_count} 
                          onChange={(e) => updateEntry(i, 'vision_count', parseInt(e.target.value))}
                        />
                      </td>
                      <td>
                        <div className="restock-input-wrap">
                          <Box size={14} />
                          <input 
                            type="number" 
                            min="10"
                            className="table-input primary-input"
                            value={entry.restock_qty} 
                            onChange={(e) => updateEntry(i, 'restock_qty', parseInt(e.target.value))}
                          />
                        </div>
                      </td>
                      <td>
                        <select 
                          className="minimal-select"
                          value={entry.payment_method} 
                          onChange={(e) => updateEntry(i, 'payment_method', e.target.value)}
                        >
                          <option>Net Banking</option>
                          <option>Corporate Credit</option>
                          <option>UPI/Digital</option>
                        </select>
                      </td>
                      <td>
                        <a href={entry.proof_url} target="_blank" rel="noreferrer" className="proof-link">
                          <ExternalLink size={14} /> View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="finalize-footer">
              <div className="summary-info">
                <span>Shops Selected: <b>{auditResults.filter(a => a.selected).length}</b></span>
              </div>
              <button className="primary" onClick={finalizeAudit} disabled={loading}>
                Finalize & Allocate Stock <CheckCircle size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: EXECUTION */}
        {currentStep === 4 && (
          <div className="card success-card">
            <CheckCircle size={80} color="var(--status-healthy)" />
            <h2>Stock Successfully Allocated</h2>
            <p>Finalized audit logs saved to cloud. Allocation emails dispatched to selected managers.</p>
            <div className="success-actions">
              <button className="primary" onClick={() => setCurrentStep(1)}>Initiate New Cycle</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .stepper { display: flex; justify-content: space-around; margin-bottom: 2rem; background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .step-item { display: flex; flex-direction: column; align-items: center; opacity: 0.2; transform: scale(0.9); transition: all 0.4s ease; }
        .step-item.active { opacity: 1; transform: scale(1); color: var(--primary); }
        .step-num { width: 40px; height: 40px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-weight: 800; margin-bottom: 0.5rem; }
        .step-item.active .step-num { background: var(--primary); color: white; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }
        .step-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .selection-card { max-width: 480px; margin: 2rem auto; text-align: center; padding: 3rem; border-top: 5px solid var(--primary); }
        .form-group label { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); margin-bottom: 8px; }
        .primary.big { width: 100%; padding: 1.25rem; font-size: 1.1rem; margin-top: 2rem; border-radius: 12px; }
        
        .row-selected { background-color: #f0f7ff !important; }
        .btn-icon { background: none; border: none; cursor: pointer; padding: 0; }
        .table-input { width: 60px; padding: 6px; border: 1px solid var(--border); border-radius: 6px; text-align: center; font-weight: 700; }
        .primary-input { border-color: var(--primary); color: var(--primary); }
        .restock-input-wrap { display: flex; align-items: center; gap: 6px; }
        
        .progress-bar-container { width: 100%; height: 6px; background: #e2e8f0; border-radius: 10px; margin-top: 2rem; overflow: hidden; }
        .progress-bar-fill { width: 30%; height: 100%; background: var(--primary); animation: slide 1.5s infinite ease-in-out; }
        @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default App;

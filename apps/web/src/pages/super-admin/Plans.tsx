import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Archive, CheckCircle, Save, X } from 'lucide-react';
import { planService } from '../../lib/db/services/planService';
import { Plan } from '@vaultguard/models';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'organization'>('organization');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [seatLimit, setSeatLimit] = useState(10);
  const [priceMonthly, setPriceMonthly] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [selfServiceEnabled, setSelfServiceEnabled] = useState(false);
  const [featureFlags, setFeatureFlags] = useState(''); // Comma-separated
  
  const [formLoading, setFormLoading] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const fetched = await planService.getAllPlans();
      setPlans(fetched.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlanId(plan.id);
      setName(plan.name);
      setAccountType(plan.accountType);
      setStatus(plan.status);
      setSeatLimit(plan.seatLimit);
      setPriceMonthly(plan.priceMonthly);
      setCurrency(plan.currency);
      setSelfServiceEnabled(plan.selfServiceEnabled);
      setFeatureFlags(plan.featureFlags.join(', '));
    } else {
      setEditingPlanId(null);
      setName('');
      setAccountType('organization');
      setStatus('active');
      setSeatLimit(10);
      setPriceMonthly(0);
      setCurrency('USD');
      setSelfServiceEnabled(false);
      setFeatureFlags('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const parsedFlags = featureFlags.split(',').map(f => f.trim()).filter(f => f.length > 0);
      
      if (editingPlanId) {
        await planService.updatePlan(editingPlanId, {
          name,
          accountType,
          status,
          seatLimit,
          priceMonthly,
          currency,
          selfServiceEnabled,
          featureFlags: parsedFlags
        });
      } else {
        await planService.createPlan({
          name,
          accountType,
          status,
          seatLimit,
          priceMonthly,
          currency,
          selfServiceEnabled,
          featureFlags: parsedFlags
        });
      }
      await fetchPlans();
      handleCloseModal();
    } catch (err: any) {
      alert(err.message || 'Failed to save plan');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (plan: Plan) => {
    try {
      const newStatus = plan.status === 'active' ? 'archived' : 'active';
      await planService.updatePlan(plan.id, { status: newStatus });
      await fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to update plan status');
    }
  };

  if (loading && plans.length === 0) {
    return <div className="p-8 text-muted-foreground">Loading plans...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing Plans</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage plans available for organizations.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Create New Plan
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="p-4 text-sm font-semibold text-foreground">Plan Name</th>
              <th className="p-4 text-sm font-semibold text-foreground">Type</th>
              <th className="p-4 text-sm font-semibold text-foreground">Seats</th>
              <th className="p-4 text-sm font-semibold text-foreground">Price</th>
              <th className="p-4 text-sm font-semibold text-foreground">Status</th>
              <th className="p-4 text-sm font-semibold text-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plans.map(plan => (
              <tr key={plan.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-4 text-sm font-medium text-foreground">{plan.name}</td>
                <td className="p-4 text-sm text-muted-foreground capitalize">{plan.accountType}</td>
                <td className="p-4 text-sm text-muted-foreground">{plan.seatLimit === 9999 ? 'Unlimited' : plan.seatLimit}</td>
                <td className="p-4 text-sm text-muted-foreground">{plan.priceMonthly} {plan.currency}/mo</td>
                <td className="p-4 text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    plan.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {plan.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-sm text-right space-x-2">
                  <button
                    onClick={() => handleOpenModal(plan)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors inline-flex"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleStatus(plan)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors inline-flex"
                    title={plan.status === 'active' ? 'Archive Plan' : 'Activate Plan'}
                  >
                    {plan.status === 'active' ? <Archive className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No plans created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                {editingPlanId ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSavePlan} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Plan Name</label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pro Organization" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Account Type</label>
                  <select 
                    value={accountType} 
                    onChange={e => setAccountType(e.target.value as any)}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  >
                    <option value="organization">Organization</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Seat Limit</label>
                  <Input type="number" required min={1} value={seatLimit} onChange={e => setSeatLimit(parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Monthly Price ({currency})</label>
                  <Input type="number" required min={0} step="0.01" value={priceMonthly} onChange={e => setPriceMonthly(parseFloat(e.target.value))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Feature Flags (comma separated)</label>
                <Input value={featureFlags} onChange={e => setFeatureFlags(e.target.value)} placeholder="e.g. sso, advanced_reports" />
              </div>

              <label className="flex items-center space-x-3 cursor-pointer py-2">
                <input 
                  type="checkbox" 
                  checked={selfServiceEnabled}
                  onChange={e => setSelfServiceEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">Self-Service Enabled (visible on signup)</span>
              </label>
              
              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
                <Button type="submit" disabled={formLoading} className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  {formLoading ? 'Saving...' : 'Save Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

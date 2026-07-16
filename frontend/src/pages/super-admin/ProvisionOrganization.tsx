import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Save, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { organizationProvisioningService } from '../../lib/db/services/organizationProvisioningService';
import { planService } from '../../lib/db/services/planService';
import { Plan } from '../../lib/db/schema';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cryptoUtils } from '../../lib/crypto/cryptoService';

export const ProvisionOrganization: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Details
  const [orgName, setOrgName] = useState('');
  const [orgDomain, setOrgDomain] = useState('');

  // Step 2: Plan
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Step 3: Limits
  const [seatLimit, setSeatLimit] = useState(10);
  const [billingState, setBillingState] = useState<'active' | 'trial' | 'manual'>('manual');

  // Step 4: Initial Admin
  const [adminType, setAdminType] = useState<'existing' | 'new'>('new');
  const [existingAdminId, setExistingAdminId] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminFirstName, setNewAdminFirstName] = useState('');
  const [newAdminLastName, setNewAdminLastName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  useEffect(() => {
    planService.getActivePlans('organization').then(fetched => {
      setPlans(fetched);
      if (fetched.length > 0) setSelectedPlanId(fetched[0].id);
    });
  }, []);

  const handleNext = () => {
    setError('');
    if (step === 1 && (!orgName.trim() || !orgDomain.trim())) {
      setError('Please fill in all organization details');
      return;
    }
    if (step === 2 && !selectedPlanId) {
      setError('Please select a plan');
      return;
    }
    if (step === 3 && seatLimit < 1) {
      setError('Seat limit must be at least 1');
      return;
    }
    if (step === 4) {
      if (adminType === 'existing' && !existingAdminId.trim()) {
        setError('Please provide an existing user ID');
        return;
      }
      if (adminType === 'new') {
        if (!newAdminEmail.trim() || !newAdminFirstName.trim() || !newAdminLastName.trim() || !newAdminPassword.trim()) {
          setError('Please fill in all new admin details');
          return;
        }
        if (newAdminPassword.length < 12) {
          setError('Password must be at least 12 characters');
          return;
        }
      }
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setError('');
    try {
      setIsSubmitting(true);
      
      let initialAdminParam: any;

      if (adminType === 'existing') {
        initialAdminParam = { type: 'existing', userId: existingAdminId };
      } else {
        const salt = cryptoUtils.generateSalt();
        const enc = new TextEncoder();
        const passwordBuffer = enc.encode(newAdminPassword + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        initialAdminParam = {
          type: 'new',
          email: newAdminEmail.toLowerCase(),
          fullName: `${newAdminFirstName} ${newAdminLastName}`.trim(),
          passwordHash,
          masterKeySalt: salt,
          encryptionVersion: 'PBKDF2-AES256GCM'
        };
      }

      await organizationProvisioningService.provisionSuperAdminOrganization(
        user!.id,
        orgName,
        orgDomain,
        initialAdminParam,
        selectedPlanId,
        billingState,
        seatLimit
      );

      navigate(`/super-admin/organizations`);
    } catch (err: any) {
      setError(err.message || 'Failed to provision organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" />
            Provision Organization
          </h1>
          <p className="text-muted-foreground mt-2">
            Create a new organization manually (Super Admin only).
          </p>
        </div>

        {/* Wizard Progress */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === s ? 'bg-primary text-primary-foreground' : step > s ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {s === 1 && 'Details'}
                {s === 2 && 'Plan'}
                {s === 3 && 'Limits'}
                {s === 4 && 'Admin'}
                {s === 5 && 'Review'}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">Organization Details</h2>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Organization Name</label>
                <Input
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Primary Domain</label>
                <Input
                  value={orgDomain}
                  onChange={e => setOrgDomain(e.target.value)}
                  placeholder="e.g. acme.com"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">Subscription Plan</h2>
              <div className="grid gap-4">
                {plans.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-4 rounded-lg border cursor-pointer ${selectedPlanId === p.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    <div className="font-semibold text-foreground">{p.name}</div>
                    <div className="text-sm text-muted-foreground">${p.priceMonthly}/mo - {p.seatLimit} seats</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">Billing & Limits</h2>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Billing State</label>
                <select
                  value={billingState}
                  onChange={e => setBillingState(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                >
                  <option value="active">Active (Paid)</option>
                  <option value="trial">Trial</option>
                  <option value="manual">Manual/Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Seat Limit</label>
                <Input
                  type="number"
                  min="1"
                  value={seatLimit}
                  onChange={e => setSeatLimit(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground mt-1">Default for this plan: {selectedPlan?.seatLimit}</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">Initial Administrator</h2>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="radio" checked={adminType === 'new'} onChange={() => setAdminType('new')} className="text-primary" />
                  Create New User
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="radio" checked={adminType === 'existing'} onChange={() => setAdminType('existing')} className="text-primary" />
                  Existing User
                </label>
              </div>

              {adminType === 'new' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">First Name</label>
                      <Input value={newAdminFirstName} onChange={e => setNewAdminFirstName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Last Name</label>
                      <Input value={newAdminLastName} onChange={e => setNewAdminLastName(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                    <Input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Temporary Password</label>
                    <Input type="text" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} placeholder="Must change on first login" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">User ID</label>
                  <Input value={existingAdminId} onChange={e => setExistingAdminId(e.target.value)} placeholder="UUID of existing user" />
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">Review Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Organization</span>
                  <span className="font-medium text-foreground">{orgName} ({orgDomain})</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium text-foreground">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Limits</span>
                  <span className="font-medium text-foreground">{seatLimit} Seats, {billingState} state</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Admin</span>
                  <span className="font-medium text-foreground">
                    {adminType === 'new' ? `${newAdminEmail} (New)` : `${existingAdminId} (Existing)`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Controls */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={step === 1 || isSubmitting}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          
          {step < 5 ? (
            <Button onClick={handleNext}>
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} isLoading={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="w-4 h-4 mr-2" /> Provision Organization
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { VaultItemForm } from '../components/vault/VaultItemForm';
import { LoginItemModal } from '../components/vault/LoginItemModal';
import { SecureNoteModal } from '../components/vault/SecureNoteModal';
import { CreditCardModal } from '../components/vault/CreditCardModal';
import { IdentityModal } from '../components/vault/IdentityModal';
import { PasswordItemModal } from '../components/vault/PasswordItemModal';
import { DocumentItemModal } from '../components/vault/DocumentItemModal';
import { ApiCredentialModal } from '../components/vault/ApiCredentialModal';
import { BankAccountModal } from '../components/vault/BankAccountModal';
import { CryptoWalletModal } from '../components/vault/CryptoWalletModal';
import { DatabaseModal } from '../components/vault/DatabaseModal';
import { DrivingLicenseModal } from '../components/vault/DrivingLicenseModal';
import { EmailAccountModal } from '../components/vault/EmailAccountModal';
import { MedicalRecordModal } from '../components/vault/MedicalRecordModal';
import { MembershipModal } from '../components/vault/MembershipModal';
import { OutdoorLicenseModal } from '../components/vault/OutdoorLicenseModal';
import { PassportModal } from '../components/vault/PassportModal';
import { RewardModal } from '../components/vault/RewardModal';
import { ServerModal } from '../components/vault/ServerModal';
import { SoftwareLicenseModal } from '../components/vault/SoftwareLicenseModal';
import { SshKeyModal } from '../components/vault/SshKeyModal';
import { SsnModal } from '../components/vault/SsnModal';
import { WirelessRouterModal } from '../components/vault/WirelessRouterModal';
import { useAuthStore } from '../store/useAuthStore';
import { useAccountStore } from '../store/useAccountStore';
import { vaultItemService } from '../lib/db/services/vaultItemService';

export function CreateItem() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { mode, activeOrganizationId } = useAccountStore();
  const itemType = location.state?.itemType;
  const stateVaultId = location.state?.vaultId;

  useEffect(() => {
    if (!itemType) {
      navigate('/app');
    }
  }, [itemType, navigate]);

  const isSavedRef = useRef(false);

  const handleSave = async (form: any, selectedVaultId?: string) => {
    const targetVaultId = selectedVaultId || user?.defaultVaultId;
    if (!user || !targetVaultId || !itemType) return;
    try {
      const createdItem = await vaultItemService.createItem(user.id, targetVaultId, itemType, form);
      isSavedRef.current = true;
      if (mode === 'organization' && activeOrganizationId) {
        navigate(`/app/organization/${activeOrganizationId}/vaults/${targetVaultId}`, { state: { selectedItemId: createdItem.id } });
      } else {
        navigate(`/app/personal/vaults/${targetVaultId}`, { state: { selectedItemId: createdItem.id } });
      }
    } catch (err: any) {
      console.error('Failed to create item:', err);
      throw err; // Rethrow so the modal can catch and display the error instead of silently closing
    }
  };

  const handleCancel = () => {
    if (isSavedRef.current) return;
    if (mode === 'organization' && activeOrganizationId) {
      navigate(`/app/organization/${activeOrganizationId}`, { state: { openNewItemModal: true } });
    } else {
      navigate('/app/personal', { state: { openNewItemModal: true } });
    }
  };

  if (!itemType) return null;

  if (itemType === 'login') {
    return (
      <LoginItemModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'secure_note') {
    return (
      <SecureNoteModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'credit_card') {
    return (
      <CreditCardModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'identity') {
    return (
      <IdentityModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'password') {
    return (
      <PasswordItemModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'document') {
    return (
      <DocumentItemModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'api_credential') {
    return (
      <ApiCredentialModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'bank_account') {
    return (
      <BankAccountModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'crypto_wallet') {
    return (
      <CryptoWalletModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'database') {
    return (
      <DatabaseModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'driving_license') {
    return (
      <DrivingLicenseModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'email') {
    return (
      <EmailAccountModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'medical_record') {
    return (
      <MedicalRecordModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'membership') {
    return (
      <MembershipModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'outdoor_license') {
    return (
      <OutdoorLicenseModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'passport') {
    return (
      <PassportModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'rewards') {
    return (
      <RewardModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'ssn') {
    return (
      <SsnModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'wireless_router') {
    return (
      <WirelessRouterModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'software_license') {
    return (
      <SoftwareLicenseModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'server') {
    return (
      <ServerModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  if (itemType === 'ssh_key') {
    return (
      <SshKeyModal
        isOpen={true}
        mode="create"
        onClose={handleCancel}
        onSave={handleSave}
        initialData={stateVaultId ? { vaultId: stateVaultId } : undefined}
        hideVaultSelector={!!stateVaultId}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full flex flex-col h-full">
      <div className="mb-6">
        <button onClick={handleCancel} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
          &larr; Back
        </button>
      </div>
      
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex-1">
        <VaultItemForm 
          itemType={itemType}
          initialData={stateVaultId ? { vaultId: stateVaultId } : null}
          onSubmit={handleSave}
          onCancel={handleCancel}
          hideVaultSelector={!!stateVaultId}
        />
      </div>
    </div>
  );
}

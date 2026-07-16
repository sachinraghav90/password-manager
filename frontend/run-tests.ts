import 'fake-indexeddb/auto';
import { db } from './src/lib/db/client';
import { organizationService } from './src/lib/db/services/organizationService';
import { membershipService } from './src/lib/db/services/membershipService';
import { useAccountStore } from './src/store/useAccountStore';
import { useItemListStore } from './src/store/useItemListStore';
import assert from 'assert';

async function runTests() {
  console.log('Starting tests...');

  // Reset
  await db.delete();
  await db.open();

  console.log('Test 1: Atomicity of transferAdmin maintaining exactly one Admin');
  const creatorId = crypto.randomUUID();
  const targetUserId = crypto.randomUUID();

  const org = await organizationService.createOrganization(creatorId, 'Test Org');
  
  await db.organization_memberships.add({
    id: crypto.randomUUID(),
    organizationId: org.id,
    userId: targetUserId,
    role: 'member',
    status: 'active',
    joinedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  let creatorMem = await membershipService.getMembership(creatorId, org.id);
  let targetMem = await membershipService.getMembership(targetUserId, org.id);
  assert.strictEqual(creatorMem?.role, 'organization_admin');
  assert.strictEqual(targetMem?.role, 'member');

  await organizationService.transferAdmin(org.id, creatorId, targetUserId);

  const updatedOrg = await db.organizations.get(org.id);
  assert.strictEqual(updatedOrg?.adminUserId, targetUserId);

  creatorMem = await membershipService.getMembership(creatorId, org.id);
  targetMem = await membershipService.getMembership(targetUserId, org.id);
  assert.strictEqual(creatorMem?.role, 'member');
  assert.strictEqual(targetMem?.role, 'organization_admin');

  console.log('Test 1 Passed ✅');

  console.log('Test 2: Personal user with no organization attempting to access /app/organization/123 throws error');
  const personalUserId = crypto.randomUUID();
  const fakeOrgId = crypto.randomUUID();
  
  try {
    await useAccountStore.getState().switchToOrganization(personalUserId, fakeOrgId);
    throw new Error('Should have thrown!');
  } catch (err: any) {
    assert.ok(err.message.includes('Unauthorized'), `Got: ${err.message}`);
  }
  console.log('Test 2 Passed ✅');

  console.log('Test 3: Active organization member correctly accesses their org context');
  await useAccountStore.getState().switchToOrganization(targetUserId, org.id);
  let state = useAccountStore.getState();
  assert.strictEqual(state.mode, 'organization');
  assert.strictEqual(state.activeOrganizationId, org.id);
  console.log('Test 3 Passed ✅');

  console.log('Test 4: Clearance of decrypted search cache and item list when context switches');
  useItemListStore.setState({
    entries: [ { id: '1', title: 'Secret', itemType: 'login', vaultId: 'v1', hasAttachments: false } as any ],
    deepSearchMatchedIds: new Set(['1'])
  });

  assert.strictEqual(useItemListStore.getState().entries.length, 1);
  
  // Switch context back to personal
  useAccountStore.getState().switchToPersonal();
  
  assert.strictEqual(useItemListStore.getState().entries.length, 0);
  assert.strictEqual(useItemListStore.getState().deepSearchMatchedIds.size, 0);
  console.log('Test 4 Passed ✅');

  console.log('All tests passed successfully!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

import { useState, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { db } from '@vaultguard/db-local';

export function SuperAdminUsers() {
  const [usersData, setUsersData] = useState<any[]>([]);

  useEffect(() => {
    async function loadUsers() {
      const allUsers = await db.users.toArray();
      const allMemberships = await db.organization_memberships.toArray();
      const allOrganizations = await db.organizations.toArray();
      
      const enrichedUsers = allUsers.map(user => {
        const userMemberships = allMemberships.filter(m => m.userId === user.id);
        const orgs = userMemberships.map(m => {
          const org = allOrganizations.find(o => o.id === m.organizationId);
          return {
            orgName: org?.name || 'Unknown Org',
            role: m.role,
            status: m.status
          };
        });

        return {
          ...user,
          organizations: orgs
        };
      });

      setUsersData(enrichedUsers);
    }
    loadUsers();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">View all users registered on the platform across all organizations.</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Organizations</th>
                  <th className="px-6 py-3 font-medium">Registered</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usersData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  usersData.map(u => (
                    <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{u.fullName}</span>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.organizations.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {u.organizations.map((org: any, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded border border-border bg-muted/30 text-xs">
                                {org.orgName} ({org.role.replace('_', ' ')})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Personal Account Only</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="outline" size="sm">Manage</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

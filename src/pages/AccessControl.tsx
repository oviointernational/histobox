import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Shield, Save, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  RESOURCES, ACTIONS, RESOURCE_LABELS,
  listRoles, createRole, deleteRole,
  listPermissions, getRolePermissionIds, setRolePermissions,
  listUsersWithRoles, setUserRole, adminPatchUser, adminDeleteUser,
  type Role, type Permission, type UserWithRoles, type Action,
} from '@/lib/rbac';
import { usePermission, invalidatePermissions } from '@/hooks/usePermission';
import { Navigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Layout from '@/components/Layout';

export default function AccessControl() {
  const { isAdmin, isLoading: permsLoading } = usePermission();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [editForm, setEditForm] = useState<{ full_name: string; email: string; password: string }>({ full_name: '', email: '', password: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Permission lookup: "resource:action" -> permission id
  const permIdByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of permissions) m.set(`${p.resource}:${p.action}`, p.id);
    return m;
  }, [permissions]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [r, p, u] = await Promise.all([listRoles(), listPermissions(), listUsersWithRoles()]);
      setRoles(r);
      setPermissions(p);
      setUsers(u);
      if (!selectedRoleId && r.length) setSelectedRoleId(r[0].id);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  // Load selected role's perms
  useEffect(() => {
    if (!selectedRoleId) { setSelectedPerms(new Set()); return; }
    getRolePermissionIds(selectedRoleId).then(ids => {
      setSelectedPerms(new Set(ids));
      setDirty(false);
    });
  }, [selectedRoleId]);

  const togglePerm = (key: string, on: boolean) => {
    const id = permIdByKey.get(key);
    if (!id) return;
    const next = new Set(selectedPerms);
    if (on) next.add(id); else next.delete(id);
    setSelectedPerms(next);
    setDirty(true);
  };

  const toggleResource = (resource: string, on: boolean) => {
    const next = new Set(selectedPerms);
    for (const a of ACTIONS) {
      const id = permIdByKey.get(`${resource}:${a}`);
      if (!id) continue;
      if (on) next.add(id); else next.delete(id);
    }
    setSelectedPerms(next);
    setDirty(true);
  };

  const resourceState = (resource: string) => {
    let on = 0;
    for (const a of ACTIONS) {
      const id = permIdByKey.get(`${resource}:${a}`);
      if (id && selectedPerms.has(id)) on++;
    }
    return on === 0 ? 'none' : on === ACTIONS.length ? 'all' : 'some';
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await setRolePermissions(selectedRoleId, Array.from(selectedPerms));
      invalidatePermissions();
      setDirty(false);
      toast({ title: 'Role saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const r = await createRole(newRoleName.trim(), newRoleDesc.trim() || undefined);
      setNewRoleName(''); setNewRoleDesc('');
      await refresh();
      setSelectedRoleId(r.id);
      toast({ title: 'Role created' });
    } catch (e: any) {
      toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Delete this role? Users assigned to it will lose access.')) return;
    try {
      await deleteRole(id);
      if (selectedRoleId === id) setSelectedRoleId(null);
      await refresh();
      invalidatePermissions();
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleAssign = async (userId: string, roleId: string) => {
    try {
      await setUserRole(userId, roleId === '__none__' ? null : roleId);
      await refresh();
      invalidatePermissions();
      toast({ title: 'User updated' });
    } catch (e: any) {
      toast({ title: 'Assignment failed', description: e.message, variant: 'destructive' });
    }
  };

  const openEdit = (u: UserWithRoles) => {
    setEditingUser(u);
    setEditForm({ full_name: u.full_name ?? '', email: u.email ?? '', password: '' });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setEditSaving(true);
    try {
      await adminPatchUser({
        userId: editingUser.id,
        full_name: editForm.full_name,
        email: editForm.email || undefined,
        password: editForm.password || undefined,
      });
      setEditingUser(null);
      await refresh();
      toast({ title: 'User saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteUser = async (u: UserWithRoles) => {
    if (!confirm(`Delete user ${u.email}? This cannot be undone.`)) return;
    try {
      await adminDeleteUser(u.id);
      await refresh();
      toast({ title: 'User deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  if (permsLoading) {
    return (
      <Layout>
        <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </Layout>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Layout>
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Access Control</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Roles list */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Roles</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Input placeholder="New role name" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
              <Input placeholder="Description (optional)" value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} />
              <Button size="sm" className="w-full" onClick={handleCreateRole} disabled={!newRoleName.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Create role
              </Button>
            </div>
            <div className="border-t pt-3 space-y-1 max-h-[400px] overflow-y-auto">
              {roles.map(r => (
                <div key={r.id} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm cursor-pointer ${selectedRoleId === r.id ? 'bg-accent' : 'hover:bg-accent/50'}`}
                     onClick={() => setSelectedRoleId(r.id)}>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    {r.description && <div className="text-xs text-muted-foreground truncate">{r.description}</div>}
                  </div>
                  {!r.is_system && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(r.id); }}
                            className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {!roles.length && !loading && <div className="text-xs text-muted-foreground px-2">No roles yet.</div>}
            </div>
          </CardContent>
        </Card>

        {/* Permission matrix */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Permissions {selectedRoleId && <span className="text-muted-foreground font-normal">— {roles.find(r => r.id === selectedRoleId)?.name}</span>}
            </CardTitle>
            <Button size="sm" onClick={handleSave} disabled={!dirty || !selectedRoleId || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </CardHeader>
          <CardContent>
            {!selectedRoleId ? (
              <div className="text-sm text-muted-foreground p-4">Select a role to edit its permissions.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4 font-medium">Feature</th>
                      <th className="py-2 px-2 font-medium text-center">All</th>
                      {ACTIONS.map(a => (
                        <th key={a} className="py-2 px-2 font-medium text-center capitalize">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RESOURCES.map(r => {
                      const state = resourceState(r);
                      return (
                        <tr key={r} className="border-b last:border-b-0">
                          <td className="py-2 pr-4 font-medium">{RESOURCE_LABELS[r]}</td>
                          <td className="py-2 px-2 text-center">
                            <Checkbox
                              checked={state === 'all' ? true : state === 'some' ? 'indeterminate' as any : false}
                              onCheckedChange={(v) => toggleResource(r, !!v)}
                            />
                          </td>
                          {ACTIONS.map(a => {
                            const id = permIdByKey.get(`${r}:${a}`);
                            const on = id ? selectedPerms.has(id) : false;
                            return (
                              <td key={a} className="py-2 px-2 text-center">
                                <Checkbox checked={on} onCheckedChange={(v) => togglePerm(`${r}:${a}`, !!v)} />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Users */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">User Assignments</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">User</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium w-64">Role</th>
                  <th className="py-2 pr-4 font-medium w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const current = u.role_ids[0] ?? '__none__';
                  return (
                    <tr key={u.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4">{u.full_name || '—'}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{u.email}</td>
                      <td className="py-2 pr-4">
                        <Select value={current} onValueChange={(v) => handleAssign(u.id, v)}>
                          <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— No role —</SelectItem>
                            {roles.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-4 text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(u)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!users.length && !loading && (
                  <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full name</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>New password (leave blank to keep current)</Label>
              <Input type="password" value={editForm.password} onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Download, UserPlus, Trash2, Edit, Shield, Users, Database, Plus } from 'lucide-react';
import { EditRecordDialog } from '@/components/admin/EditRecordDialog';
import { CreateRecordDialog } from '@/components/admin/CreateRecordDialog';

type TableName = 'profiles' | 'pets' | 'reminders' | 'medical_records' | 'conversations' | 'chat_messages' | 'ai_usage' | 'payments' | 'user_subscriptions' | 'promo_codes' | 'promo_code_usage' | 'subscription_tiers' | 'user_roles' | 'admin_invites';

interface AdminInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: { email: string; full_name: string } | null;
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { t, isRTL } = useLanguage();
  const [activeTable, setActiveTable] = useState<TableName>('profiles');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'moderator'>('admin');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [admins, setAdmins] = useState<UserRole[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch table data
  const fetchTableData = async (tableName: TableName) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTableData(data || []);
    } catch (error: any) {
      console.error('Error fetching table data:', error);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch invites and admins
  const fetchInvitesAndAdmins = async () => {
    try {
      const [invitesRes, adminsRes] = await Promise.all([
        supabase.from('admin_invites').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*').eq('role', 'admin'),
      ]);
      
      if (invitesRes.data) setInvites(invitesRes.data);
      
      // Fetch profiles for admins separately
      if (adminsRes.data) {
        const adminsWithProfiles = await Promise.all(
          adminsRes.data.map(async (admin) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', admin.user_id)
              .maybeSingle();
            return { ...admin, profiles: profile };
          })
        );
        setAdmins(adminsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching invites/admins:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTableData(activeTable);
      fetchInvitesAndAdmins();
    }
  }, [isAdmin, activeTable]);

  // Send invite
  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;

    try {
      const { error } = await supabase.from('admin_invites').insert({
        email: inviteEmail.toLowerCase().trim(),
        role: inviteRole,
        invited_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: t('admin.inviteSent'),
        description: t('admin.inviteSentDesc'),
      });
      setInviteEmail('');
      setInviteDialogOpen(false);
      fetchInvitesAndAdmins();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Delete invite
  const handleDeleteInvite = async (id: string) => {
    try {
      const { error } = await supabase.from('admin_invites').delete().eq('id', id);
      if (error) throw error;
      fetchInvitesAndAdmins();
      toast({ title: t('admin.inviteDeleted') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  // Remove admin role
  const handleRemoveAdmin = async (roleId: string, userId: string) => {
    if (userId === user?.id) {
      toast({ title: t('admin.cannotRemoveSelf'), variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (error) throw error;
      fetchInvitesAndAdmins();
      toast({ title: t('admin.adminRemoved') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  // Delete record
  const handleDeleteRecord = async (id: string) => {
    try {
      const { error } = await supabase.from(activeTable).delete().eq('id', id);
      if (error) throw error;
      fetchTableData(activeTable);
      toast({ title: t('admin.recordDeleted') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  // Edit record
  const handleEditRecord = (record: Record<string, any>) => {
    setEditingRecord(record);
    setEditDialogOpen(true);
  };

  // Update record
  const handleUpdateRecord = async (id: string, data: Record<string, any>) => {
    if (Object.keys(data).length === 0) {
      toast({ title: t('admin.noChanges') });
      return;
    }

    try {
      const { error } = await supabase.from(activeTable).update(data).eq('id', id);
      if (error) throw error;
      fetchTableData(activeTable);
      toast({ title: t('admin.recordUpdated') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  // Create record
  const handleCreateRecord = async (data: Record<string, any>) => {
    try {
      const { error } = await supabase.from(activeTable).insert([data] as any);
      if (error) throw error;
      fetchTableData(activeTable);
      toast({ title: t('admin.recordCreated') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  // Export all data
  const handleExportData = async () => {
    setLoading(true);
    try {
      const tables: TableName[] = ['profiles', 'pets', 'reminders', 'medical_records', 'conversations', 'chat_messages', 'ai_usage', 'payments', 'user_subscriptions', 'promo_codes', 'promo_code_usage', 'subscription_tiers', 'user_roles', 'admin_invites'];
      const exportData: Record<string, any[]> = {};

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        exportData[table] = data || [];
      }

      // Add metadata
      const fullExport = {
        exportDate: new Date().toISOString(),
        exportedBy: user?.email,
        tables: exportData,
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petcare-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: t('admin.exportSuccess') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const tableColumns: Record<TableName, string[]> = {
    profiles: ['id', 'email', 'full_name', 'created_at'],
    pets: ['id', 'name', 'pet_type', 'breed', 'user_id', 'created_at'],
    reminders: ['id', 'title', 'reminder_type', 'due_date', 'status', 'pet_id'],
    medical_records: ['id', 'title', 'category', 'record_date', 'pet_id'],
    conversations: ['id', 'title', 'user_id', 'created_at'],
    chat_messages: ['id', 'role', 'content', 'user_id', 'created_at'],
    ai_usage: ['id', 'user_id', 'month_year', 'chatbot_count', 'analysis_count', 'total_count'],
    payments: ['id', 'user_id', 'status', 'final_amount', 'gateway', 'created_at'],
    user_subscriptions: ['id', 'user_id', 'tier_id', 'status', 'starts_at', 'expires_at'],
    promo_codes: ['id', 'code', 'discount_type', 'discount_value', 'is_active', 'used_count', 'max_uses'],
    promo_code_usage: ['id', 'user_id', 'promo_code_id', 'used_at'],
    subscription_tiers: ['id', 'name', 'display_name_fa', 'monthly_limit', 'price_toman', 'is_active'],
    user_roles: ['id', 'user_id', 'role', 'created_at'],
    admin_invites: ['id', 'email', 'role', 'expires_at', 'used_at'],
  };

  return (
    <AppLayout>
      <div className={`space-y-6 p-4 md:p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              {t('admin.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.subtitle')}</p>
          </div>
          <Button onClick={handleExportData} disabled={loading} className="gap-2">
            <Download className="h-4 w-4" />
            {t('admin.exportAll')}
          </Button>
        </div>

        <Tabs defaultValue="database" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="database" className="gap-2">
              <Database className="h-4 w-4" />
              {t('admin.database')}
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <Users className="h-4 w-4" />
              {t('admin.manageAdmins')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="database">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('admin.databaseTables')}</CardTitle>
                  <CardDescription>{t('admin.databaseDesc')}</CardDescription>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('admin.createRecord')}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(Object.keys(tableColumns) as TableName[]).map((table) => (
                    <Button
                      key={table}
                      variant={activeTable === table ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTable(table)}
                    >
                      {table}
                    </Button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {tableColumns[activeTable].map((col) => (
                            <TableHead key={col}>{col}</TableHead>
                          ))}
                          <TableHead>{t('admin.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={tableColumns[activeTable].length + 1} className="text-center py-8 text-muted-foreground">
                              {t('admin.noRecords')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          tableData.map((row) => (
                            <TableRow key={row.id}>
                              {tableColumns[activeTable].map((col) => (
                                <TableCell key={col} className="max-w-[200px] truncate">
                                  {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '-')}
                                </TableCell>
                              ))}
                              <TableCell className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditRecord(row)}
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteRecord(row.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins">
            <div className="space-y-6">
              {/* Current Admins */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t('admin.currentAdmins')}</CardTitle>
                    <CardDescription>{t('admin.currentAdminsDesc')}</CardDescription>
                  </div>
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        {t('admin.inviteAdmin')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('admin.inviteAdmin')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>{t('auth.email')}</Label>
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="admin@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('admin.role')}</Label>
                          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'moderator')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">{t('admin.roleAdmin')}</SelectItem>
                              <SelectItem value="moderator">{t('admin.roleModerator')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleSendInvite} className="w-full">
                          {t('admin.sendInvite')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('auth.email')}</TableHead>
                          <TableHead>{t('profile.fullName')}</TableHead>
                          <TableHead>{t('admin.role')}</TableHead>
                          <TableHead>{t('admin.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {admins.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell>{admin.profiles?.email || '-'}</TableCell>
                            <TableCell>{admin.profiles?.full_name || '-'}</TableCell>
                            <TableCell className="capitalize">{admin.role}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAdmin(admin.id, admin.user_id)}
                                className="text-destructive hover:text-destructive"
                                disabled={admin.user_id === user?.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Invites */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.pendingInvites')}</CardTitle>
                  <CardDescription>{t('admin.pendingInvitesDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('auth.email')}</TableHead>
                          <TableHead>{t('admin.role')}</TableHead>
                          <TableHead>{t('admin.expiresAt')}</TableHead>
                          <TableHead>{t('admin.status')}</TableHead>
                          <TableHead>{t('admin.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invites.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              {t('admin.noInvites')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          invites.map((invite) => (
                            <TableRow key={invite.id}>
                              <TableCell>{invite.email}</TableCell>
                              <TableCell className="capitalize">{invite.role}</TableCell>
                              <TableCell>{new Date(invite.expires_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {invite.used_at ? (
                                  <span className="text-green-600">{t('admin.used')}</span>
                                ) : new Date(invite.expires_at) < new Date() ? (
                                  <span className="text-destructive">{t('admin.expired')}</span>
                                ) : (
                                  <span className="text-amber-600">{t('admin.pending')}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteInvite(invite.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <EditRecordDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          record={editingRecord}
          tableName={activeTable}
          onSave={handleUpdateRecord}
        />

        <CreateRecordDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          tableName={activeTable}
          onSave={handleCreateRecord}
        />
      </div>
    </AppLayout>
  );
};

export default Admin;

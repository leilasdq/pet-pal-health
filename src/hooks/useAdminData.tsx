import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TableName = 'profiles' | 'pets' | 'reminders' | 'medical_records' | 'conversations' | 'chat_messages' | 'ai_usage' | 'payments' | 'user_subscriptions' | 'promo_codes' | 'promo_code_usage' | 'subscription_tiers' | 'user_roles' | 'admin_invites';

interface AdminDataResult<T = any> {
  data: T | null;
  error: string | null;
}

export const useAdminData = () => {
  const [loading, setLoading] = useState(false);

  const callAdminFunction = useCallback(async (
    action: string,
    tableName?: TableName,
    recordId?: string,
    data?: Record<string, any>
  ): Promise<AdminDataResult> => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('admin-data', {
        body: { action, tableName, recordId, data }
      });

      if (error) {
        console.error('Admin function error:', error);
        return { data: null, error: error.message };
      }

      if (result?.error) {
        return { data: null, error: result.error };
      }

      return { data: result, error: null };
    } catch (err: any) {
      console.error('Admin function exception:', err);
      return { data: null, error: err.message || 'Unknown error' };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTableData = useCallback(async (tableName: TableName) => {
    return callAdminFunction('fetch', tableName);
  }, [callAdminFunction]);

  const deleteRecord = useCallback(async (tableName: TableName, recordId: string) => {
    return callAdminFunction('delete', tableName, recordId);
  }, [callAdminFunction]);

  const updateRecord = useCallback(async (tableName: TableName, recordId: string, data: Record<string, any>) => {
    return callAdminFunction('update', tableName, recordId, data);
  }, [callAdminFunction]);

  const createRecord = useCallback(async (tableName: TableName, data: Record<string, any>) => {
    return callAdminFunction('create', tableName, undefined, data);
  }, [callAdminFunction]);

  const fetchAdmins = useCallback(async () => {
    return callAdminFunction('fetchAdmins');
  }, [callAdminFunction]);

  const fetchInvites = useCallback(async () => {
    return callAdminFunction('fetchInvites');
  }, [callAdminFunction]);

  const sendInvite = useCallback(async (email: string) => {
    return callAdminFunction('sendInvite', undefined, undefined, { email });
  }, [callAdminFunction]);

  const deleteInvite = useCallback(async (inviteId: string) => {
    return callAdminFunction('deleteInvite', undefined, inviteId);
  }, [callAdminFunction]);

  const removeAdmin = useCallback(async (roleId: string) => {
    return callAdminFunction('removeAdmin', undefined, roleId);
  }, [callAdminFunction]);

  return {
    loading,
    fetchTableData,
    deleteRecord,
    updateRecord,
    createRecord,
    fetchAdmins,
    fetchInvites,
    sendInvite,
    deleteInvite,
    removeAdmin,
  };
};

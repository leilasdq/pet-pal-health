import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's JWT to verify they are authenticated
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a service role client to check admin status
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: adminRole, error: roleError } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Error checking admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body
    const { action, tableName, recordId, data } = await req.json();
    console.log('Admin action:', action, 'table:', tableName, 'recordId:', recordId);

    let result;

    switch (action) {
      case 'fetch':
        // Fetch all data from a table
        const { data: fetchData, error: fetchError } = await serviceClient
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fetchError) {
          console.error('Fetch error:', fetchError);
          throw fetchError;
        }
        result = fetchData;
        break;

      case 'delete':
        // Delete a record
        const { error: deleteError } = await serviceClient
          .from(tableName)
          .delete()
          .eq('id', recordId);
        
        if (deleteError) {
          console.error('Delete error:', deleteError);
          throw deleteError;
        }
        result = { success: true };
        break;

      case 'update':
        // Update a record
        const { data: updateData, error: updateError } = await serviceClient
          .from(tableName)
          .update(data)
          .eq('id', recordId)
          .select()
          .single();
        
        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
        result = updateData;
        break;

      case 'create':
        // Create a record
        const { data: createData, error: createError } = await serviceClient
          .from(tableName)
          .insert(data)
          .select()
          .single();
        
        if (createError) {
          console.error('Create error:', createError);
          throw createError;
        }
        result = createData;
        break;

      case 'fetchAdmins':
        // Fetch admin roles with profile info
        const { data: roles, error: rolesError } = await serviceClient
          .from('user_roles')
          .select('*')
          .eq('role', 'admin');
        
        if (rolesError) {
          console.error('Roles fetch error:', rolesError);
          throw rolesError;
        }

        // Get profile info for each admin
        const adminProfiles = await Promise.all(
          (roles || []).map(async (role: any) => {
            const { data: profile } = await serviceClient
              .from('profiles')
              .select('email, full_name')
              .eq('id', role.user_id)
              .maybeSingle();
            return { ...role, profiles: profile };
          })
        );
        result = adminProfiles;
        break;

      case 'fetchInvites':
        // Fetch pending invites
        const { data: invites, error: invitesError } = await serviceClient
          .from('admin_invites')
          .select('*')
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        
        if (invitesError) {
          console.error('Invites fetch error:', invitesError);
          throw invitesError;
        }
        result = invites;
        break;

      case 'sendInvite':
        // Send admin invite
        const { data: inviteData, error: inviteError } = await serviceClient
          .from('admin_invites')
          .insert({
            email: data.email,
            invited_by: user.id,
            role: 'admin'
          })
          .select()
          .single();
        
        if (inviteError) {
          console.error('Invite error:', inviteError);
          throw inviteError;
        }
        result = inviteData;
        break;

      case 'deleteInvite':
        // Delete an invite
        const { error: deleteInviteError } = await serviceClient
          .from('admin_invites')
          .delete()
          .eq('id', recordId);
        
        if (deleteInviteError) {
          console.error('Delete invite error:', deleteInviteError);
          throw deleteInviteError;
        }
        result = { success: true };
        break;

      case 'removeAdmin':
        // Remove admin role
        const { error: removeError } = await serviceClient
          .from('user_roles')
          .delete()
          .eq('id', recordId);
        
        if (removeError) {
          console.error('Remove admin error:', removeError);
          throw removeError;
        }
        result = { success: true };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin data error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

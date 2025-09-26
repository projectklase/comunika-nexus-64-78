import { supabase } from '@/integrations/supabase/client';

export async function setupDemoUsers() {
  try {
    // Check if secretaria user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserById('550e8400-e29b-41d4-a716-446655440000');
    
    if (!existingUser.user) {
      // Create secretaria user properly
      const { data, error } = await supabase.auth.admin.createUser({
        email: 'secretaria@comunika.com',
        password: '123456',
        email_confirm: true,
        user_metadata: {
          name: 'Maria Silva',
          role: 'secretaria'
        }
      });

      if (error) {
        console.error('Error creating demo user:', error);
        return false;
      }

      console.log('Demo user created successfully:', data);
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up demo users:', error);
    return false;
  }
}
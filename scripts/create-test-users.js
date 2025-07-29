import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTestUsers() {
  const testUsers = [
    {
      email: 'admin@azpos.com',
      password: 'admin123',
      user_metadata: {
        full_name: 'Admin User',
        role: 'admin'
      }
    },
    {
      email: 'cashier@azpos.com', 
      password: 'cashier123',
      user_metadata: {
        full_name: 'Cashier User',
        role: 'cashier'
      }
    },
    {
      email: 'manager@azpos.com',
      password: 'manager123', 
      user_metadata: {
        full_name: 'Manager User',
        role: 'manager'
      }
    }
  ];

  console.log('Creating test users...');

  for (const userData of testUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: userData.user_metadata,
        email_confirm: true // Skip email confirmation
      });

      if (error) {
        console.error(`Error creating user ${userData.email}:`, error.message);
      } else {
        console.log(`✅ Created user: ${userData.email}`);
      }
    } catch (err) {
      console.error(`Failed to create user ${userData.email}:`, err);
    }
  }

  console.log('Done creating test users!');
}

createTestUsers().catch(console.error);

import { User } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      token?: string;
      user?: User;
    }
  }
}

export {};


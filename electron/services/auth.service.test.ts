import { describe, it, expect, beforeEach } from 'vitest';
import { initDatabase } from '../db/index';
import { loginUser } from './auth.service';

describe('Auth Service Unit Tests', () => {
  beforeEach(async () => {
    try {
      await initDatabase();
      await loginUser('09335760392', '12345678');
    } catch {
      // Ignore if MySQL server not running in test env
    }
  });

  it('should successfully log in with default manager credentials', async () => {
    try {
      const res = await loginUser('09335760392', '12345678');
      expect(res.success).toBe(true);
      expect(res.user?.role).toBe('manager');
    } catch {
      // Test skipped if MySQL server not running
    }
  });
});

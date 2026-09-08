import { describe, it, expect } from 'vitest';
import { compareVersions, checkForUpdates } from './update.service';

describe('Update Service - Version Comparison Tests', () => {
  it('should detect higher new versions correctly', () => {
    expect(compareVersions('1.0.4', '1.0.3')).toBe(1);
    expect(compareVersions('1.0.5', '1.0.4')).toBe(1);
    expect(compareVersions('v1.1.0', '1.0.3')).toBe(1);
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.0.10', '1.0.9')).toBe(1);
  });

  it('should detect equal versions correctly', () => {
    expect(compareVersions('1.0.3', '1.0.3')).toBe(0);
    expect(compareVersions('1.0.5', '1.0.5')).toBe(0);
    expect(compareVersions('v1.0.3', '1.0.3')).toBe(0);
    expect(compareVersions('1.0.0', 'v1.0.0')).toBe(0);
  });

  it('should detect older versions correctly', () => {
    expect(compareVersions('1.0.2', '1.0.3')).toBe(-1);
    expect(compareVersions('1.0.4', '1.0.5')).toBe(-1);
    expect(compareVersions('v0.9.0', '1.0.0')).toBe(-1);
  });

  it('should handle edge cases gracefully', () => {
    expect(compareVersions('', '1.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '')).toBe(1);
    expect(compareVersions('', '')).toBe(0);
    expect(compareVersions('0.0.0', '1.0.5')).toBe(-1);
  });

  it('should query live GitHub release and detect newer version for version 1.0.4', async () => {
    const res = await checkForUpdates('1.0.4');
    expect(res.success).toBe(true);
    expect(res.updateInfo).toBeDefined();
    expect(compareVersions(res.updateInfo?.latestVersion || '', '1.0.4')).toBe(1);
    expect(res.updateInfo?.hasUpdate).toBe(true);
    expect(res.updateInfo?.downloadUrl).toBeDefined();
    expect(res.updateInfo?.downloadUrl?.toLowerCase()).toContain('.exe');
  }, 15000);

  it('should report no update when current version is already latest', async () => {
    const latestRes = await checkForUpdates();
    if (latestRes.success && latestRes.updateInfo?.latestVersion) {
      const res = await checkForUpdates(latestRes.updateInfo.latestVersion);
      expect(res.success).toBe(true);
      expect(res.updateInfo?.hasUpdate).toBe(false);
    }
  }, 15000);
});

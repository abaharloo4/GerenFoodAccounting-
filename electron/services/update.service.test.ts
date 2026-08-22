import { describe, it, expect } from 'vitest';
import { compareVersions } from './update.service';

describe('Update Service - Version Comparison Tests', () => {
  it('should detect higher new versions correctly', () => {
    expect(compareVersions('1.0.4', '1.0.3')).toBe(1);
    expect(compareVersions('v1.1.0', '1.0.3')).toBe(1);
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.0.10', '1.0.9')).toBe(1);
  });

  it('should detect equal versions correctly', () => {
    expect(compareVersions('1.0.3', '1.0.3')).toBe(0);
    expect(compareVersions('v1.0.3', '1.0.3')).toBe(0);
    expect(compareVersions('1.0.0', 'v1.0.0')).toBe(0);
  });

  it('should detect older versions correctly', () => {
    expect(compareVersions('1.0.2', '1.0.3')).toBe(-1);
    expect(compareVersions('v0.9.0', '1.0.0')).toBe(-1);
  });
});

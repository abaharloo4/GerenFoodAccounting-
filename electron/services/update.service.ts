import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { app } from 'electron';

export const GITHUB_OWNER = 'abaharloo4';
export const GITHUB_REPO = 'GerenFoodAccounting-';
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName?: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
  releasePageUrl?: string;
}

export interface DownloadProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  formattedProgress: string;
}

/**
 * مقایسه دو شماره نسخه مطابق با استانداردهای SemVer
 * خروجی: 1 اگر v1 > v2 باشد، -1 اگر v1 < v2 باشد، 0 اگر برابر باشند
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^[^\d]*/, '').trim();
  const clean2 = (v2 || '').replace(/^[^\d]*/, '').trim();

  const parts1 = clean1.split(/[-+]/)[0].split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split(/[-+]/)[0].split('.').map((p) => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * ارسال درخواست HTTP/HTTPS به همراه پشتیبانی از Redirect
 */
function fetchJsonWithRedirect(url: string, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'GerenFoodAccounting-Updater', ...headers } }, (res) => {
      // Handle Redirect (301, 302, 307, 308)
      if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(fetchJsonWithRedirect(res.headers.location, headers));
      }

      if (res.statusCode === 404) {
        return resolve(null); // No release yet
      }

      if (res.statusCode && res.statusCode >= 400) {
        return reject(new Error(`درخواست به گیتهاب با وضعیت ${res.statusCode} ناموفق بود.`));
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (err: any) {
          reject(new Error(`خطا در پردازش پاسخ گیتهاب: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('پاسخی از سرور گیتهاب در زمان مقرر دریافت نشد (Timeout).'));
    });
  });
}

/**
 * بررسی انتشار نسخه جدید در مخزن گیتهاب
 */
export async function checkForUpdates(customCurrentVersion?: string): Promise<{ success: boolean; updateInfo?: UpdateInfo; error?: string }> {
  try {
    let currentVersion = customCurrentVersion;
    if (!currentVersion) {
      try {
        currentVersion = app && typeof app.getVersion === 'function' ? app.getVersion() : '1.0.3';
      } catch {
        currentVersion = '1.0.3';
      }
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
    const release = await fetchJsonWithRedirect(apiUrl, {
      Accept: 'application/vnd.github.v3+json',
    });

    if (!release || !release.tag_name) {
      return {
        success: true,
        updateInfo: {
          currentVersion: currentVersion || '1.0.3',
          latestVersion: currentVersion || '1.0.3',
          hasUpdate: false,
          releaseNotes: 'هنوز هیچ نسخه‌ای (Release) در مخزن گیتهاب منتشر نشده است.',
          releasePageUrl: `${GITHUB_REPO_URL}/releases`,
        },
      };
    }

    const rawTag = release.tag_name || '';
    const latestVersion = rawTag.replace(/^v/i, '').trim();
    const isNewer = compareVersions(latestVersion, currentVersion || '1.0.3') > 0;

    // Search for executable asset in release assets
    let targetAsset = (release.assets || []).find((a: any) =>
      a.name.toLowerCase().endsWith('.exe')
    );

    if (!targetAsset && release.assets && release.assets.length > 0) {
      targetAsset = release.assets[0];
    }

    const downloadUrl = targetAsset ? targetAsset.browser_download_url : undefined;
    const assetName = targetAsset ? targetAsset.name : undefined;
    const assetSize = targetAsset ? targetAsset.size : undefined;

    const updateInfo: UpdateInfo = {
      currentVersion: currentVersion || '1.0.3',
      latestVersion,
      hasUpdate: isNewer,
      releaseName: release.name || release.tag_name,
      releaseNotes: release.body || 'تغییراتی برای این نسخه ثبت نشده است.',
      publishedAt: release.published_at,
      downloadUrl,
      assetName,
      assetSize,
      releasePageUrl: release.html_url || `${GITHUB_REPO_URL}/releases`,
    };

    return { success: true, updateInfo };
  } catch (err: any) {
    console.error('checkForUpdates error:', err);
    return { success: false, error: err.message || 'خطا در ارتباط با سرور گیتهاب' };
  }
}

/**
 * دانلود فایل نصاب به‌روزرسانی با قابلیت رهگیری زنده درصد پیشرفت
 */
export async function downloadUpdate(
  downloadUrl: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    if (!downloadUrl) {
      return { success: false, error: 'لینک دانلود برای این نسخه در دسترس نیست.' };
    }

    const tempDir = app && typeof app.getPath === 'function' ? app.getPath('temp') : os.tmpdir();
    const parsedUrl = new URL(downloadUrl);
    const filename = path.basename(parsedUrl.pathname) || `GerenFoodAccounting_Setup_${Date.now()}.exe`;
    const targetFilePath = path.join(tempDir, filename);

    return new Promise((resolve) => {
      function startDownload(targetUrl: string) {
        const client = targetUrl.startsWith('https') ? https : http;

        const req = client.get(targetUrl, { headers: { 'User-Agent': 'GerenFoodAccounting-Updater' } }, (res) => {
          // Handle Redirects (GitHub Release direct asset downloads redirect to S3/CDN)
          if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
            return startDownload(res.headers.location);
          }

          if (res.statusCode && res.statusCode >= 400) {
            return resolve({ success: false, error: `خطا در دریافت فایل دانلود (وضعیت: ${res.statusCode})` });
          }

          const totalBytes = Number(res.headers['content-length']) || 0;
          let transferredBytes = 0;
          let startTime = Date.now();
          let lastProgressUpdate = Date.now();

          const fileStream = fs.createWriteStream(targetFilePath);

          res.on('data', (chunk) => {
            transferredBytes += chunk.length;
            fileStream.write(chunk);

            const now = Date.now();
            if (now - lastProgressUpdate > 150) {
              lastProgressUpdate = now;
              const durationSec = (now - startTime) / 1000 || 0.1;
              const speedBytesPerSec = transferredBytes / durationSec;
              const percent = totalBytes > 0 ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100)) : 0;

              const transferredMB = (transferredBytes / (1024 * 1024)).toFixed(1);
              const totalMB = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : '?';
              const speedMB = (speedBytesPerSec / (1024 * 1024)).toFixed(1);

              if (onProgress) {
                onProgress({
                  percent,
                  transferredBytes,
                  totalBytes,
                  speedBytesPerSec,
                  formattedProgress: `${transferredMB} MB از ${totalMB} MB (${speedMB} MB/s)`,
                });
              }
            }
          });

          res.on('end', () => {
            fileStream.end();
            if (onProgress) {
              onProgress({
                percent: 100,
                transferredBytes,
                totalBytes: totalBytes || transferredBytes,
                speedBytesPerSec: 0,
                formattedProgress: 'دانلود با موفقیت تکمیل شد.',
              });
            }
            resolve({ success: true, filePath: targetFilePath });
          });

          res.on('error', (err) => {
            fileStream.close();
            try {
              if (fs.existsSync(targetFilePath)) fs.unlinkSync(targetFilePath);
            } catch {
              // Ignore
            }
            resolve({ success: false, error: `خطا در حین دانلود: ${err.message}` });
          });
        });

        req.on('error', (err) => {
          resolve({ success: false, error: `خطا در اتصال: ${err.message}` });
        });
      }

      startDownload(downloadUrl);
    });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * اجرای فایل نصاب به‌روزرسانی و بستن برنامه جاری جهت جایگزینی
 */
export async function installUpdate(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'فایل نصاب به‌روزرسانی در دیسک یافت نشد.' };
    }

    // Launch the downloaded installer detached
    const child = spawn(filePath, [], {
      detached: true,
      stdio: 'ignore',
    });

    child.unref();

    // Close current Electron application so the installer can update files smoothly
    setTimeout(() => {
      if (app && typeof app.quit === 'function') {
        app.quit();
      }
    }, 800);

    return { success: true };
  } catch (err: any) {
    console.error('installUpdate error:', err);
    return { success: false, error: err.message };
  }
}

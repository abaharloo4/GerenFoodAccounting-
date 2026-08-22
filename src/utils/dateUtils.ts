import jalaali from 'jalaali-js';

/**
 * Returns today's date in Shamsi format (YYYY/MM/DD) strictly in Asia/Tehran timezone.
 */
export function getTodayShamsi(): string {
  return formatToShamsiDate(new Date());
}

/**
 * Formats a Date object or ISO/MySQL DATETIME string to Shamsi Date string (e.g. 1405/05/28) in Asia/Tehran timezone.
 */
export function formatToShamsiDate(dateInput?: Date | string | number | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(d);
    let year = 0, month = 0, day = 0;
    for (const part of parts) {
      if (part.type === 'year') year = parseInt(part.value, 10);
      if (part.type === 'month') month = parseInt(part.value, 10);
      if (part.type === 'day') day = parseInt(part.value, 10);
    }

    const jDate = jalaali.toJalaali(year, month, day);
    return `${jDate.jy}/${String(jDate.jm).padStart(2, '0')}/${String(jDate.jd).padStart(2, '0')}`;
  } catch {
    const jDate = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${jDate.jy}/${String(jDate.jm).padStart(2, '0')}/${String(jDate.jd).padStart(2, '0')}`;
  }
}

/**
 * Formats a Date object or ISO/MySQL DATETIME string to Shamsi Date + Tehran Time string.
 * Example output: "1405/05/28 - 21:17:50"
 */
export function formatToShamsiDateTime(dateInput?: Date | string | number | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const shamsiDate = formatToShamsiDate(d);

  try {
    const timeFormatter = new Intl.DateTimeFormat('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const timeStr = timeFormatter.format(d);
    return `${shamsiDate} ساعت ${timeStr}`;
  } catch {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${shamsiDate} ساعت ${hours}:${minutes}:${seconds}`;
  }
}

/**
 * Gets current live time formatted in Tehran timezone (e.g. 21:17:50)
 */
export function getTehranLiveTime(): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }
}

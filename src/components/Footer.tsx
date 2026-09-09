import { useState, useEffect, CSSProperties } from 'react';
import { apiBridge } from '../services/apiBridge';

interface FooterProps {
  style?: CSSProperties;
}

export default function Footer({ style }: FooterProps) {
  const [version, setVersion] = useState<string>('1.0.8');

  useEffect(() => {
    apiBridge.getAppVersion().then((v) => {
      if (v && !v.includes('Browser')) {
        setVersion(v);
      }
    }).catch(() => {});
  }, []);

  return (
    <footer
      style={{
        marginTop: '3rem',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.85rem',
        direction: 'rtl',
        ...style,
      }}
    >
      سیستم حسابداری کافه گرن — طراحی و توسعه توسط امیرمحمد بهارلو | شماره پشتیبانی: 09384857722 — نسخه برنامه {version}
    </footer>
  );
}

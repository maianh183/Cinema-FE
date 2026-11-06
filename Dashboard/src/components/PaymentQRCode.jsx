import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
export default function PaymentQRCode({ url }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let active = true;
    setImage('');
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol)) return;
      QRCode.toDataURL(url, { width: 250, margin: 2 }).then(data => active && setImage(data)).catch(() => {});
    } catch { /* Invalid payment URL is not rendered. */ }
    return () => { active = false; };
  }, [url]);
  return image ? <img src={image} alt="Mã QR thanh toán do API cấp" className="w-48 h-48 rounded-xl" /> : <p>Không có mã thanh toán hợp lệ.</p>;
}

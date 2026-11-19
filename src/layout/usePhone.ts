import { useEffect, useState } from 'react';

const PHONE = '(max-width: 560px)';

/** Phone stack only. Desktop keeps the machine. */
export function usePhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE).matches);

  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  return phone;
}

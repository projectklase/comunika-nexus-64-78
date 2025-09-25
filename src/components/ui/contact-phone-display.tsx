import { Phone } from 'lucide-react';
import { normalizePhone } from '@/lib/validation';

interface ContactPhoneDisplayProps {
  phone: string;
  className?: string;
  showIcon?: boolean;
}

export function ContactPhoneDisplay({ phone, className = "", showIcon = true }: ContactPhoneDisplayProps) {
  if (!phone?.trim()) return null;

  const formattedPhone = normalizePhone(phone);
  const cleanPhone = phone.replace(/\D/g, '');
  const telLink = `tel:+55${cleanPhone}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <Phone className="h-4 w-4 text-primary" />}
      <a 
        href={telLink}
        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors underline"
        title="Clique para ligar"
      >
        {formattedPhone}
      </a>
    </div>
  );
}
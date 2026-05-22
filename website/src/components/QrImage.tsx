type QrImageProps = {
  data: string;
  size?: number;
  alt?: string;
  className?: string;
};

export function qrImageUrl(data: string, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function QrImage({ data, size = 240, alt = 'QR code', className = '' }: QrImageProps) {
  if (!data) return null;
  return (
    <img
      src={qrImageUrl(data, size)}
      width={size}
      height={size}
      alt={alt}
      className={`rounded-xl border border-slate-200 bg-white ${className}`}
    />
  );
}

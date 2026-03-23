import Image from 'next/image';

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { width: 80, height: 73 },
  md: { width: 120, height: 110 },
  lg: { width: 160, height: 146 },
};

export function AppLogo({ size = 'md' }: Props) {
  const { width, height } = sizes[size];
  return (
    <Image
      src="/logo.png"
      alt="Clube do Bolinha"
      width={width}
      height={height}
      priority
    />
  );
}

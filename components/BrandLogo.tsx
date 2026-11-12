export function BrandLogo({ className = "brand-logo", alt = "FOF Records" }: { className?: string; alt?: string }) {
  return (
    <>
      <img className={`${className} logo-dark`} src="/brand/fof.png" alt={alt} />
      <img className={`${className} logo-light`} src="/brand/fof-black.png" alt="" aria-hidden="true" />
    </>
  );
}

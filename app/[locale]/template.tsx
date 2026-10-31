export default function LocaleTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div aria-hidden="true" className="page-reveal" />
    </>
  );
}

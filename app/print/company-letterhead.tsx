export function CompanyLetterhead({
  tenant,
  className = "",
}: {
  tenant: {
    namaPt: string;
    tagline?: string | null;
    alamatPt: string;
    telpPt: string;
    logoUrl?: string | null;
  };
  className?: string;
}) {
  return (
    <header className={className}>
      <div className="letterhead">
        {tenant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/media/${tenant.logoUrl}`} alt="" className="letterhead-logo" />
        ) : null}
        <div className="letterhead-text">
          <h1>{tenant.namaPt}</h1>
          {tenant.tagline ? <p className="letterhead-tagline">{tenant.tagline}</p> : null}
          <p>{tenant.alamatPt}</p>
          <p>Telp. {tenant.telpPt}</p>
        </div>
      </div>
    </header>
  );
}

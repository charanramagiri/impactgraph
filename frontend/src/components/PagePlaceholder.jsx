function PagePlaceholder({ eyebrow, title, description }) {
  return (
    <section className="page-section" aria-labelledby="page-title">
      <div className="page-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>

      <div className="card placeholder-card">
        <p className="placeholder-label">Frontend foundation ready</p>
        <p>
          This workspace is prepared for the next implementation phase. No
          business data is loaded on this page yet.
        </p>
      </div>
    </section>
  );
}

export default PagePlaceholder;

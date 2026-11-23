/**
 * Painel com cabeçalho, ações e estados de carregamento/erro/vazio.
 */
export function FilePanel({
  title,
  subtitle,
  actions,
  isLoading,
  error,
  isEmpty,
  emptyMessage,
  children,
}) {
  return (
    <section className="file-panel" aria-busy={isLoading}>
      <header className="file-panel__header">
        <div>
          <h2 className="file-panel__title">{title}</h2>
          <p className="file-panel__subtitle">{subtitle}</p>
        </div>
        <div className="file-panel__actions">{actions}</div>
      </header>

      <div className="file-panel__body">
        <PanelContent
          isLoading={isLoading}
          error={error}
          isEmpty={isEmpty}
          emptyMessage={emptyMessage}
        >
          {children}
        </PanelContent>
      </div>
    </section>
  );
}

function PanelContent({ isLoading, error, isEmpty, emptyMessage, children }) {
  if (isLoading) {
    return <p className="file-panel__feedback">Carregando...</p>;
  }

  if (error) {
    return (
      <p className="file-panel__feedback file-panel__feedback--error" role="alert">
        {error}
      </p>
    );
  }

  if (isEmpty) {
    return <p className="file-panel__feedback">{emptyMessage}</p>;
  }

  return children;
}

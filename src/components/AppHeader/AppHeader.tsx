export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__content">
        <p className="app-header__eyebrow">Google Drive → Azure Blob Storage</p>
        <h1 className="app-header__title">Drive to Blob</h1>
        <p className="app-header__description">
          Liste os arquivos da pasta de origem, escolha o que copiar e acompanhe o status de
          cada transferência para o contêiner de destino.
        </p>
      </div>
    </header>
  );
}

import "@/styles/globals.css";

export const metadata = {
  title: "Drive to Blob",
  description: "Cópia de arquivos do Google Drive para o Azure Blob Storage.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="page">{children}</body>
    </html>
  );
}

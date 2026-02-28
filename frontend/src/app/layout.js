import "./globals.css";

export const metadata = {
  title: "Canvas of Emotions — by Somya Jain",
  description:
    "A distraction-free blog showcasing emotions through words and art.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <main>{children}</main>

        <footer className="footer">
          <div className="footer-author">Somya Jain</div>
          <p className="footer-sub">Writer & Creator</p>
        </footer>
      </body>
    </html>
  );
}

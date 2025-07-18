import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t mt-12 py-4">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center text-xs text-muted-foreground">

          <span>Giron de la Broye fribourgeoise 2025</span>
          <span className="mx-2">|</span>
          <Link 
            href="/mentions-legales"
            className="hover:text-oriental-gold transition-colors"
          >
            Mentions légales
          </Link>
          <span className="mx-2">|</span>
          <Link 
            href="/admin"
            className="hover:text-oriental-gold transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
} 
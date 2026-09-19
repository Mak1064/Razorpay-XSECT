import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="text-primary font-mono-custom text-sm font-semibold mb-2 uppercase tracking-widest">
        404 Error
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Signal Lost</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        The path you're looking for doesn't exist or you don't have the required clearance to view it.
      </p>
      <Link href="/" className="bg-foreground text-background px-6 py-2.5 rounded-md font-bold text-sm hover:bg-foreground/90 transition-colors">
        Return to Radar
      </Link>
    </div>
  );
}

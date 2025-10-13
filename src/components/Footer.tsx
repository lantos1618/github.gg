export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 px-4 md:flex-row md:py-4">
        <p className="text-sm text-muted-foreground text-center md:text-left">
          © {new Date().getFullYear()} gh.gg. Not affiliated with GitHub, Inc.
        </p>
        <p className="text-xs text-muted-foreground text-center md:text-right">
          GitHub and the GitHub logo are trademarks of GitHub, Inc.
        </p>
      </div>
    </footer>
  );
}

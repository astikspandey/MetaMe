export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-6 text-center mt-auto">
      <div className="container mx-auto px-4">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} MetaMe Profile Forge. All rights reserved.
        </p>
        <p className="text-xs mt-1">
          Craft your unique digital identity.
        </p>
      </div>
    </footer>
  );
}

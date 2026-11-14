export function Brand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/eloquia-icon.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl shadow-soft" />
      {!compact && (
        <div className="leading-tight">
          <div className={`text-lg font-bold tracking-tight ${light ? "text-sidebar-foreground" : "text-primary-deep"}`}>Eloquia</div>
          <div className={`text-[10px] font-medium uppercase tracking-[0.18em] ${light ? "text-sidebar-foreground/70" : "text-muted-foreground"}`}>L’art de s’exprimer</div>
        </div>
      )}
    </div>
  );
}

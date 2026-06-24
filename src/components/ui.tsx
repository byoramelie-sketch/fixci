// Petits composants reutilisables, fideles a l'identite FixCI.

export function FiletTricolore() {
  return <div className="filet-tricolore" />;
}

export function Logo() {
  return (
    <span
      className="text-2xl font-bold"
      style={{ fontFamily: "var(--font-titre)" }}
    >
      Fix<span style={{ color: "var(--color-orange)" }}>CI</span>
    </span>
  );
}

type BoutonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secondaire";
};

export function Bouton({
  variante = "principal",
  className = "",
  ...props
}: BoutonProps) {
  const base =
    "w-full rounded-xl px-5 py-3 font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variante === "principal"
      ? "bg-orange text-white hover:brightness-95"
      : "bg-secondaire text-texte hover:brightness-95";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

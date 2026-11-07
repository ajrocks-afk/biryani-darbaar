export default function ContactButtons({
	phone, message, label,
  }: { phone: string | null | undefined; message: string; label: string }) {
	const d = (phone ?? "").replace(/\D/g, "").slice(-10);
	if (d.length !== 10) return <p className="mt-2 text-xs text-ink/50">Contact number not available.</p>;
	return (
	  <div className="mt-3">
		<p className="text-xs text-ink/60">{label}</p>
		<div className="mt-2 flex gap-2">
		  <a href={`tel:+91${d}`}
			className="flex-1 rounded-xl bg-emerald py-2.5 text-center text-sm font-semibold text-white">
			📞 Call
		  </a>
		  <a href={`https://wa.me/91${d}?text=${encodeURIComponent(message)}`}
			target="_blank" rel="noopener noreferrer"
			className="flex-1 rounded-xl border border-emerald py-2.5 text-center text-sm font-semibold text-emerald">
			💬 WhatsApp
		  </a>
		</div>
		<p className="mt-1 text-[11px] text-ink/40">+91 {d}</p>
	  </div>
	);
  }
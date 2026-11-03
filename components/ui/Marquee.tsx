export default function Marquee({ children }: { children: React.ReactNode }) {
	return (
	  <div className="overflow-hidden">
		<div className="marquee flex w-max gap-3">
		  {children}
		  {children}
		</div>
	  </div>
	);
  }
export type Reward = {
	id: string;
	code: string;
	percent_off: number;
	max_discount_inr: number;
	min_order_inr: number;
	expires_at: string;
  };
  
  export type Prize = { percent_off: number; max_discount_inr: number; min_order_inr: number };
  
  // Assumption: odds and values are mine, not the client's. The company must approve them.
  const PRIZES: { weight: number; prize: Prize }[] = [
	{ weight: 40, prize: { percent_off: 5, max_discount_inr: 50, min_order_inr: 200 } },
	{ weight: 30, prize: { percent_off: 10, max_discount_inr: 100, min_order_inr: 300 } },
	{ weight: 20, prize: { percent_off: 15, max_discount_inr: 150, min_order_inr: 400 } },
	{ weight: 10, prize: { percent_off: 20, max_discount_inr: 200, min_order_inr: 600 } },
  ];
  
  /** r is a random number in [0, 1). Passed in so the function is testable. */
  export function pickPrize(r: number): Prize {
	const x = r * 100;
	let acc = 0;
	for (const p of PRIZES) {
	  acc += p.weight;
	  if (x < acc) return p.prize;
	}
	return PRIZES[PRIZES.length - 1].prize;
  }
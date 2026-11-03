"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function CartBar() {
  const { count, subtotal } = useCart();
  if (count === 0) return null;
  return (
    <Link
      href="/cart"
      className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-2xl items-center justify-between rounded-2xl bg-emerald px-5 py-4 text-white shadow-xl"
    >
      <span className="text-sm">{count} item{count > 1 ? "s" : ""}</span>
      <span className="font-semibold">View cart · ₹{subtotal}</span>
    </Link>
  );
}
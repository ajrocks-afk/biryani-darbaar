"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function CartBar() {
  const { count, subtotal } = useCart();
  if (count === 0) return null;
  return (
    <Link
      href="/cart"
      className="fixed inset-x-4 bottom-4 mx-auto flex max-w-md items-center justify-between rounded-xl bg-neutral-900 px-5 py-3 text-white shadow-lg"
    >
      <span>{count} item{count > 1 ? "s" : ""}</span>
      <span className="font-medium">View cart · ₹{subtotal}</span>
    </Link>
  );
}
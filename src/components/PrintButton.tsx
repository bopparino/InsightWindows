"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-black px-6 py-1.5 text-sm font-semibold text-white"
    >
      Print
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";

export function toast(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sv-toast", { detail: message }));
  }
}

export default function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);

  useEffect(() => {
    let seq = 0;
    function onToast(e: Event) {
      const id = ++seq;
      const message = (e as CustomEvent<string>).detail;
      setItems((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }, 2600);
    }
    window.addEventListener("sv-toast", onToast);
    return () => window.removeEventListener("sv-toast", onToast);
  }, []);

  return (
    <div className="toast-host">
      {items.map((i) => (
        <div className="toast" key={i.id}>
          {i.message}
        </div>
      ))}
    </div>
  );
}

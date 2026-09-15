import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="px-8 py-6 max-w-[1600px]">{children}</div>;
}

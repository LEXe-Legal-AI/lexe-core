import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function MainLayout({ children, title, className }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header title={title} />

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 overflow-auto p-6",
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;

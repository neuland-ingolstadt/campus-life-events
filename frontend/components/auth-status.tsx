"use client";

import { useQuery } from "@tanstack/react-query";
import { me, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function AuthStatus() {
  const router = useRouter();
  const { data: user, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: me,
  });

  async function onLogout() {
    await logout();
    await refetch();
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-muted-foreground">Not signed in</span>
        <Button size="sm" variant="outline" onClick={() => router.push("/login")}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className="text-sm">{user.name}</span>
      <Button size="sm" variant="outline" onClick={onLogout}>Logout</Button>
    </div>
  );
}


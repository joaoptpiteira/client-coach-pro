import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const runScrape = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { scrapeForOwner } = await import("@/lib/imoveis-scrape.server");
    return scrapeForOwner(context.supabase, context.userId);
  });

import { createFileRoute } from "@tanstack/react-router";
import { scrapeForOwner } from "@/lib/imoveis-scrape.server";

export const Route = createFileRoute("/api/public/imoveis-scrape")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        const provided = request.headers.get("x-cron-secret");
        if (!cronSecret || provided !== cronSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: configs, error } = await supabaseAdmin
          .from("config_imoveis")
          .select("owner_id, portais");
        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const targets = (configs ?? []).filter(
          (c) => Array.isArray(c.portais) && c.portais.length > 0,
        );

        let novosTotal = 0;
        const perUser: Array<{
          owner_id: string;
          novos: number;
          total: number;
          erros: { portal: string; status: number | string }[];
        }> = [];

        for (const c of targets) {
          try {
            const r = await scrapeForOwner(supabaseAdmin, c.owner_id);
            novosTotal += r.novos;
            perUser.push({
              owner_id: c.owner_id,
              novos: r.novos,
              total: r.total,
              erros: r.erros,
            });
          } catch (e) {
            console.error("[cron] scrapeForOwner failed", c.owner_id, e);
            perUser.push({
              owner_id: c.owner_id,
              novos: 0,
              total: 0,
              erros: [{ portal: "all", status: e instanceof Error ? e.message : "error" }],
            });
          }
        }

        return Response.json({
          ok: true,
          users: targets.length,
          novos_total: novosTotal,
          per_user: perUser,
          ran_at: new Date().toISOString(),
        });
      },
    },
  },
});

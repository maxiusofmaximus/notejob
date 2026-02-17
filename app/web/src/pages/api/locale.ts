import type { APIRoute } from "astro";

function mapLocale(countryCode?: string, acceptLanguage?: string | null) {
  const code = (countryCode || "").toUpperCase();
  if (code === "ES" || code === "MX" || code === "CO" || code === "AR" || code === "CL" || code === "PE") {
    return "es";
  }
  if ((acceptLanguage || "").toLowerCase().startsWith("es")) return "es";
  return "en";
}

export const GET: APIRoute = async ({ request }) => {
  const headers = request.headers;
  const acceptLanguage = headers.get("accept-language");
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  let locale = mapLocale(undefined, acceptLanguage);
  let country = "unknown";
  let city = "unknown";
  let ip = forwardedFor || "unknown";

  try {
    const targetUrl = forwardedFor ? `https://ip.guide/${forwardedFor}` : "https://ip.guide";
    const res = await fetch(targetUrl, { headers: { "accept": "application/json" } });
    if (res.ok) {
      const data = await res.json();
      const cc = data?.network?.autonomous_system?.country;
      locale = mapLocale(cc, acceptLanguage);
      country = data?.location?.country || country;
      city = data?.location?.city || city;
      ip = data?.ip || ip;
    }
  } catch {
    // fallback to accept-language mapping only
  }

  return new Response(
    JSON.stringify({
      locale,
      country,
      city,
      ip
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "max-age=300"
      }
    }
  );
};

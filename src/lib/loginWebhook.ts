/**
 * Service d'audit de connexion — envoie un webhook à chaque login/signup
 * avec l'email, l'adresse IP et la localisation approximative (ville/pays).
 *
 * Configure la variable d'environnement VITE_LOGIN_WEBHOOK_URL
 * avec l'URL de ton webhook (Discord, Slack, ou endpoint custom).
 */

const WEBHOOK_URL = import.meta.env.VITE_LOGIN_WEBHOOK_URL as string | undefined;

interface GeoData {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
  org?: string;
}

async function getGeoData(): Promise<GeoData> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("geo fetch failed");
    return (await res.json()) as GeoData;
  } catch {
    // Fallback: at least try to get the IP
    try {
      const res = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      return { ip: data.ip };
    } catch {
      return { ip: "inconnue" };
    }
  }
}

/**
 * Envoie un webhook Discord-compatible avec les infos de connexion.
 */
export async function sendLoginWebhook(email: string, action: "login" | "signup") {
  if (!WEBHOOK_URL) {
    console.warn("[LoginWebhook] VITE_LOGIN_WEBHOOK_URL non configurée — webhook ignoré.");
    return;
  }

  try {
    const geo = await getGeoData();

    const locationParts = [geo.city, geo.region, geo.country_name].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(", ") : "Inconnue";

    const now = new Date().toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      dateStyle: "short",
      timeStyle: "medium",
    });

    // Format Discord embed
    const payload = {
      embeds: [
        {
          title: action === "login" ? "🔑 Nouvelle connexion" : "📝 Nouvelle inscription",
          color: action === "login" ? 0x3498db : 0x2ecc71,
          fields: [
            { name: "📧 Email", value: email, inline: true },
            { name: "🌐 Adresse IP", value: geo.ip, inline: true },
            { name: "📍 Localisation", value: location, inline: false },
            ...(geo.org ? [{ name: "🏢 FAI / Org", value: geo.org, inline: false }] : []),
          ],
          footer: { text: `Pôle Gestion RP • ${now}` },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[LoginWebhook] Erreur envoi webhook:", err);
  }
}

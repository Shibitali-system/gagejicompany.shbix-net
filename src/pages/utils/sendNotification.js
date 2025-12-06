import { supabase } from "../../../supabaseClient";

export async function sendNotification({
  auth_user_id = null,
  office_id = null,
  title,
  message,
  link = null,
  type = "both",
}) {
  try {
    // 1️⃣ Save In-App Notification
    if (type === "in-app" || type === "both") {
      const { error: notifError } = await supabase.from("notifications").insert({
        auth_user_id,
        office_id,
        title,
        message,
        link,
        type: "in-app",
      });
      if (notifError) console.error("Failed to save in-app notification", notifError);
    }

    // 2️⃣ Trigger Push Notification
    if (type === "push" || type === "both") {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ auth_user_id, office_id, title, message, url: link }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Push notification failed with status ${response.status}: ${text}`);
      }
    }

    return true;
  } catch (err) {
    console.error("🔥 Error in sendNotification():", err);
    return false;
  }
}

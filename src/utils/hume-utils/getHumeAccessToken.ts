import { fetchAccessToken } from "hume";

export const getHumeAccessToken = async () => {
  const accessToken = await fetchAccessToken({
    apiKey: String(import.meta.env.VITE_HUME_API_KEY),
    secretKey: String(import.meta.env.VITE_HUME_SECRET_KEY),
  });

  if (accessToken === "undefined") {
    return null;
  }

  return accessToken ?? null;
};
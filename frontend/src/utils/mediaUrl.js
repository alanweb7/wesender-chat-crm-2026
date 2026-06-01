/**
 * Retorna a URL de mídia com o token JWT anexado como query param.
 * Necessário porque <img src> não envia o header Authorization.
 * Apenas URLs de /public/company{id}/ precisam do token — as demais ficam públicas.
 */
export const getMediaUrl = (url) => {
  if (!url) return url;
  if (!url.includes("/public/company")) return url;

  const token = localStorage.getItem("token");
  if (!token) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${token}`;
};

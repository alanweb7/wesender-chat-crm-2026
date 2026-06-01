import { google } from "googleapis";
import { CheckCompanySetting } from "./CheckSettings";

// Função para obter credenciais do Google (settings ou .env)
const getGoogleCredentials = async (companyId?: number) => {
  let clientId = "";
  let clientSecret = "";
  let redirectUri = "";

  // Se tiver companyId, tentar buscar das settings PRIMEIRO
  if (companyId) {
    try {
      const settingClientId = await CheckCompanySetting(companyId, "googleClientId", "");
      const settingClientSecret = await CheckCompanySetting(companyId, "googleClientSecret", "");
      const settingRedirectUri = await CheckCompanySetting(companyId, "googleRedirectUri", "");

      // Usar settings se estiverem preenchidas
      if (settingClientId) clientId = settingClientId;
      if (settingClientSecret) clientSecret = settingClientSecret;
      if (settingRedirectUri) redirectUri = settingRedirectUri;

      console.log("DEBUG - Credenciais das settings carregadas");
    } catch (error) {
      console.log("DEBUG - Erro ao buscar settings, usando .env como fallback");
    }
  }

  // Usar .env como fallback APENAS se as settings estiverem vazias
  if (!clientId) {
    clientId = process.env.GOOGLE_CLIENT_ID as string;
    console.log("DEBUG - Usando GOOGLE_CLIENT_ID do .env");
  }
  if (!clientSecret) {
    clientSecret = process.env.GOOGLE_CLIENT_SECRET as string;
    console.log("DEBUG - Usando GOOGLE_CLIENT_SECRET do .env");
  }
  if (!redirectUri) {
    redirectUri = process.env.GOOGLE_REDIRECT_URI as string;
    console.log("DEBUG - Usando GOOGLE_REDIRECT_URI do .env");
  }

  return { clientId, clientSecret, redirectUri };
};

export const createOAuth2Client = async (companyId?: number) => {
  const { clientId, clientSecret, redirectUri } = await getGoogleCredentials(companyId);

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  return oauth2Client;
};

export const getGoogleAuthUrl = async (scopes: string[], state?: string, companyId?: number) => {
  const { clientId, clientSecret, redirectUri } = await getGoogleCredentials(companyId);
  
  console.log("DEBUG getGoogleAuthUrl - Credenciais:");
  console.log("  clientId:", clientId ? `${clientId.substring(0, 20)}...` : "VAZIO");
  console.log("  clientSecret:", clientSecret ? "PRESENTE" : "VAZIO");
  console.log("  redirectUri:", redirectUri || "VAZIO");
  console.log("  companyId:", companyId);

  const oauth2Client = await createOAuth2Client(companyId);

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state,
    redirect_uri: redirectUri // Adicionar explicitamente conforme documentação oficial
  });

  console.log("DEBUG getGoogleAuthUrl - URL gerada:", url.substring(0, 100) + "...");

  return url;
};

export const getTokensFromCode = async (code: string, companyId?: number) => {
  const oauth2Client = await createOAuth2Client(companyId);

  const { tokens } = await oauth2Client.getToken(code);

  return tokens;
};

export const buildCalendarClient = async (tokens: any, companyId?: number) => {
  const oauth2Client = await createOAuth2Client(companyId);
  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  return calendar;
};

export const createGoogleCalendarEvent = async (
  accessToken: string,
  refreshToken: string | null = null,
  eventData: any,
  calendarId: string = "primary",
  companyId?: number
) => {
  try {
    const oauth2Client = await createOAuth2Client(companyId);
    
    // Configurar credenciais com access e refresh tokens
    const credentials: any = { access_token: accessToken };
    if (refreshToken) {
      credentials.refresh_token = refreshToken;
    }
    
    oauth2Client.setCredentials(credentials);

    // Configurar refresh automático se tiver refresh token
    if (refreshToken) {
      oauth2Client.on('tokens', (tokens) => {
        if (tokens.refresh_token) {
          // Aqui você poderia salvar o novo refresh token no banco
          console.log("DEBUG - Novos tokens recebidos:", tokens);
        }
      });
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = await calendar.events.insert({
      calendarId,
      requestBody: eventData
    });

    return event.data;
  } catch (error: any) {
    console.error("Erro ao criar evento no Google Calendar:", error);
    
    // Se for erro de token expirado, tentar refresh
    if (error.code === 401 && refreshToken) {
      try {
        console.log("DEBUG - Tentando refresh do token...");
        const oauth2Client = await createOAuth2Client(companyId);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Tentar novamente com o novo token
        return await createGoogleCalendarEvent(
          credentials.access_token!,
          refreshToken,
          eventData,
          calendarId,
          companyId
        );
      } catch (refreshError) {
        console.error("ERROR - Falha no refresh do token:", refreshError);
        throw refreshError;
      }
    }
    
    throw error;
  }
};

export const updateGoogleCalendarEvent = async (
  accessToken: string,
  refreshToken: string | null = null,
  eventId: string,
  eventData: any,
  calendarId: string = "primary",
  companyId?: number
) => {
  try {
    const oauth2Client = await createOAuth2Client(companyId);
    
    // Configurar credenciais com access e refresh tokens
    const credentials: any = { access_token: accessToken };
    if (refreshToken) {
      credentials.refresh_token = refreshToken;
    }
    
    oauth2Client.setCredentials(credentials);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: eventData
    });

    return event.data;
  } catch (error: any) {
    console.error("Erro ao atualizar evento no Google Calendar:", error);
    
    // Se for erro de token expirado, tentar refresh
    if (error.code === 401 && refreshToken) {
      try {
        console.log("DEBUG - Tentando refresh do token para update...");
        const oauth2Client = await createOAuth2Client(companyId);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Tentar novamente com o novo token
        return await updateGoogleCalendarEvent(
          credentials.access_token!,
          refreshToken,
          eventId,
          eventData,
          calendarId,
          companyId
        );
      } catch (refreshError) {
        console.error("ERROR - Falha no refresh do token para update:", refreshError);
        throw refreshError;
      }
    }
    
    throw error;
  }
};

export const deleteGoogleCalendarEvent = async (
  accessToken: string,
  refreshToken: string | null = null,
  eventId: string,
  calendarId: string = "primary",
  companyId?: number
) => {
  try {
    const oauth2Client = await createOAuth2Client(companyId);
    
    // Configurar credenciais com access e refresh tokens
    const credentials: any = { access_token: accessToken };
    if (refreshToken) {
      credentials.refresh_token = refreshToken;
    }
    
    oauth2Client.setCredentials(credentials);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId,
      eventId
    });

    return true;
  } catch (error: any) {
    console.error("Erro ao excluir evento no Google Calendar:", error);
    
    // Se for erro de token expirado, tentar refresh
    if (error.code === 401 && refreshToken) {
      try {
        console.log("DEBUG - Tentando refresh do token para delete...");
        const oauth2Client = await createOAuth2Client(companyId);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Tentar novamente com o novo token
        return await deleteGoogleCalendarEvent(
          credentials.access_token!,
          refreshToken,
          eventId,
          calendarId,
          companyId
        );
      } catch (refreshError) {
        console.error("ERROR - Falha no refresh do token para delete:", refreshError);
        throw refreshError;
      }
    }
    
    throw error;
  }
};

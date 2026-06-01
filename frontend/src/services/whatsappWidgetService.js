import api from "./api";

export const listWidgets = (whatsappId) =>
  api.get(`/whatsapp-widget?whatsappId=${whatsappId}`);

export const createWidget = (data) =>
  api.post("/whatsapp-widget", data);

export const deleteWidget = (widgetId) =>
  api.delete(`/whatsapp-widget/${widgetId}`);

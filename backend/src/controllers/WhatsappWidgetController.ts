import { Request, Response } from "express";
import CreateWhatsappWidgetService from "../services/WhatsappWidgetService/CreateWhatsappWidgetService";
import ListWhatsappWidgetsService from "../services/WhatsappWidgetService/ListWhatsappWidgetsService";
import DeleteWhatsappWidgetService from "../services/WhatsappWidgetService/DeleteWhatsappWidgetService";
import GetWidgetByCodeService from "../services/WhatsappWidgetService/GetWidgetByCodeService";
import TrackWidgetClickService from "../services/WhatsappWidgetService/TrackWidgetClickService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { whatsappId } = req.query;

  const widgets = await ListWhatsappWidgetsService({
    companyId,
    whatsappId: whatsappId ? Number(whatsappId) : undefined
  });

  return res.json(widgets);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { whatsappId, name, welcomeMessage, buttonColor, buttonPosition } = req.body;

  const widget = await CreateWhatsappWidgetService({
    companyId,
    whatsappId: Number(whatsappId),
    name,
    welcomeMessage,
    buttonColor,
    buttonPosition
  });

  return res.status(201).json(widget);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { widgetId } = req.params;

  await DeleteWhatsappWidgetService({ widgetId: Number(widgetId), companyId });

  return res.status(200).json({ message: "Widget removido com sucesso." });
};

export const embedScript = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params;

  try {
    const widget = await GetWidgetByCodeService(code);
    const whatsapp = (widget as any).whatsapp;
    const phone = whatsapp?.number || "";
    const message = encodeURIComponent(widget.welcomeMessage || "");
    const color = widget.buttonColor || "#25D366";
    const position = widget.buttonPosition || "bottom-right";
    const apiBase = process.env.BACKEND_URL || "";

    const js = `(function(){
  var cfg={code:"${code}",phone:"${phone}",message:"${message}",color:"${color}",position:"${position}",api:"${apiBase}"};
  var s=document.createElement("style");
  s.innerHTML="#wz-widget{position:fixed;${position === "bottom-right" ? "right:20px" : "left:20px"};bottom:20px;z-index:9999;cursor:pointer;width:56px;height:56px;border-radius:50%;background:"+cfg.color+";display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:transform .2s;}#wz-widget:hover{transform:scale(1.1);}#wz-widget svg{width:32px;height:32px;fill:#fff;}";
  document.head.appendChild(s);
  var d=document.createElement("div");
  d.id="wz-widget";
  d.title="Fale pelo WhatsApp";
  d.innerHTML='<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  d.addEventListener("click",function(){
    try{fetch(cfg.api+"/w/"+cfg.code+"/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({referrer:document.referrer,url:location.href}),keepalive:true});}catch(e){}
    var url="https://wa.me/"+cfg.phone+(cfg.message?"?text="+cfg.message:"");
    window.open(url,"_blank");
  });
  document.body.appendChild(d);
})();`;

    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(js);
  } catch {
    res.setHeader("Content-Type", "application/javascript");
    res.send("/* widget not found */");
  }
};

export const trackClick = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
  const userAgent = req.headers["user-agent"] || "";
  const referrer = req.body?.referrer || req.headers.referer || "";

  try {
    await TrackWidgetClickService({ code, ip, userAgent, referrer });
  } catch {
    // silent — não bloquear o clique se rastreamento falhar
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({ ok: true });
};

import path from "path";
import fs from "fs";
import axios from "axios";
import logger from "../utils/logger";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

/**
 * Baixa a foto de perfil do CDN do WhatsApp e salva localmente.
 * Retorna a URL local (relativa ao BACKEND_URL) ou a URL original em caso de falha.
 */
const DownloadProfilePic = async (
  cdnUrl: string,
  companyId: number,
  contactNumber: string
): Promise<string> => {
  if (!cdnUrl || !cdnUrl.startsWith("http")) return cdnUrl;

  try {
    const companyDir = path.resolve(publicFolder, `company${companyId}`, "profile");
    if (!fs.existsSync(companyDir)) {
      fs.mkdirSync(companyDir, { recursive: true });
      fs.chmodSync(companyDir, 0o755);
    }

    const fileName = `${contactNumber.replace(/\D/g, "")}.jpg`;
    const filePath = path.join(companyDir, fileName);

    const response = await axios.get(cdnUrl, { responseType: "arraybuffer", timeout: 8000 });
    fs.writeFileSync(filePath, response.data);

    const backendUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || "";
    return `${backendUrl}/public/company${companyId}/profile/${fileName}`;
  } catch (err) {
    logger.debug(`DownloadProfilePic: falha ao baixar foto de ${contactNumber}: ${err?.message}`);
    return cdnUrl;
  }
};

export default DownloadProfilePic;

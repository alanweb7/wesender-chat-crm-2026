if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET não definido no .env");
if (!process.env.JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET não definido no .env");

export default {
  secret: process.env.JWT_SECRET,
  expiresIn: "48h",
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: "30d"
};

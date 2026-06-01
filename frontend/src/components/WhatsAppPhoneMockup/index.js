import React, { useMemo } from "react";
import { makeStyles } from "@material-ui/core";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";

const useStyles = makeStyles(() => ({
  phoneWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: 16,
  },
  phone: {
    width: 260,
    minHeight: 480,
    backgroundColor: "#fff",
    borderRadius: 36,
    border: "8px solid #222",
    boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  notch: {
    width: 80,
    height: 20,
    backgroundColor: "#222",
    borderRadius: "0 0 12px 12px",
    margin: "0 auto",
    position: "relative",
    zIndex: 2,
    flexShrink: 0,
  },
  header: {
    backgroundColor: "#075e54",
    color: "#fff",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "#128c7e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
  },
  headerText: {
    fontSize: 13,
    fontWeight: 600,
  },
  headerSub: {
    fontSize: 10,
    opacity: 0.8,
  },
  chat: {
    flex: 1,
    backgroundColor: "#ece5dd",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8b9a8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    padding: "8px 8px 16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  bubble: {
    backgroundColor: "#dcf8c6",
    borderRadius: "12px 0 12px 12px",
    padding: "8px 10px",
    maxWidth: "85%",
    boxShadow: "0 1px 2px rgba(0,0,0,0.13)",
    display: "flex",
    flexDirection: "column",
  },
  templateHeader: {
    borderRadius: "8px 8px 0 0",
    overflow: "hidden",
    marginBottom: 4,
  },
  templateHeaderImage: {
    backgroundColor: "#b2dfdb",
    height: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#004d40",
    borderRadius: "8px 8px 0 0",
  },
  templateHeaderText: {
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 4,
    color: "#111",
  },
  templateBody: {
    fontSize: 12,
    color: "#111",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  varHighlight: {
    backgroundColor: "#fffde7",
    borderRadius: 3,
    padding: "0 2px",
    fontStyle: "italic",
    color: "#f57f17",
  },
  templateFooter: {
    fontSize: 10,
    color: "#888",
    marginTop: 4,
  },
  buttonsDivider: {
    borderTop: "1px solid #ccc",
    marginTop: 6,
  },
  templateButton: {
    textAlign: "center",
    color: "#128c7e",
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 0 2px",
    cursor: "default",
  },
  timestamp: {
    fontSize: 9,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#aaa",
    gap: 8,
    fontSize: 12,
    textAlign: "center",
    padding: 16,
  },
}));

const substituteVars = (text, params) => {
  if (!text) return "";
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const val = params?.[n];
    return val || `{{${n}}}`;
  });
};

const renderBodyWithHighlights = (text, params, classes) => {
  if (!text) return null;
  const parts = text.split(/(\{\{\d+\}\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{(\d+)\}\}$/);
    if (match) {
      const val = params?.[match[1]];
      if (val) return <span key={i}>{val}</span>;
      return (
        <span key={i} className={classes.varHighlight}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

const WhatsAppPhoneMockup = ({ template, params = {} }) => {
  const classes = useStyles();

  const components = useMemo(() => {
    if (!template?.components) return {};
    const map = {};
    for (const c of template.components) {
      map[c.type] = c;
    }
    return map;
  }, [template]);

  const header = components["HEADER"];
  const body = components["BODY"];
  const footer = components["FOOTER"];
  const buttons = components["BUTTONS"];

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  return (
    <div className={classes.phoneWrap}>
      <div className={classes.phone}>
        <div className={classes.notch} />
        <div className={classes.header}>
          <div className={classes.avatar}>E</div>
          <div>
            <div className={classes.headerText}>Empresa</div>
            <div className={classes.headerSub}>online</div>
          </div>
        </div>

        <div className={classes.chat}>
          {!template ? (
            <div className={classes.emptyState}>
              <InsertPhotoIcon style={{ fontSize: 40, color: "#ccc" }} />
              <span>Selecione um template para visualizar o preview</span>
            </div>
          ) : (
            <div className={classes.bubble}>
              {header && header.format === "IMAGE" && (
                <div className={classes.templateHeaderImage}>
                  <InsertPhotoIcon style={{ fontSize: 36 }} />
                </div>
              )}
              {header && header.format === "TEXT" && header.text && (
                <div className={classes.templateHeaderText}>
                  {substituteVars(header.text, params)}
                </div>
              )}

              {body && (
                <div className={classes.templateBody}>
                  {renderBodyWithHighlights(body.text, params, classes)}
                </div>
              )}

              {footer && (
                <div className={classes.templateFooter}>{footer.text}</div>
              )}

              <div className={classes.timestamp}>{timeStr} ✓✓</div>

              {buttons && buttons.buttons?.length > 0 && (
                <div className={classes.buttonsDivider}>
                  {buttons.buttons.map((btn, i) => (
                    <div key={i} className={classes.templateButton}>
                      {btn.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppPhoneMockup;

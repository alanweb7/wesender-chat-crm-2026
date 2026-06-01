import React, { useState } from "react";
import { Typography, Divider, Snackbar } from "@material-ui/core";
import copy from "clipboard-copy";
import api from "../../services/api";

const ACCENT = "#00a884";

function getIcon(name) {
  switch (name) {
    case "cta_url":    return "🔗";
    case "cta_copy":   return "📋";
    case "cta_call":   return "📞";
    case "quick_reply":
    default:           return "↩";
  }
}

const InteractiveButtonsPreview = ({ body, buttons, ticketId }) => {
  const [snack, setSnack] = useState({ open: false, msg: "" });

  const safeButtons = Array.isArray(buttons) ? buttons : [];
  if (!safeButtons.length && !body) return null;

  const handleClick = async (btn) => {
    switch (btn.name) {
      case "cta_url":
        if (btn.url) window.open(btn.url, "_blank", "noopener,noreferrer");
        break;
      case "cta_copy":
        if (btn.copyCode) {
          await copy(btn.copyCode);
          setSnack({ open: true, msg: "Copiado!" });
        }
        break;
      case "quick_reply":
        if (ticketId) {
          try {
            await api.post(`/messages/${ticketId}`, {
              body: btn.id || btn.displayText,
              fromMe: true,
              read: 1,
            });
          } catch (_) {}
        }
        break;
      default:
        break;
    }
  };

  return (
    <div style={{ minWidth: 200, maxWidth: 320 }}>
      {/* Texto da mensagem */}
      {body ? (
        <Typography
          variant="body2"
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13, lineHeight: 1.5, marginBottom: safeButtons.length ? 8 : 0 }}
        >
          {body}
        </Typography>
      ) : null}

      {/* Botões */}
      {safeButtons.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.12)", marginTop: 4 }}>
          {safeButtons.map((btn, idx) => (
            <div key={idx}>
              {idx > 0 && <Divider style={{ backgroundColor: "rgba(0,0,0,0.10)" }} />}
              <div
                onClick={() => handleClick(btn)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 10px",
                  cursor: "pointer",
                  color: ACCENT,
                  userSelect: "none",
                }}
              >
                <span style={{ fontSize: 14 }}>{getIcon(btn.name)}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: ACCENT }}>
                  {btn.displayText || btn.texto || ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        open={snack.open}
        autoHideDuration={2000}
        onClose={() => setSnack({ open: false, msg: "" })}
        message={snack.msg}
      />
    </div>
  );
};

export default InteractiveButtonsPreview;

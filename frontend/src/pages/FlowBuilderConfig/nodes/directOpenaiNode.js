import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
} from "@mui/icons-material";
import React, { memo, useState } from "react";
import { useNodeStorage } from "../../../stores/useNodeStorage";
import { Handle } from "react-flow-renderer";
import { Typography, Box, Chip, Tooltip } from "@material-ui/core";
import { MdSmartToy } from "react-icons/md";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);
  
  const provider = data?.provider || "gemini";
  const model = data?.model || "";
  const apiKey = data?.apiKey || "";
  const toolsEnabled = data?.toolsEnabled || [];
  const maxMessages = data?.maxMessages || 10;
  const voice = data?.voice || "texto";

  // Cores por provider
  const getProviderColors = (provider) => {
    switch(provider) {
      case "gemini":
        return { color: "#4285f4", bgColor: "#e8f0fe", emoji: "🔵", label: "Gemini" };
      case "openai":
        return { color: "#10a37f", bgColor: "#e6f7ed", emoji: "🟢", label: "OpenAI" };
      case "grok":
        return { color: "#000000", bgColor: "#f3f4f6", emoji: "⚫", label: "Grok" };
      default:
        return { color: "#4285f4", bgColor: "#e8f0fe", emoji: "🔵", label: "Gemini" };
    }
  };

  const { color: nodeColor, bgColor: nodeBgColor, emoji, label: providerLabel } = getProviderColors(provider);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: nodeBgColor,
        padding: "20px",
        borderRadius: "16px",
        minWidth: "280px",
        maxWidth: "280px",
        width: "280px",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: `2px solid ${nodeColor}`,
        boxShadow: isHovered 
          ? "0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(66, 133, 244, 0.1)"
          : "0 4px 16px rgba(0, 0, 0, 0.06)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateY(-2px)" : "translateY(0px)",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position="left"
        style={{
          background: `linear-gradient(135deg, ${nodeColor}, ${nodeColor}dd)`,
          width: "16px",
          height: "16px",
          top: "24px",
          left: "-10px",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: `0 2px 8px ${nodeColor}66`,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onConnect={params => console.log("handle onConnect", params)}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos
          sx={{
            color: "#ffffff",
            width: "8px",
            height: "8px",
            marginLeft: "2.5px",
            marginBottom: "0.5px",
            pointerEvents: "none"
          }}
        />
      </Handle>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: "16px",
          top: "16px",
          cursor: "pointer",
          gap: "8px",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("duplicate");
          }}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = nodeColor;
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <ContentCopy
            sx={{
              color: nodeColor,
              width: "16px",
              height: "16px",
              transition: "color 0.2s ease",
            }}
          />
        </div>
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("delete");
          }}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#ef4444";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <Delete
            sx={{
              color: "#ef4444",
              width: "16px",
              height: "16px",
              transition: "color 0.2s ease",
            }}
          />
        </div>
      </div>

      {/* Node Content */}
      <Box display="flex" flexDirection="column" gap={1}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={1}>
          <MdSmartToy style={{ color: nodeColor, fontSize: "24px" }} />
          <Typography variant="h6" style={{ color: nodeColor, fontWeight: 600, fontSize: "1rem" }}>
            Agente Direto
          </Typography>
        </Box>

        {/* Provider Badge */}
        <Chip
          label={`${emoji} ${providerLabel}`}
          size="small"
          style={{
            backgroundColor: nodeColor,
            color: "white",
            fontWeight: 500,
            alignSelf: "flex-start"
          }}
        />

        {/* Model Info */}
        {model && (
          <Typography variant="body2" style={{ color: "#6b7280", fontSize: "0.75rem" }}>
            Model: <span style={{ fontWeight: 500 }}>{model}</span>
          </Typography>
        )}

        {/* Max Messages */}
        {maxMessages && (
          <Typography variant="body2" style={{ color: "#6b7280", fontSize: "0.75rem" }}>
            Histórico: <span style={{ fontWeight: 500 }}>{maxMessages} msgs</span>
          </Typography>
        )}

        {/* Voice Info */}
        {voice && voice !== "texto" && (
          <Chip
            label={`🎤 ${voice}`}
            size="small"
            style={{
              backgroundColor: "#e3f2fd",
              color: "#1976d2",
              fontSize: "0.7rem",
              height: "20px"
            }}
          />
        )}

        {/* Tools Count */}
        {toolsEnabled.length > 0 && (
          <Chip
            label={`🔧 ${toolsEnabled.length} tools`}
            size="small"
            style={{
              backgroundColor: "#f3f4f6",
              color: "#374151",
              fontSize: "0.7rem",
              height: "20px"
            }}
          />
        )}

        {/* Empty State */}
        {!model && !apiKey && (
          <Typography variant="body2" style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "0.75rem" }}>
            Clique para configurar...
          </Typography>
        )}
      </Box>

      {/* Source Handle */}
      <Handle
        type="source"
        position="right"
        style={{
          background: `linear-gradient(135deg, ${nodeColor}, ${nodeColor}dd)`,
          width: "16px",
          height: "16px",
          top: "24px",
          right: "-10px",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: `0 2px 8px ${nodeColor}66`,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onConnect={params => console.log("handle onConnect", params)}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos
          sx={{
            color: "#ffffff",
            width: "8px",
            height: "8px",
            marginLeft: "2.5px",
            marginBottom: "0.5px",
            pointerEvents: "none",
            transform: "rotate(180deg)"
          }}
        />
      </Handle>
    </div>
  );
});

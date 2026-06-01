import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
  Rule,
} from "@mui/icons-material";
import React, { memo, useState } from "react";
import { useNodeStorage } from "../../../stores/useNodeStorage";
import { Handle } from "react-flow-renderer";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);

  const getMatchTypeText = (matchType) => {
    const types = {
      1: "Exato",
      2: "Contém",
      3: "Começa com",
      4: "Termina com",
      5: "RegEx"
    };
    return types[matchType] || "Contém";
  };

  // Extrair palavras-chave do data
  const keywords = data?.keywords || [];
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        padding: "20px",
        borderRadius: "16px",
        minWidth: "320px",
        maxWidth: "320px",
        width: "320px",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: "2px solid #e5e7eb",
        boxShadow: isHovered 
          ? "0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(59, 130, 246, 0.1)"
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
          background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          border: "2px solid #ffffff",
          width: "12px",
          height: "12px",
          left: "-6px",
          top: "50%",
          transform: "translateY(-50%)",
        }}
        isConnectable={isConnectable}
      />

      {/* Action Buttons */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          display: "flex",
          gap: "4px",
          zIndex: 10,
        }}
      >
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("copy");
          }}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#e5e7eb";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#f3f4f6";
            e.target.style.transform = "scale(1)";
          }}
        >
          <ContentCopy
            sx={{ 
              width: "14px", 
              height: "14px", 
              color: "#6b7280"
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
            backgroundColor: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#fee2e2";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#fef2f2";
            e.target.style.transform = "scale(1)";
          }}
        >
          <Delete
            sx={{ 
              width: "14px", 
              height: "14px", 
              color: "#ef4444"
            }}
          />
        </div>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "12px",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
          }}
        >
          <Rule
            sx={{
              width: "18px",
              height: "18px",
              color: "#ffffff",
            }}
          />
        </div>
        <div>
          <div 
            style={{ 
              color: "#111827", 
              fontSize: "16px", 
              fontWeight: "700",
              lineHeight: "1.2",
              marginBottom: "2px",
            }}
          >
            Condição
          </div>
          <div 
            style={{ 
              color: "#6b7280", 
              fontSize: "12px", 
              fontWeight: "500",
            }}
          >
            Verificação de texto
          </div>
        </div>
      </div>

      {/* Content - Keywords List */}
      <div
        style={{
          backgroundColor: "#eff6ff",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid #bfdbfe",
          marginBottom: "16px",
          maxHeight: "200px",
          overflowY: "auto",
        }}
      >
        {keywords.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {keywords.map((keyword, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: "#dbeafe",
                  color: "#1e40af",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: "1px solid #93c5fd",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{keyword.text}</span>
                <span style={{
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "700",
                }}>
                  {getMatchTypeText(keyword.matchType || 2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            color: "#6b7280",
            fontSize: "13px",
            textAlign: "center",
            fontStyle: "italic",
          }}>
            Nenhuma palavra-chave configurada
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          paddingTop: "12px",
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "#9ca3af",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Rule sx={{ width: "12px", height: "12px", marginRight: "4px" }} />
          Condição
        </div>
      </div>

      {/* Source Handles - Dynamic for each keyword */}
      {keywords.map((keyword, index) => (
        <Handle
          key={index}
          type="source"
          position="right"
          id={`keyword_${index}`}
          style={{
            background: `linear-gradient(135deg, ${keyword.color || "#10b981"}, ${keyword.color || "#059669"})`,
            border: "2px solid #ffffff",
            width: "12px",
            height: "12px",
            right: "-6px",
            top: `${20 + (index * 25)}%`, // Distribui as saídas verticalmente
            transform: "translateY(-50%)",
          }}
          isConnectable={isConnectable}
        />
      ))}
      
      {/* Default handle for no match */}
      <Handle
        type="source"
        position="right"
        id="default"
        style={{
          background: "linear-gradient(135deg, #ef4444, #dc2626)",
          border: "2px solid #ffffff",
          width: "12px",
          height: "12px",
          right: "-6px",
          bottom: "20%",
          transform: "translateY(50%)",
        }}
        isConnectable={isConnectable}
      />
    </div>
  );
});

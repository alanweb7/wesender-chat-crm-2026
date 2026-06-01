import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
  EventAvailable as EventIcon,
  CheckCircle,
  Cancel
} from "@mui/icons-material";
import React, { memo, useState } from "react";
import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        padding: "20px",
        borderRadius: "16px",
        maxWidth: "280px",
        minWidth: "280px",
        width: "280px",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: "2px solid #10b981",
        boxShadow: isHovered 
          ? "0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(16, 185, 129, 0.1)"
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
          background: "linear-gradient(135deg, #10b981, #059669)",
          width: "16px",
          height: "16px",
          top: "24px",
          left: "-10px",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
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
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e5e7eb";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#f3f4f6";
            e.currentTarget.style.transform = "scale(1)";
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
            e.currentTarget.style.backgroundColor = "#fee2e2";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#fef2f2";
            e.currentTarget.style.transform = "scale(1)";
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
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
          }}
        >
          <EventIcon sx={{ color: "#ffffff", width: "20px", height: "20px" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827", lineHeight: "1.4" }}>
            {data.title || "Agendamento Inteligente"}
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
            Com verificação de disponibilidade
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ marginBottom: "12px" }}>
        {data.appointmentTitle && (
          <div style={{ 
            fontSize: "12px", 
            color: "#374151", 
            marginBottom: "6px",
            lineHeight: "1.5"
          }}>
            <strong>Título:</strong> {data.appointmentTitle.substring(0, 30)}{data.appointmentTitle.length > 30 ? '...' : ''}
          </div>
        )}
        
        <div style={{ 
          backgroundColor: "#f9fafb", 
          borderRadius: "8px", 
          padding: "8px",
          marginTop: "8px"
        }}>
          {data.scheduleId && (
            <div style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
              📅 Agenda: {data.scheduleName || `ID ${data.scheduleId}`}
            </div>
          )}
          {data.serviceId && (
            <div style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
              🔧 Serviço: {data.serviceName || `ID ${data.serviceId}`}
            </div>
          )}
          {data.dateVariable && (
            <div style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
              📆 Data: <span style={{ fontFamily: 'monospace', color: '#059669' }}>{data.dateVariable}</span>
            </div>
          )}
          {data.timeVariable && (
            <div style={{ fontSize: "11px", color: "#374151" }}>
              🕐 Hora: <span style={{ fontFamily: 'monospace', color: '#059669' }}>{data.timeVariable}</span>
            </div>
          )}
        </div>
      </div>

      {/* Output Labels */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between",
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: "1px solid #e5e7eb"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "4px",
          fontSize: "10px",
          color: "#059669",
          fontWeight: 600
        }}>
          <CheckCircle sx={{ width: "12px", height: "12px" }} />
          Sucesso
        </div>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "4px",
          fontSize: "10px",
          color: "#dc2626",
          fontWeight: 600
        }}>
          <Cancel sx={{ width: "12px", height: "12px" }} />
          Indisponível
        </div>
      </div>

      {/* Source Handles - Success */}
      <Handle
        type="source"
        position="right"
        id="success"
        style={{
          background: "linear-gradient(135deg, #10b981, #059669)",
          width: "16px",
          height: "16px",
          top: "50%",
          right: "-10px",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: "translateY(-20px)",
        }}
        isConnectable={isConnectable}
      >
        <CheckCircle
          sx={{
            color: "#ffffff",
            width: "10px",
            height: "10px",
            marginLeft: "1px",
            pointerEvents: "none"
          }}
        />
      </Handle>

      {/* Source Handles - Unavailable */}
      <Handle
        type="source"
        position="right"
        id="unavailable"
        style={{
          background: "linear-gradient(135deg, #ef4444, #dc2626)",
          width: "16px",
          height: "16px",
          top: "50%",
          right: "-10px",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: "translateY(20px)",
        }}
        isConnectable={isConnectable}
      >
        <Cancel
          sx={{
            color: "#ffffff",
            width: "10px",
            height: "10px",
            marginLeft: "1px",
            pointerEvents: "none"
          }}
        />
      </Handle>
    </div>
  );
});

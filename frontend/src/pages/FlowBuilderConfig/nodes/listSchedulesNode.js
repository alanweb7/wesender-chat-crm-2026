import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
  List as ListIcon
} from "@mui/icons-material";
import React, { memo, useState } from "react";
import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);

  // Pega as agendas configuradas no modal
  const schedules = data.schedules || [];
  const maxSchedules = schedules.length || 3;

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
        border: "2px solid #3b82f6",
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
          width: "16px",
          height: "16px",
          top: "24px",
          left: "-10px",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
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
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)",
          }}
        >
          <ListIcon sx={{ color: "#ffffff", width: "20px", height: "20px" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827", lineHeight: "1.4" }}>
            {data.title || "Listar Agendas"}
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
            Menu interativo
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ marginBottom: "12px" }}>
        {data.messageText && (
          <div style={{ 
            fontSize: "12px", 
            color: "#374151", 
            marginBottom: "8px",
            lineHeight: "1.5"
          }}>
            {data.messageText.substring(0, 50)}{data.messageText.length > 50 ? '...' : ''}
          </div>
        )}
        <div style={{ fontSize: "11px", color: "#6b7280" }}>
          {maxSchedules} agenda{maxSchedules !== 1 ? 's' : ''} configurada{maxSchedules !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Schedules List */}
      {schedules.length > 0 && (
        <div style={{ 
          backgroundColor: "#f9fafb", 
          borderRadius: "8px", 
          padding: "8px",
          marginBottom: "8px"
        }}>
          {schedules.slice(0, 3).map((schedule, index) => (
            <div key={index} style={{ 
              fontSize: "11px", 
              color: "#374151",
              padding: "4px 0",
              borderBottom: index < Math.min(schedules.length - 1, 2) ? "1px solid #e5e7eb" : "none"
            }}>
              {index + 1}. {schedule.name}
            </div>
          ))}
          {schedules.length > 3 && (
            <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "4px" }}>
              +{schedules.length - 3} mais...
            </div>
          )}
        </div>
      )}

      {/* Source Handles - Um para cada agenda */}
      {schedules.map((schedule, index) => (
        <Handle
          key={schedule.id}
          type="source"
          position="right"
          id={`schedule_${schedule.id}`}
          style={{
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            width: "16px",
            height: "16px",
            top: `${60 + (index * 25)}px`,
            right: "-10px",
            cursor: 'pointer',
            border: "3px solid #ffffff",
            boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
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
      ))}
    </div>
  );
});

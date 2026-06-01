import React, { memo } from 'react';
import { Handle } from 'react-flow-renderer';
import { Box, Typography, Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CancelIcon from '@material-ui/icons/Cancel';

const useStyles = makeStyles((theme) => ({
  nodeContainer: {
    padding: theme.spacing(2),
    borderRadius: 8,
    backgroundColor: '#ffffff',
    border: '2px solid #ef4444',
    minWidth: 280,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  icon: {
    color: '#ef4444',
    fontSize: 24,
  },
  title: {
    fontWeight: 600,
    fontSize: 14,
    color: '#1f2937',
  },
  content: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: theme.spacing(1),
  },
  variable: {
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#dc2626',
  },
  handle: {
    width: 16,
    height: 16,
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    border: '3px solid #ffffff',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
    cursor: 'pointer',
  },
}));

const CancelAppointmentNode = ({ data, selected }) => {
  const classes = useStyles();

  return (
    <Paper 
      className={classes.nodeContainer}
      elevation={selected ? 8 : 2}
      style={{
        borderColor: selected ? '#dc2626' : '#ef4444',
        borderWidth: selected ? 3 : 2,
      }}
    >
      <Handle
        type="target"
        position="top"
        className={classes.handle}
        style={{ top: -8, left: '50%', transform: 'translateX(-50%)' }}
      />
      
      <Box className={classes.header}>
        <CancelIcon className={classes.icon} />
        <Typography className={classes.title}>
          {data.title || 'Cancelar Agendamento'}
        </Typography>
      </Box>

      <Box className={classes.content}>
        {data.appointmentVariable && (
          <Typography variant="caption" display="block">
            ID do Agendamento: <span className={classes.variable}>{data.appointmentVariable}</span>
          </Typography>
        )}
        {data.reasonVariable && (
          <Typography variant="caption" display="block">
            Motivo: <span className={classes.variable}>{data.reasonVariable}</span>
          </Typography>
        )}
        {data.showMessage && (
          <Typography variant="caption" display="block" style={{ marginTop: 8 }}>
            Exibir mensagem: Sim
          </Typography>
        )}
      </Box>

      <Handle
        type="source"
        position="bottom"
        id="success"
        className={classes.handle}
        style={{ bottom: -8, left: '33%', transform: 'translateX(-50%)' }}
      />
      <Handle
        type="source"
        position="bottom"
        id="error"
        className={classes.handle}
        style={{ bottom: -8, left: '66%', transform: 'translateX(-50%)' }}
      />
    </Paper>
  );
};

export default memo(CancelAppointmentNode);

import React, { memo } from 'react';
import { Handle } from 'react-flow-renderer';
import { Box, Typography, Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import EditIcon from '@material-ui/icons/Edit';

const useStyles = makeStyles((theme) => ({
  nodeContainer: {
    padding: theme.spacing(2),
    borderRadius: 8,
    backgroundColor: '#ffffff',
    border: '2px solid #8b5cf6',
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
    color: '#8b5cf6',
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
    color: '#7c3aed',
  },
  handle: {
    width: 16,
    height: 16,
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    border: '3px solid #ffffff',
    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
    cursor: 'pointer',
  },
}));

const UpdateAppointmentNode = ({ data, selected }) => {
  const classes = useStyles();

  return (
    <Paper 
      className={classes.nodeContainer}
      elevation={selected ? 8 : 2}
      style={{
        borderColor: selected ? '#7c3aed' : '#8b5cf6',
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
        <EditIcon className={classes.icon} />
        <Typography className={classes.title}>
          {data.title || 'Atualizar Agendamento'}
        </Typography>
      </Box>

      <Box className={classes.content}>
        {data.appointmentVariable && (
          <Typography variant="caption" display="block">
            ID: <span className={classes.variable}>{data.appointmentVariable}</span>
          </Typography>
        )}
        {data.newDateVariable && (
          <Typography variant="caption" display="block">
            Nova Data: <span className={classes.variable}>{data.newDateVariable}</span>
          </Typography>
        )}
        {data.newTimeVariable && (
          <Typography variant="caption" display="block">
            Novo Horário: <span className={classes.variable}>{data.newTimeVariable}</span>
          </Typography>
        )}
      </Box>

      <Handle
        type="source"
        position="bottom"
        id="success"
        className={classes.handle}
        style={{ bottom: -8, left: '25%', transform: 'translateX(-50%)' }}
      />
      <Handle
        type="source"
        position="bottom"
        id="unavailable"
        className={classes.handle}
        style={{ bottom: -8, left: '50%', transform: 'translateX(-50%)' }}
      />
      <Handle
        type="source"
        position="bottom"
        id="error"
        className={classes.handle}
        style={{ bottom: -8, left: '75%', transform: 'translateX(-50%)' }}
      />
    </Paper>
  );
};

export default memo(UpdateAppointmentNode);

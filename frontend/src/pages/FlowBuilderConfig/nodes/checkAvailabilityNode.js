import React, { memo } from 'react';
import { Handle } from 'react-flow-renderer';
import { Box, Typography, Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ScheduleIcon from '@material-ui/icons/Schedule';

const useStyles = makeStyles((theme) => ({
  nodeContainer: {
    padding: theme.spacing(2),
    borderRadius: 8,
    backgroundColor: '#ffffff',
    border: '2px solid #f59e0b',
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
    color: '#f59e0b',
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
    color: '#d97706',
  },
  handle: {
    width: 16,
    height: 16,
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    border: '3px solid #ffffff',
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
    cursor: 'pointer',
  },
}));

const CheckAvailabilityNode = ({ data, selected }) => {
  const classes = useStyles();

  return (
    <Paper 
      className={classes.nodeContainer}
      elevation={selected ? 8 : 2}
      style={{
        borderColor: selected ? '#d97706' : '#f59e0b',
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
        <ScheduleIcon className={classes.icon} />
        <Typography className={classes.title}>
          {data.title || 'Verificar Disponibilidade'}
        </Typography>
      </Box>

      <Box className={classes.content}>
        {data.scheduleVariable && (
          <Typography variant="caption" display="block">
            Agenda: <span className={classes.variable}>{data.scheduleVariable}</span>
          </Typography>
        )}
        {data.dateVariable && (
          <Typography variant="caption" display="block">
            Data: <span className={classes.variable}>{data.dateVariable}</span>
          </Typography>
        )}
        {data.saveVariable && (
          <Typography variant="caption" display="block" style={{ marginTop: 8 }}>
            Salvar em: <span className={classes.variable}>{data.saveVariable}</span>
          </Typography>
        )}
      </Box>

      <Handle
        type="source"
        position="bottom"
        id="available"
        className={classes.handle}
        style={{ bottom: -8, left: '50%', transform: 'translateX(-50%)' }}
      />
    </Paper>
  );
};

export default memo(CheckAvailabilityNode);

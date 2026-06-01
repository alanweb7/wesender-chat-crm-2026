import React from 'react';
import { CircularProgress } from '@material-ui/core';

const CustomLoader = ({ 
  size = 30,
  color = '#9c27b0',
  text = '',
  style = {}
}) => {
  // DESATIVADO: Busca de imagem do backend
  // Sempre usa o CircularProgress padrão
  return <CircularProgress size={size} style={{ color, ...style }} />;
};

export default CustomLoader;

import React from 'react';

export default function Toast({ notificacao }) {
  if (!notificacao.exibir) return null;

  // Gerencia dinamicamente apenas a cor de fundo (Sucesso ou Erro)
  const corFundo = notificacao.tipo === 'sucesso' ? '#10b981' : '#ef4444';

  return (
    <div 
      className="toast-notificacao" 
      style={{ backgroundColor: corFundo }}
    >
      {notificacao.mensagem}
    </div>
  );
}
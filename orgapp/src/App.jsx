import React, { useState } from 'react';
import './index.css'; // Importação do CSS isolado
import Home from './components/Home';
import Compras from './components/Compras';
import Financas from './components/Financas';
import Receitas from './components/Receitas';
import Toast from './components/Toast';

export default function App() {
  const [sistemaAtivo, setSistemaAtivo] = useState('HOME');
  const [notificacao, setNotificacao] = useState({ exibir: false, mensagem: '', tipo: 'sucesso' });

  const mostrarNotificacao = (mensagem, tipo = 'sucesso') => {
    setNotificacao({ exibir: true, mensagem, tipo });
    setTimeout(() => {
      setNotificacao({ exibir: false, mensagem: '', tipo: 'sucesso' });
    }, 3000);
  };

  return (
    <div className="container-orgapp">
      {/* Notificação Flutuante Global */}
      <Toast notificacao={notificacao} />

      {/* Navegação entre Sistemas */}
      {sistemaAtivo === 'HOME' && (
        <Home setSistemaAtivo={setSistemaAtivo} mostrarNotificacao={mostrarNotificacao} />
      )}

      {sistemaAtivo === 'COMPRAS' && (
        <Compras setSistemaAtivo={setSistemaAtivo} mostrarNotificacao={mostrarNotificacao} />
      )}

      

{sistemaAtivo === 'FINANCAS' && (
  <Financas setSistemaAtivo={setSistemaAtivo} mostrarNotificacao={mostrarNotificacao} />
)}
{sistemaAtivo === 'RECEITAS' && (
        <Receitas setSistemaAtivo={setSistemaAtivo} mostrarNotificacao={mostrarNotificacao} />
      )}
      
    </div>
  );
}

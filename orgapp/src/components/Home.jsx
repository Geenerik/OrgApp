import React from 'react';

export default function Home({ setSistemaAtivo, mostrarNotificacao }) {
  return (
    <div>
      <header className="header-app">
        <h1 style={{ color: '#111827', margin: 0, fontSize: '32px', fontWeight: '850' }}>Orgapp 🌐</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px', fontWeight: '500' }}>Selecione o sistema que deseja acessar</p>
      </header>

      <div className="grid-sistemas">
        {/* Opção 1: Módulo Compras */}
        <div className="card-sistema" onClick={() => setSistemaAtivo('COMPRAS')}>
          <div className="icone-sistema">🛒</div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: '700' }}>Compras</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Gerenciamento de listas de compras (Casa e Loja) integrado ao banco.</p>
          </div>
        </div>

        {/* Opção 2: Ficha Técnica de Receitas (MÓDULO ATIVADO) */}
        <div className="card-sistema" onClick={() => setSistemaAtivo('RECEITAS')}>
          <div className="icone-sistema">🍰</div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#7c3aed', fontSize: '18px', fontWeight: '700' }}>Ficha de Receitas</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Criação de receitas e cálculo de custo automático usando os itens de compras.</p>
          </div>
        </div>

        {/* Opção 3: Gestão Financeira */}
        <div className="card-sistema" onClick={() => setSistemaAtivo('FINANCAS')}>
          <div className="icone-sistema">📊</div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#374151', fontSize: '18px', fontWeight: '700' }}>Gestão Financeira</h3>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '13px' }}>Espaço reservado para fluxo de caixa e relatórios de faturamento.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
// ==========================================
//      admin.js - VERSÃO DE TESTE MÍNIMA
// ==========================================

console.log("--- INICIANDO SCRIPT DE TESTE ---");

document.addEventListener('DOMContentLoaded', () => {
    console.log("EVENTO 'DOMContentLoaded' disparado. O HTML foi carregado.");

    const loginBtn = document.getElementById('login-btn');
    console.log("Procurando o botão com id='login-btn':", loginBtn);

    if (loginBtn) {
        console.log("Botão de login ENCONTRADO. A adicionar evento de clique...");

        loginBtn.addEventListener('click', () => {
            alert("O BOTÃO FUNCIONA!");
            console.log("O clique no botão foi registado com sucesso!");
        });

        console.log("Evento de clique ADICIONADO com sucesso ao botão.");
        loginBtn.innerHTML = "BOTÃO ATIVADO"; // Muda o texto do botão para termos certeza visual
    } else {
        console.error("--- ERRO CRÍTICO --- Botão de login NÃO ENCONTRADO no HTML. Verifique se o ID 'login-btn' está correto no arquivo admin.html.");
    }
});

console.log("--- FIM DO SCRIPT DE TESTE ---");

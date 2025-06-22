<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel de Administração - Rifa Online</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-900 text-gray-200 min-h-screen">

    <div id="login-screen" class="flex flex-col items-center justify-center min-h-screen p-4">
        <div class="w-full max-w-sm p-8 bg-gray-800 rounded-2xl shadow-lg">
            <h1 class="text-2xl font-bold text-center text-blue-300 mb-6">Acesso do Administrador</h1>
            <div class="space-y-4">
                <div>
                    <label for="admin-email" class="block text-sm font-medium">E-mail</label>
                    <input type="email" id="admin-email" class="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="seu.email@admin.com">
                </div>
                <div>
                    <label for="admin-password" class="block text-sm font-medium">Senha</label>
                    <input type="password" id="admin-password" class="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="••••••••">
                </div>
            </div>
            <button id="login-btn" class="w-full mt-6 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors">Entrar</button>
            <p id="login-error" class="text-red-400 text-center mt-4 hidden">E-mail ou senha incorretos.</p>
        </div>
    </div>

    <div id="admin-panel" class="hidden p-4 md:p-8">
        <header class="flex justify-between items-center mb-8">
            <div>
                <h1 class="text-3xl font-bold text-blue-300">Painel de Administração</h1>
                <p id="admin-email-display" class="text-sm text-gray-400"></p>
            </div>
            <button id="logout-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">Sair</button>
        </header>

        <div class="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 class="text-2xl font-semibold mb-4">Gerir Rifas</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 class="text-xl font-semibold text-teal-300 mb-3">Criar Nova Rifa</h3>
                    <div class="space-y-4">
                        <div><label for="raffle-name" class="block text-sm font-medium">Nome do Prémio</label><input type="text" id="raffle-name" class="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-lg" placeholder="Ex: iPhone 15 Pro"></div>
                        <div><label for="raffle-price" class="block text-sm font-medium">Preço por Número (R$)</label><input type="number" id="raffle-price" class="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-lg" placeholder="10"></div>
                        <button id="create-raffle-btn" class="w-full p-3 bg-teal-600 hover:bg-teal-700 rounded-lg font-semibold">Criar Rifa</button>
                    </div>
                </div>
                <div>
                    <h3 class="text-xl font-semibold text-blue-300 mb-3">Rifas Ativas e Encerradas</h3>
                    <div id="raffles-list" class="space-y-3 max-h-60 overflow-y-auto pr-2"><p class="text-gray-500">A carregar lista de rifas...</p></div>
                </div>
            </div>
        </div>

        <div id="raffle-details-section" class="hidden">
            <!-- **SECÇÃO ATUALIZADA COM ÁREA DE EDIÇÃO** -->
            <div class="flex items-center gap-4 mb-4">
                <h2 class="text-2xl font-semibold">Detalhes da Rifa:</h2>
                <div id="raffle-name-display" class="flex items-center gap-3">
                    <span id="details-raffle-name" class="text-2xl font-bold text-yellow-400"></span>
                    <button id="edit-raffle-name-btn" title="Editar Nome da Rifa" class="text-gray-400 hover:text-white transition-colors"><i class="fas fa-pencil-alt"></i></button>
                </div>
                <div id="edit-raffle-name-section" class="hidden flex items-center gap-2">
                    <input type="text" id="edit-raffle-name-input" class="p-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                    <button id="save-raffle-name-btn" class="p-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Salvar</button>
                    <button id="cancel-edit-raffle-name-btn" class="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Cancelar</button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <!-- ... cards de resumo (números vendidos, etc.) ... -->
            </div>
            <div class="bg-gray-800 p-6 rounded-lg mb-8">
                 <!-- ... secção para declarar ganhador ... -->
            </div>
            <div class="bg-gray-800 p-6 rounded-lg overflow-x-auto">
                <!-- ... tabela de participantes ... -->
            </div>
        </div>
    </div>
    <script type="module" src="admin.js"></script>
</body>
</html>

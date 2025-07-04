// ... (seu código existente)

document.getElementById('create-raffle-btn').addEventListener('click', async () => {
    const raffleName = document.getElementById('raffle-name').value;
    const rafflePrice = document.getElementById('raffle-price').value;
    const raffleType = document.getElementById('raffle-type').value; // <<< Adicione esta linha

    try {
        const response = await fetch('/api/create-raffle', { // Ou o endpoint correto da sua API
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Se tiver token de autenticação, adicione aqui
                // 'Authorization': `Bearer ${seuToken}`
            },
            body: JSON.stringify({
                name: raffleName,
                price: parseFloat(rafflePrice), // Garanta que o preço seja um número
                type: raffleType // <<< Adicione este campo ao body
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao criar rifa');
        }

        const newRaffle = await response.json();
        alert(`Rifa "${newRaffle.name}" criada com sucesso!`);
        // ... (atualizar lista de rifas ou limpar formulário)

    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao criar rifa: ' + error.message);
    }
});

// ... (restante do seu código)

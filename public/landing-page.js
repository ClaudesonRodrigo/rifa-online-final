// Lógica para o FAQ Interativo
document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-question');

    faqItems.forEach(item => {
        item.addEventListener('click', () => {
            // Encontra a resposta correspondente
            const answer = item.nextElementSibling;
            // Encontra o ícone correspondente
            const icon = item.querySelector('i');

            // Alterna a visibilidade da resposta
            answer.classList.toggle('hidden');

            // Gira o ícone de '+' para 'x' (ou quase)
            icon.classList.toggle('rotate-45');
        });
    });
});
// --- Lógica para Animação ao Rolar ---

// Cria um "observador" que vai vigiar os elementos
const observer = new IntersectionObserver((entries) => {
    // Roda para cada elemento que o observador está vigiando
    entries.forEach(entry => {
        // Se o elemento entrou na tela...
        if (entry.isIntersecting) {
            // ...adiciona a classe que ativa a nossa animação CSS
            entry.target.classList.add('is-visible');
        }
    });
});

// Pega todos os elementos que queremos animar (os que têm a classe .fade-in-item)
const itemsToAnimate = document.querySelectorAll('.fade-in-item');

// Manda o observador vigiar cada um desses itens
itemsToAnimate.forEach(item => observer.observe(item));

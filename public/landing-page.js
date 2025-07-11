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
